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
}
