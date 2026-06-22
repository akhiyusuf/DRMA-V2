import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/utils/supabase/admin";

// GET: Fetch stock levels for all products
export async function GET() {
  try {
    const { data: products, error } = await supabaseAdmin
      .from("products")
      .select("id, name, price, in_stock, stock_quantity, low_stock_threshold, max_per_order, sku, variations")
      .order("name", { ascending: true });

    if (error) {
      if (error.message?.includes("does not exist") || error.code === "42P01") {
        return NextResponse.json({ products: [], warning: "Stock columns not added yet" });
      }
      throw error;
    }

    return NextResponse.json({ products: products || [] });
  } catch (error) {
    console.error("GET /api/cms/stock error:", error);
    return NextResponse.json({ error: "Failed to fetch stock" }, { status: 500 });
  }
}

// PATCH: Update stock for a single product
export async function PATCH(request: NextRequest) {
  try {
    const { productId, stockQuantity, lowStockThreshold, maxPerOrder, sku, inStock } = await request.json();

    if (!productId) {
      return NextResponse.json({ error: "Product ID required" }, { status: 400 });
    }

    const updates: any = {};
    if (stockQuantity !== undefined) updates.stock_quantity = stockQuantity;
    if (lowStockThreshold !== undefined) updates.low_stock_threshold = lowStockThreshold;
    if (maxPerOrder !== undefined) updates.max_per_order = maxPerOrder;
    if (sku !== undefined) updates.sku = sku;
    if (inStock !== undefined) updates.in_stock = inStock;

    const { data, error } = await supabaseAdmin
      .from("products")
      .update(updates)
      .eq("id", productId)
      .select()
      .single();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, product: data });
  } catch (error) {
    console.error("PATCH /api/cms/stock error:", error);
    return NextResponse.json({ error: "Failed to update stock" }, { status: 500 });
  }
}