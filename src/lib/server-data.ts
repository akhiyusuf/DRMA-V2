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
export function toPublicProduct(raw: any) {
  const stockQuantity = raw.stock_quantity;
  const lowStockThreshold = raw.low_stock_threshold ?? DEFAULT_LOW_STOCK_THRESHOLD;
  const stockTracked = stockQuantity !== null && stockQuantity !== undefined && stockQuantity >= 0;
  const isLowStock = stockTracked && stockQuantity > 0 && stockQuantity <= lowStockThreshold;

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

/** Fetch all products in public shape (same as GET /api/products). */
export async function fetchPublicProducts() {
  const { data: products, error } = await supabaseAdmin
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (products || []).map(toPublicProduct);
}

/** Fetch homepage CMS content (same shape as GET /api/cms/content?type=homepage). */
export async function fetchHomepageContent() {
  const { data: homepage } = await supabaseAdmin
    .from("cms_homepage")
    .select("*")
    .single();

  const { data: diffPoints } = await supabaseAdmin
    .from("cms_differentiation_points")
    .select("*")
    .order("display_order", { ascending: true });

  const { data: featured } = await supabaseAdmin
    .from("cms_featured_products")
    .select("product_id");

  return {
    hero: {
      title: homepage?.hero_title || "",
      description: homepage?.hero_description || "",
      collectionLabel: homepage?.hero_collection_label || "",
      buttonLabel: homepage?.hero_button_label || "Shop Now",
      ctaUrl: homepage?.hero_cta_url || "/shop",
      image: homepage?.hero_image_id || "",
    },
    mission: {
      label: homepage?.mission_label || "",
      title: homepage?.mission_title || "",
      description: homepage?.mission_description || "",
      buttonLabel: homepage?.mission_button_label || "Learn More",
      ctaUrl: homepage?.mission_cta_url || "#",
      image: homepage?.mission_image_id || "",
    },
    differentiation: {
      label: homepage?.differentiation_label || "",
      title: homepage?.differentiation_title || "",
      points: diffPoints || [],
    },
    featuredProductIds: (featured || []).map((f: any) => f.product_id),
  };
}
