import { NextResponse } from "next/server";
import { CMS_COOKIE_NAME } from "@/utils/cms-auth";

/**
 * Ends the CMS session by expiring the signed session cookie.
 * The token is stateless (HMAC-signed, no server-side store), so
 * clearing the cookie is the complete logout.
 */
export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(CMS_COOKIE_NAME, "", {
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: 0, // expire immediately
  });
  return response;
}
