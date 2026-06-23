import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/utils/supabase/admin";

// Lightweight endpoint that returns a hash/timestamp of when CMS data was last modified.
// Used by the CMS dashboard to detect external changes and auto-refresh.
export async function GET() {
  try {
    // Get the max updated_at across all CMS-related tables
    const { data: products } = await supabaseAdmin
      .from("products")
      .select("updated_at")
      .order("updated_at", { ascending: false })
      .limit(1);

    const { data: homepage } = await supabaseAdmin
      .from("cms_homepage")
      .select("updated_at")
      .single();

    const { data: orders } = await supabaseAdmin
      .from("orders")
      .select("updated_at")
      .order("updated_at", { ascending: false })
      .limit(1);

    const productTs = products?.[0]?.updated_at || "";
    const homepageTs = homepage?.updated_at || "";
    const orderTs = orders?.[0]?.updated_at || "";

    // Combine into a simple fingerprint string
    const fingerprint = [productTs, homepageTs, orderTs].join("|");

    return NextResponse.json({ fingerprint, ts: Date.now() });
  } catch (error) {
    console.error("GET /api/cms/fingerprint error:", error);
    return NextResponse.json({ fingerprint: "", ts: Date.now() }, { status: 500 });
  }
}