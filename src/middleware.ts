import { NextRequest, NextResponse } from "next/server";

/**
 * Middleware that:
 * 1. Generates a per-request CSP nonce and injects it into all <script> tags
 * 2. Sets hardened security headers (CSP, X-Frame-Options, X-XSS-Protection, etc.)
 * 3. Handles restrictive CORS for /api/* routes
 * 4. Enforces CMS authentication
 */

function buildCSP(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'`,
    `style-src 'self' 'unsafe-inline'`,
    "img-src 'self' https: data: blob:",
    "font-src 'self' https://fonts.gstatic.com data:",
    "connect-src 'self' https://qeyfzpbbukhnuiabrkef.supabase.co https://fonts.googleapis.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join("; ");
}

function setSecurityHeaders(response: Response | NextResponse, nonce: string) {
  response.headers.set("Content-Security-Policy", buildCSP(nonce));
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Cross-Origin-Resource-Policy", "same-origin");
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
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

  // --- API routes: security headers + strict same-origin CORS ---
  if (request.nextUrl.pathname.startsWith("/api/")) {
    const origin = request.headers.get("origin");
    const siteOrigin = request.nextUrl.origin;

    // Block cross-origin requests explicitly
    if (origin && origin !== siteOrigin) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    // Handle same-origin preflight
    if (request.method === "OPTIONS") {
      const response = new NextResponse(null, { status: 204 });
      response.headers.set("Access-Control-Allow-Origin", siteOrigin);
      response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
      response.headers.set(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, x-cms-auth"
      );
      response.headers.set("Access-Control-Max-Age", "86400");
      setSecurityHeaders(response, nonce);
      return response;
    }

    const response = NextResponse.next();
    setSecurityHeaders(response, nonce);
    return response;
  }

  // --- Static assets (_next/static, _next/image, favicon, etc.): headers only ---
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

  // --- Page routes: fetch HTML, inject nonce into <script> tags, return with CSP ---
  try {
    const fetchHeaders = new Headers(request.headers);
    fetchHeaders.set("x-middleware-invoke", "1");
    // Remove hop-by-hop headers that fetch will manage
    fetchHeaders.delete("connection");
    fetchHeaders.delete("keep-alive");
    fetchHeaders.delete("transfer-encoding");

    const upstream = await fetch(request.url, { headers: fetchHeaders });

    const contentType = upstream.headers.get("content-type") || "";

    // Only rewrite HTML responses
    if (contentType.includes("text/html")) {
      let html = await upstream.text();

      // Inject nonce into every <script> tag (both inline and external)
      // Pattern matches <script followed by whitespace or >, and injects nonce
      // before any existing attributes. Skips tags that already have a nonce.
      html = html.replace(
        /<script(?![^>]*\bnonce=)(\s|>)/g,
        `<script nonce="${nonce}"$1`
      );

      const newResponse = new Response(html, {
        status: upstream.status,
        statusText: upstream.statusText,
      });

      // Copy upstream headers (skip CSP & length which we override)
      upstream.headers.forEach((value, key) => {
        const lower = key.toLowerCase();
        if (
          lower !== "content-security-policy" &&
          lower !== "content-length" &&
          lower !== "transfer-encoding"
        ) {
          newResponse.headers.set(key, value);
        }
      });

      setSecurityHeaders(newResponse, nonce);
      // Pass nonce to server components via response header
      newResponse.headers.set("x-csp-nonce", nonce);
      return newResponse;
    }

    // Non-HTML responses: passthrough with security headers
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
    // Fallback: if fetch fails (e.g. in dev), let the request pass through
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