import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

// Force Node.js runtime so the full node:crypto module and all env vars
// are available. The Edge runtime doesn't support createHmac.
export const runtime = "nodejs";

/**
 * Middleware that:
 * 1. Generates a per-request CSP nonce and propagates it via request headers
 *    so Next.js auto-injects it into all <script> and <style> tags (no fetch/rewrite needed)
 * 2. Sets hardened security headers (CSP, X-Frame-Options, X-XSS-Protection, etc.)
 * 3. Handles restrictive CORS for /api/* routes
 * 4. Enforces CMS authentication
 * 5. Rate-limits /api/* routes via Supabase-backed counters (LOW-04 fix)
 *
 * PERFORMANCE: Previous version used fetch(request.url) to intercept and rewrite
 * HTML, which doubled latency (client→edge→server→edge→client). This version
 * uses Next.js 16's built-in nonce extraction from the CSP request header,
 * eliminating the fetch entirely. Framer Motion inline style="" attributes are
 * handled at the component level (initial={false} + CSS classes).
 */

// ─── Supabase client for rate limiting ─────────────────────────────
let _supabaseForRateLimit: ReturnType<typeof createClient> | null = null;
function getRateLimitClient() {
  if (_supabaseForRateLimit) return _supabaseForRateLimit;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  _supabaseForRateLimit = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return _supabaseForRateLimit;
}

// ─── Rate Limiter (Supabase-backed) ────────────────────────────────
const READ_LIMIT = 120;
const WRITE_LIMIT = 10;

async function checkRateLimit(ip: string, isWrite: boolean): Promise<{ allowed: boolean; remaining: number }> {
  const client = getRateLimitClient();
  if (!client) {
    return { allowed: true, remaining: 999 };
  }

  const bucket = isWrite ? "cms_write" : "read";
  const limit = isWrite ? WRITE_LIMIT : READ_LIMIT;

  try {
    const { data, error } = await client
      .rpc("check_rate_limit", {
        p_ip: ip,
        p_bucket: bucket,
        p_limit: limit,
        p_window_seconds: 60,
      } as never)
      .abortSignal(AbortSignal.timeout(3000));

    if (error) {
      console.error("Rate limit RPC error:", error.message);
      return { allowed: true, remaining: 999 };
    }

    const allowed = data === true;
    return { allowed, remaining: allowed ? limit - 1 : 0 };
  } catch (error) {
    console.error("Rate limit check failed (timeout or network):", error);
    return { allowed: true, remaining: 999 };
  }
}

function getClientIp(request: NextRequest): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    return xff.split(",")[0].trim();
  }
  const xri = request.headers.get("x-real-ip");
  if (xri) return xri;
  return "unknown";
}

// ─── CMS Session Verification (SECURE) ────────────────────────────
const CMS_SESSION_COOKIE = "cms_session";

function getCmsSigningSecret(): string {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const cmsPassword = process.env.CMS_PASSWORD || "";
  const base = serviceKey || cmsPassword;
  if (!base) return "";
  return `drma-cms-session-secret-v1:${base}`;
}

function verifyCmsSession(cookieValue: string | undefined): boolean {
  if (!cookieValue) return false;

  const parts = cookieValue.split(".");
  if (parts.length !== 2) return false;

  const [token, signature] = parts;
  if (!token || !signature) return false;

  try {
    const secret = getCmsSigningSecret();
    if (!secret) return false;

    const expectedSignature = createHmac("sha256", secret).update(token).digest("base64url");
    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (sigBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return timingSafeEqual(sigBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

function isCmsAuthenticated(request: NextRequest): boolean {
  const sessionValue = request.cookies.get(CMS_SESSION_COOKIE)?.value;
  if (verifyCmsSession(sessionValue)) return true;
  return false;
}

// ─── CSP Builder ──────────────────────────────────────────────────
function buildCSP(nonce: string): string {
  return [
    "default-src 'none'",
    `script-src 'self' 'nonce-${nonce}'`,
    `style-src 'self' 'nonce-${nonce}'`,
    "img-src 'self' https: data: blob:",
    "font-src 'self' https://fonts.gstatic.com data:",
    "connect-src 'self' https://fonts.googleapis.com",
    "frame-ancestors 'none'",
    "frame-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "manifest-src 'self'",
  ].join("; ");
}

// ─── Security Headers ─────────────────────────────────────────────
function setSecurityHeaders(response: NextResponse, nonce: string) {
  response.headers.set("Content-Security-Policy", buildCSP(nonce));
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-XSS-Protection", "0");
  response.headers.set("Cross-Origin-Resource-Policy", "same-origin");
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
}

/**
 * Creates a NextResponse.next() with the CSP nonce set in both:
 * - Request headers: Next.js reads this during rendering to auto-inject
 *   the nonce into all <script> and <style> tags (see Next.js render.js
 *   getScriptNonceFromHeader).
 * - Response headers: The browser enforces the CSP policy.
 */
function nextWithCSP(request: NextRequest, nonce: string): NextResponse {
  const csp = buildCSP(nonce);

  // Set CSP on the REQUEST so Next.js can extract the nonce during rendering.
  // Next.js reads req.headers['content-security-policy'] and parses 'nonce-XXX'.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("Content-Security-Policy", csp);
  requestHeaders.set("x-csp-nonce", nonce);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  // Set CSP on the RESPONSE so the browser enforces it.
  setSecurityHeaders(response, nonce);
  response.headers.set("x-csp-nonce", nonce);

  return response;
}

// ─── Middleware ────────────────────────────────────────────────────
export async function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");

  // --- CMS auth check (must run before anything else) ---
  if (
    request.nextUrl.pathname.startsWith("/cms") &&
    !request.nextUrl.pathname.startsWith("/cms/api") &&
    request.nextUrl.pathname !== "/cms"
  ) {
    if (!isCmsAuthenticated(request)) {
      return NextResponse.redirect(new URL("/cms", request.url));
    }
  }

  // --- API routes: security headers + strict same-origin CORS + rate limiting ---
  if (request.nextUrl.pathname.startsWith("/api/")) {
    const origin = request.headers.get("origin");
    const siteOrigin = request.nextUrl.origin;

    if (origin && origin !== siteOrigin) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const method = request.method.toUpperCase();
    const isWriteMethod = ["POST", "PUT", "PATCH", "DELETE"].includes(method);
    const isCmsWrite = isWriteMethod
      && request.nextUrl.pathname.startsWith("/api/cms/");

    const ip = getClientIp(request);
    const rateCheck = await checkRateLimit(ip, isCmsWrite);
    if (!rateCheck.allowed) {
      const response = new NextResponse(
        JSON.stringify({ error: "Too many requests. Please try again later." }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": "60",
            "X-RateLimit-Limit": String(isCmsWrite ? WRITE_LIMIT : READ_LIMIT),
            "X-RateLimit-Remaining": "0",
          },
        }
      );
      setSecurityHeaders(response, nonce);
      return response;
    }

    if (method === "OPTIONS") {
      const response = new NextResponse(null, { status: 204 });
      response.headers.set("Access-Control-Allow-Origin", siteOrigin);
      response.headers.set(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS"
      );
      response.headers.set(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, x-cms-auth"
      );
      response.headers.set("Access-Control-Max-Age", "86400");
      response.headers.set("X-RateLimit-Remaining", String(rateCheck.remaining));
      setSecurityHeaders(response, nonce);
      return response;
    }

    const response = NextResponse.next();
    response.headers.set("X-RateLimit-Remaining", String(rateCheck.remaining));
    setSecurityHeaders(response, nonce);
    return response;
  }

  // --- Static assets: headers only ---
  if (
    request.nextUrl.pathname.startsWith("/_next/") ||
    request.nextUrl.pathname === "/favicon.ico" ||
    request.nextUrl.pathname === "/robots.txt" ||
    request.nextUrl.pathname === "/sitemap.xml"
  ) {
    const response = NextResponse.next();
    setSecurityHeaders(response, nonce);
    return response;
  }

  // --- Page routes: pass CSP nonce via request header ---
  // Next.js auto-injects the nonce into all <script> and <style> tags.
  // No fetch() or HTML rewriting needed — zero overhead.
  return nextWithCSP(request, nonce);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml).*)",
  ],
};
