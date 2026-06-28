import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/utils/supabase/admin";

// Default low-stock threshold used when the product's low_stock_threshold
// is null. Matches the fallback in ProductView.tsx.
const DEFAULT_LOW_STOCK_THRESHOLD = 3;

/**
 * Transform a raw product row (from Supabase, with all internal fields)
 * into the public-facing product object.
 *
 * HIGH-01 fix: strips internal-only fields that should not be exposed
 * to anonymous callers:
 *   - low_stock_threshold  (internal reorder trigger)
 *   - sku                   (internal stock-keeping unit)
 *   - created_at            (internal timestamp; reveals launch order)
 *
 * Replaces the raw low_stock_threshold + stock_quantity combo with a
 * server-computed `is_low_stock` boolean, so the product page can still
 * show "low stock" warnings without revealing the exact threshold.
 *
 * Retains stock_quantity and max_per_order because the cart and product
 * page need them to enforce purchase limits (quantity selector capping,
 * out-of-stock detection). These are mitigated by rate limiting (LOW-04).
 */
function toPublicProduct(raw: any) {
  const stockQuantity = raw.stock_quantity;
  const lowStockThreshold = raw.low_stock_threshold ?? DEFAULT_LOW_STOCK_THRESHOLD;
  const stockTracked = stockQuantity !== null && stockQuantity !== undefined && stockQuantity >= 0;
  const isLowStock = stockTracked && stockQuantity > 0 && stockQuantity <= lowStockThreshold;

  // Strip internal fields, add computed is_low_stock
  const {
    low_stock_threshold: _lst,
    sku: _sku,
    created_at: _ca,
    ...publicFields
  } = raw;

  return {
    ...publicFields,
    is_low_stock: isLowStock,
  };
}

export async function GET() {
  try {
    const { data: products, error } = await supabaseAdmin
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Strip internal-only fields before returning to anonymous callers
    const publicProducts = (products || []).map(toPublicProduct);
    return NextResponse.json(publicProducts);
  } catch (error) {
    console.error("GET /api/products error:", error);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}
