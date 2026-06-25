export interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  images: string[];
  category: string;
  tags: ('Ethically Sourced' | 'Artisan Made' | 'Organic' | 'Hand-stitched')[];
  variations: {
    sizes: string[];
    colors: string[];
    materials: string[];
  };
  inStock: boolean;
  stock_quantity?: number | null;
  low_stock_threshold?: number;
  max_per_order?: number | null;
  sku?: string;
  /**
   * CMS-editable per-product SEO metadata. When present, the product detail
   * page uses these for its <title> and <meta name="description"> instead of
   * the brand-wide mission statement from the root layout. When NULL, the
   * page falls back to `${name} | DRMA`.
   */
  page_title?: string | null;
  meta_description?: string | null;
}

// Default max a single user can buy of any one product variant
export const DEFAULT_MAX_PER_ORDER = 3;