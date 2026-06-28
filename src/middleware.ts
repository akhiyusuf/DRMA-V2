import { NextRequest, NextResponse } from "next/server";

/**
 * Middleware that:
 * 1. Generates a per-request CSP nonce and injects it into all <script> tags
 * 2. Converts inline style="" attributes to nonce-bearing <style> elements (CSP compat)
 * 3. Sets hardened security headers (CSP, X-Frame-Options, X-XSS-Protection, etc.)
 * 4. Handles restrictive CORS for /api/* routes
 * 5. Enforces CMS authentication
 * 6. Rate-limits /api/* routes (LOW-04 fix)
 */

// ─── Rate Limiter (LOW-04 fix) ────────────────────────────────────
// Simple in-memory sliding-window rate limiter. Each IP gets a bucket of
// timestamps; requests older than the window are pruned. When the bucket
// exceeds the limit, the request is rejected with HTTP 429.
//
// Limits (per IP, per 60-second window):
//   - /api/cms/* write routes (POST/PUT/PATCH/DELETE):  10 req/min
//   - /api/* read routes (GET/POST):                   120 req/min
//
// Note: This is per-server-instance (in-memory). On Vercel serverless,
// each instance has its own counter, so the effective limit is
// (limit × instance_count). This is intentionally permissive — the goal
// is to block obvious abuse (bulk scraping, brute-force), not to enforce
// strict per-user quotas. For stricter limits, use Upstash Redis ratelimit.
const RATE_WINDOW_MS = 60_000;
const READ_LIMIT = 120;
const WRITE_LIMIT = 10;

interface RateBucket {
  timestamps: number[];
}

const rateLimitMap = new Map<string, RateBucket>();

// Prune expired entries periodically to prevent memory growth
let lastPrune = Date.now();
function pruneExpired(now: number) {
  if (now - lastPrune < 60_000) return; // prune at most once per minute
  lastPrune = now;
  for (const [key, bucket] of rateLimitMap) {
    bucket.timestamps = bucket.timestamps.filter((t) => now - t < RATE_WINDOW_MS);
    if (bucket.timestamps.length === 0) {
      rateLimitMap.delete(key);
    }
  }
}

function checkRateLimit(ip: string, isWrite: boolean): { allowed: boolean; remaining: number } {
  const now = Date.now();
  pruneExpired(now);

  const key = `${ip}:${isWrite ? "w" : "r"}`;
  const limit = isWrite ? WRITE_LIMIT : READ_LIMIT;

  let bucket = rateLimitMap.get(key);
  if (!bucket) {
    bucket = { timestamps: [] };
    rateLimitMap.set(key, bucket);
  }

  // Prune old timestamps for this bucket
  bucket.timestamps = bucket.timestamps.filter((t) => now - t < RATE_WINDOW_MS);

  if (bucket.timestamps.length >= limit) {
    return { allowed: false, remaining: 0 };
  }

  bucket.timestamps.push(now);
  return { allowed: true, remaining: limit - bucket.timestamps.length };
}

function getClientIp(request: NextRequest): string {
  // Vercel sets x-forwarded-for and x-real-ip
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    return xff.split(",")[0].trim();
  }
  const xri = request.headers.get("x-real-ip");
  if (xri) return xri;
  return "unknown";
}

function buildCSP(nonce: string): string {
  return [
    "default-src 'none'",
    `script-src 'self' 'nonce-${nonce}'`,
    `style-src 'self' 'nonce-${nonce}'`,
    "img-src 'self' https: data: blob:",
    "font-src 'self' https://fonts.gstatic.com data:",
    // MED-04 fix: Removed https://qeyfzpbbukhnuiabrkef.supabase.co from
    // connect-src. All Supabase data access now goes through Next.js API
    // routes (server-side), so the browser never needs to call Supabase
    // directly. Product images are loaded via <img> tags (covered by
    // img-src 'https:'). This prevents leaking the Supabase project
    // reference in every response header.
    "connect-src 'self' https://fonts.googleapis.com",
    "frame-ancestors 'none'",
    "frame-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "manifest-src 'self'",
  ].join("; ");
}

function setSecurityHeaders(response: Response | NextResponse, nonce: string) {
  response.headers.set("Content-Security-Policy", buildCSP(nonce));
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  // MED-01 fix: Set X-XSS-Protection to "0" to explicitly disable the
  // deprecated IE/Edge XSS Auditor. Modern browsers ignore this header,
  // and on legacy browsers the auditor has been shown to INTRODUCE XSS
  // vulnerabilities. We rely on the strong CSP above for XSS mitigation.
  response.headers.set("X-XSS-Protection", "0");
  response.headers.set("Cross-Origin-Resource-Policy", "same-origin");
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
}

/**
 * Rewrites HTML to be CSP-compliant:
 * 1. Injects nonce into all <script> tags
 * 2. Converts inline style="" attributes to CSS classes in a <style nonce="..."> tag
 *    (CSP blocks inline style attributes without 'unsafe-inline')
 */
function rewriteHTML(html: string, nonce: string): string {
  // --- Step 1: Inject nonce into <script> tags ---
  html = html.replace(
    /<script(?![^>]*\bnonce=)(\s|>)/g,
    `<script nonce="${nonce}"$1`
  );

  // --- Step 2: Convert inline style="" attributes to CSS classes ---
  // Framer Motion and React render inline styles as style="..." HTML attributes
  // during SSR. CSP blocks these without 'unsafe-inline'. We extract them into
  // a <style> tag with a nonce, replacing each style="" with a class name.
  const extractedStyles: string[] = [];

  html = html.replace(
    /(<[^>]+?)\s+style="([^"]*)"/g,
    (_match: string, tagPrefix: string, styleValue: string) => {
      const idx = extractedStyles.length;
      const decoded = styleValue
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">");
      const className = `ncs-${idx}`;
      extractedStyles.push(`.${className}{${decoded}}`);

      if (/\bclass="[^"]*"/.test(tagPrefix)) {
        return tagPrefix.replace(
          /\bclass="([^"]*)"/,
          `class="$1 ${className}"`
        );
      }
      return `${tagPrefix} class="${className}"`;
    }
  );

  // --- Step 3: Inject the <style> block into <head> ---
  if (extractedStyles.length > 0) {
    const styleBlock = `<style nonce="${nonce}">${extractedStyles.join("")}</style>`;
    html = html.replace(/(<head[^>]*>)/, `$1${styleBlock}`);
  }

  return html;
}

export async function middleware(request: NextRequest) {
  // Avoid re-entry when middleware fetches from itself
  if (request.headers.get("x-middleware-invoke")) {
    return NextResponse.next();
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");

  // --- CMS auth check (must run before anything else) ---
  if (
    request.nextUrl.pathname.startsWith("/cms") &&
    !request.nextUrl.pathname.startsWith("/cms/api") &&
    request.nextUrl.pathname !== "/cms"
  ) {
    const cmsAuth = request.cookies.get("cms_authenticated")?.value;
    if (cmsAuth !== "true") {
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

    // LOW-04 fix: Rate limit all API routes
    const method = request.method.toUpperCase();
    const isWriteMethod = ["POST", "PUT", "PATCH", "DELETE"].includes(method);
    // CMS write routes (including login, which is a brute-force target)
    // get a stricter limit of 10 req/min.
    const isCmsWrite = isWriteMethod
      && request.nextUrl.pathname.startsWith("/api/cms/");

    const ip = getClientIp(request);
    const rateCheck = checkRateLimit(ip, isCmsWrite);
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

  // --- Page routes: fetch HTML, rewrite for CSP compliance, return ---
  try {
    const fetchHeaders = new Headers(request.headers);
    fetchHeaders.set("x-middleware-invoke", "1");
    fetchHeaders.delete("connection");
    fetchHeaders.delete("keep-alive");
    fetchHeaders.delete("transfer-encoding");

    // MED-02: Use redirect: "manual" so that Next.js redirect() calls from
    // page components (e.g., legacy ID redirects) are passed through to the
    // client as 3xx responses, not followed internally by fetch().
    const upstream = await fetch(request.url, {
      headers: fetchHeaders,
      redirect: "manual",
    });

    // If the upstream returned a redirect (3xx), pass it through with
    // security headers attached. This preserves the redirect status code
    // and Location header that the page component set via redirect().
    if (upstream.status >= 300 && upstream.status < 400) {
      const location = upstream.headers.get("location");
      if (location) {
        const redirectResponse = NextResponse.redirect(
          new URL(location, request.url),
          upstream.status as 301 | 302 | 307 | 308
        );
        setSecurityHeaders(redirectResponse, nonce);
        return redirectResponse;
      }
    }

    const contentType = upstream.headers.get("content-type") || "";

    if (contentType.includes("text/html")) {
      let html = await upstream.text();
      html = rewriteHTML(html, nonce);

      const newResponse = new Response(html, {
        status: upstream.status,
        statusText: upstream.statusText,
      });

      upstream.headers.forEach((value, key) => {
        const lower = key.toLowerCase();
        if (
          lower !== "content-security-policy" &&
          lower !== "content-length" &&
          lower !== "transfer-encoding" &&
          lower !== "access-control-allow-origin" &&
          lower !== "access-control-allow-credentials" &&
          lower !== "access-control-expose-headers"
        ) {
          newResponse.headers.set(key, value);
        }
      });

      setSecurityHeaders(newResponse, nonce);
      newResponse.headers.set("x-csp-nonce", nonce);
      return newResponse;
    }

    const newResponse = new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
    });
    upstream.headers.forEach((value, key) => {
      newResponse.headers.set(key, value);
    });
    setSecurityHeaders(newResponse, nonce);
    return newResponse;
  } catch (err) {
    console.error("Middleware fetch error:", err);
    const response = NextResponse.next();
    setSecurityHeaders(response, nonce);
    return response;
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml).*)",
  ],
};