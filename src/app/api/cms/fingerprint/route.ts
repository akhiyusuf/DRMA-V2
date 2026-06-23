import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/utils/supabase/admin";

// Lightweight endpoint that returns per-table timestamps for CMS change detection.
// Returns separate fingerprints so the dashboard can show context-aware notifications.
export async function GET() {
  try {
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

    return NextResponse.json({
      fingerprint: [productTs, homepageTs, orderTs].join("|"),
      products: productTs,
      homepage: homepageTs,
      orders: orderTs,
    });
  } catch (error) {
    console.error("GET /api/cms/fingerprint error:", error);
    return NextResponse.json({ fingerprint: "", products: "", homepage: "", orders: "" }, { status: 500 });
  }
}