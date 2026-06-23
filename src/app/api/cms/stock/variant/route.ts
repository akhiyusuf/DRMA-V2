import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/utils/supabase/admin";

// GET: Fetch variant stock for a specific product+size+color (public, used by product page)
// Query params: productId, size, color
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");
    const size = searchParams.get("size");
    const color = searchParams.get("color");

    if (!productId || !size || !color) {
      return NextResponse.json({ error: "productId, size, and color required" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("product_variant_stock")
      .select("stock_quantity, max_per_order")
      .eq("product_id", productId)
      .eq("size", size)
      .eq("color", color)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      // No variant stock row — fall back to product-level
      return NextResponse.json({ stock: null });
    }

    return NextResponse.json({ stock: data.stock_quantity, maxPerOrder: data.max_per_order });
  } catch (error) {
    console.error("GET /api/cms/stock/variant error:", error);
    return NextResponse.json({ stock: null }, { status: 500 });
  }
}

// PATCH: Update variant stock
// Body: { productId, size, color, stockQuantity, maxPerOrder }
export async function PATCH(request: NextRequest) {
  try {
    const { productId, size, color, stockQuantity, maxPerOrder } = await request.json();

    if (!productId || !size || !color) {
      return NextResponse.json({ error: "productId, size, and color required" }, { status: 400 });
    }

    const updates: any = {};
    if (stockQuantity !== undefined) updates.stock_quantity = stockQuantity;
    if (maxPerOrder !== undefined) updates.max_per_order = maxPerOrder;

    // Upsert: insert if not exists, update if exists
    const { data, error } = await supabaseAdmin
      .from("product_variant_stock")
      .upsert(
        {
          product_id: productId,
          size,
          color,
          ...updates,
        },
        { onConflict: "product_id,size,color" }
      )
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, variant: data });
  } catch (error) {
    console.error("PATCH /api/cms/stock/variant error:", error);
    return NextResponse.json({ error: "Failed to update variant stock" }, { status: 500 });
  }
}

// GET (batch): Fetch all variant stock for a product
// Query params: productId
export async function POST(request: NextRequest) {
  try {
    const { productId } = await request.json();

    if (!productId) {
      return NextResponse.json({ error: "productId required" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("product_variant_stock")
      .select("*")
      .eq("product_id", productId)
      .order("size", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ variants: data || [] });
  } catch (error) {
    console.error("POST /api/cms/stock/variant error:", error);
    return NextResponse.json({ error: "Failed to fetch variants" }, { status: 500 });
  }
}