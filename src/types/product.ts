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
}

// Default max a single user can buy of any one product variant
export const DEFAULT_MAX_PER_ORDER = 3;