import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { password } = await request.json();
  const cmsPassword = process.env.NEXT_PUBLIC_CMS_PASSWORD;
  
  if (password === cmsPassword) {
    const response = NextResponse.json({ success: true });
    response.cookies.set("cms_authenticated", "true", {
      path: "/",
      httpOnly: false,
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 hours
    });
    return response;
  }
  
  return NextResponse.json({ error: "Invalid password" }, { status: 401 });
}
