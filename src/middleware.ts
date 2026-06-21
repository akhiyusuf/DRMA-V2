import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  // Only protect /cms routes (except the login page itself)
  if (request.nextUrl.pathname.startsWith("/cms") && 
      !request.nextUrl.pathname.startsWith("/cms/api") &&
      request.nextUrl.pathname !== "/cms") {
    
    const cmsAuth = request.cookies.get("cms_authenticated")?.value;
    
    if (cmsAuth !== "true") {
      return NextResponse.redirect(new URL("/cms", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/cms/:path*"],
};
