import { NextRequest, NextResponse } from "next/server";

/**
 * Middleware that:
 * 1. Generates a per-request CSP nonce and injects it into all <script> tags
 * 2. Converts inline style="" attributes to nonce-bearing <style> elements (CSP compat)
 * 3. Sets hardened security headers (CSP, X-Frame-Options, X-XSS-Protection, etc.)
 * 4. Handles restrictive CORS for /api/* routes
 * 5. Enforces CMS authentication
 */

function buildCSP(nonce: string): string {
  return [
    "default-src 'none'",
    `script-src 'self' 'nonce-${nonce}'`,
    `style-src 'self' 'nonce-${nonce}'`,
    "img-src 'self' https: data: blob:",
    "font-src 'self' https://fonts.gstatic.com data:",
    "connect-src 'self' https://qeyfzpbbukhnuiabrkef.supabase.co https://fonts.googleapis.com",
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
  response.headers.set("X-XSS-Protection", "1; mode=block");
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

  // --- API routes: security headers + strict same-origin CORS ---
  if (request.nextUrl.pathname.startsWith("/api/")) {
    const origin = request.headers.get("origin");
    const siteOrigin = request.nextUrl.origin;

    if (origin && origin !== siteOrigin) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    if (request.method === "OPTIONS") {
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
      setSecurityHeaders(response, nonce);
      return response;
    }

    const response = NextResponse.next();
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

    const upstream = await fetch(request.url, { headers: fetchHeaders });
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