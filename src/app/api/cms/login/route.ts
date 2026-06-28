import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import {
  createSessionToken,
  CMS_COOKIE_NAME,
  CMS_COOKIE_OPTIONS,
  invalidateLegacyCookie,
} from "@/utils/cms-auth";

export async function POST(request: NextRequest) {
  const { password } = await request.json();
  const cmsPassword = process.env.NEXT_PUBLIC_CMS_PASSWORD;

  if (!cmsPassword) {
    console.error("POST /api/cms/login: NEXT_PUBLIC_CMS_PASSWORD is not set");
    return NextResponse.json(
      { error: "CMS authentication is not configured" },
      { status: 500 }
    );
  }

  // Use timingSafeEqual to prevent timing attacks on the password comparison.
  // timingSafeEqual requires equal-length buffers, so we pad the shorter one.
  // This prevents leaking the password length via response timing.
  try {
    const providedBytes = Buffer.from(String(password ?? ""));
    const expectedBytes = Buffer.from(cmsPassword);
    const maxLength = Math.max(providedBytes.length, expectedBytes.length);
    const providedPadded = Buffer.alloc(maxLength);
    const expectedPadded = Buffer.alloc(maxLength);
    providedBytes.copy(providedPadded);
    expectedBytes.copy(expectedPadded);

    if (!timingSafeEqual(providedPadded, expectedPadded)) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  // Password is correct — issue a signed session token
  const sessionToken = createSessionToken();
  const response = NextResponse.json({ success: true });

  // Set the secure session cookie (httpOnly, secure, sameSite=strict)
  response.cookies.set(CMS_COOKIE_NAME, sessionToken, CMS_COOKIE_OPTIONS);

  // Clear any legacy insecure cookie from the previous (vulnerable) auth scheme
  invalidateLegacyCookie(response);

  return response;
}
