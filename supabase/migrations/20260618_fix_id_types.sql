-- Fix ID types from UUID to TEXT for compatibility with existing JSON data

-- 1. Drop existing tables that reference the old products.id (must drop dependent tables first)
DROP TABLE IF EXISTS cms_featured_products;
DROP TABLE IF EXISTS products;

-- 2. Recreate products table with TEXT ID
CREATE TABLE products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    description TEXT,
    category TEXT,
    tags TEXT[],
    in_stock BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Recreate dependent table with TEXT ID
CREATE TABLE cms_featured_products (
    product_id TEXT REFERENCES products(id) ON DELETE CASCADE,
    display_order INT DEFAULT 0,
    PRIMARY KEY (product_id)
);
