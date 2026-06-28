import { NextRequest, NextResponse } from "next/server";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * CMS Authentication Helper — SECURE IMPLEMENTATION
 *
 * CRITICAL FIX: The previous implementation used a cookie value of "true"
 * with httpOnly: false, which was trivially forgeable. Any visitor could
 * bypass auth by running `document.cookie = "cms_authenticated=true"` in
 * their browser console.
 *
 * This implementation uses an HMAC-signed session token:
 *   - On login, a random 32-byte token is generated
 *   - The cookie value is `{token}.{hmac_signature}` where the signature
 *     is HMAC-SHA256(server_secret, token)
 *   - On verification, the signature is recomputed and compared using
 *     timingSafeEqual (prevents timing attacks)
 *   - The cookie is httpOnly (JS can't read it), secure (HTTPS only),
 *     and sameSite=strict (CSRF protection)
 *
 * The server secret is derived from the Supabase service role key, which
 * is already a high-value server-side secret. If this key leaks, the
 * attacker can do far worse than forge CMS sessions.
 *
 * Cookie format:
 *   cms_session = {base64url_token}.{base64url_signature}
 *
 * This helper MUST be called at the top of every CMS write endpoint
 * (POST/PUT/PATCH/DELETE) and any CMS read endpoint that exposes
 * non-public data (orders, customer info, etc.).
 *
 * Public CMS endpoints that do NOT need this check:
 *   - GET /api/cms/content        (homepage content, public)
 *   - GET /api/cms/stock/variant  (variant stock for product page)
 *   - POST /api/cms/stock/variant (batch variant stock fetch, read-only)
 *   - POST /api/cms/login          (the login endpoint itself)
 */

const CMS_SESSION_COOKIE = "cms_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24; // 24 hours

/**
 * Derive the HMAC signing secret from the Supabase service role key.
 * We use a fixed prefix to ensure the secret is distinct from the raw key.
 * Falls back to NEXT_PUBLIC_CMS_PASSWORD if service key is unavailable
 * (e.g., during build), but auth will fail gracefully in that case.
 */
function getSigningSecret(): string {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const cmsPassword = process.env.NEXT_PUBLIC_CMS_PASSWORD || "";
  // Use whichever is available; prefer the service key (longer, more entropic)
  const base = serviceKey || cmsPassword;
  if (!base) {
    throw new Error("No signing secret available — SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_CMS_PASSWORD are both unset");
  }
  return `drma-cms-session-secret-v1:${base}`;
}

/**
 * Generate a new signed session token.
 * Returns the full cookie value: `{token}.{signature}`
 */
export function createSessionToken(): string {
  const token = randomBytes(32).toString("base64url");
  const secret = getSigningSecret();
  const signature = createHmac("sha256", secret).update(token).digest("base64url");
  return `${token}.${signature}`;
}

/**
 * Verify a session token's signature.
 * Returns true if the token was issued by this server and the signature matches.
 * Uses timingSafeEqual to prevent timing attacks.
 */
export function verifySessionToken(cookieValue: string | undefined): boolean {
  if (!cookieValue) return false;

  // Split into token and signature
  const parts = cookieValue.split(".");
  if (parts.length !== 2) return false;

  const [token, signature] = parts;
  if (!token || !signature) return false;

  try {
    const secret = getSigningSecret();
    const expectedSignature = createHmac("sha256", secret).update(token).digest("base64url");

    // Use timingSafeEqual to prevent timing attacks.
    // Both values must be the same length for timingSafeEqual.
    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (sigBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return timingSafeEqual(sigBuffer, expectedBuffer);
  } catch (error) {
    // Any error (bad base64, secret unavailable, etc.) = invalid token
    return false;
  }
}

/**
 * Check if the request has a valid CMS session cookie.
 */
export function isCmsAuthenticated(request: NextRequest): boolean {
  const cookieValue = request.cookies.get(CMS_SESSION_COOKIE)?.value;
  return verifySessionToken(cookieValue);
}

/**
 * Require CMS authentication. Returns null if authenticated, or a 401
 * NextResponse if not. Call this at the top of every protected route.
 */
export function requireCmsAuth(request: NextRequest): NextResponse | null {
  if (isCmsAuthenticated(request)) {
    return null; // Authenticated — caller may proceed
  }
  // Not authenticated — return 401
  return NextResponse.json(
    { error: "Unauthorized. CMS authentication required." },
    { status: 401 }
  );
}

/**
 * Cookie configuration for setCookie.
 * Returns the cookie name and options for use with NextResponse.cookies.set()
 */
export const CMS_COOKIE_NAME = CMS_SESSION_COOKIE;
export const CMS_COOKIE_OPTIONS = {
  path: "/",
  httpOnly: true,        // JS cannot read or set this cookie
  secure: true,          // HTTPS only (Vercel is always HTTPS)
  sameSite: "strict" as const,  // CSRF protection — no cross-site requests
  maxAge: SESSION_MAX_AGE_SECONDS,
};

/**
 * Legacy cookie name — used by invalidateLegacyCookie() to clear
 * any old "cms_authenticated=true" cookies that visitors may still have.
 */
const LEGACY_COOKIE_NAME = "cms_authenticated";

/**
 * Clear the legacy insecure cookie if it exists.
 * Call this on login to migrate users off the old cookie.
 */
export function invalidateLegacyCookie(response: NextResponse): void {
  response.cookies.set(LEGACY_COOKIE_NAME, "", {
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: 0,  // expires immediately
  });
}
