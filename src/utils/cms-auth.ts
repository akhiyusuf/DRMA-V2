import { NextRequest, NextResponse } from "next/server";

/**
 * CMS Authentication Helper
 *
 * Validates that the incoming request is from an authenticated CMS user.
 * The CMS login route (/api/cms/login) sets a `cms_authenticated` cookie
 * after the user enters the correct password.
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

const CMS_AUTH_COOKIE = "cms_authenticated";

export function isCmsAuthenticated(request: NextRequest): boolean {
  return request.cookies.get(CMS_AUTH_COOKIE)?.value === "true";
}

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
