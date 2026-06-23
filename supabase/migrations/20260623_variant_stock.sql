-- ============================================
-- DRMA: Per-Variant Stock Migration
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Create variant stock table
CREATE TABLE IF NOT EXISTS product_variant_stock (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    size TEXT NOT NULL DEFAULT '',
    color TEXT NOT NULL DEFAULT '',
    stock_quantity INT NOT NULL DEFAULT -1,  -- -1 = untracked (use product-level stock)
    max_per_order INT DEFAULT 3,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(product_id, size, color)
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_variant_stock_product_id ON product_variant_stock(product_id);

-- 3. RLS
ALTER TABLE product_variant_stock ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read variant stock" ON product_variant_stock FOR SELECT USING (true);
CREATE POLICY "Service full access variant stock" ON product_variant_stock FOR ALL USING (true) WITH CHECK (true);

-- 4. Auto-update updated_at
CREATE OR REPLACE FUNCTION update_variant_stock_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_variant_stock_updated_at ON product_variant_stock;
CREATE TRIGGER trg_variant_stock_updated_at
    BEFORE UPDATE ON product_variant_stock
    FOR EACH ROW
    EXECUTE FUNCTION update_variant_stock_updated_at();

-- 5. Seed variant stock rows for existing products that have size/color variations
-- (optional — only creates rows if variations exist)
INSERT INTO product_variant_stock (product_id, size, color, stock_quantity, max_per_order)
SELECT 
    p.id, 
    unnest(COALESCE(p.variations->'sizes', '[]'::jsonb)::text[]), 
    unnest(COALESCE(p.variations->'colors', '[]'::jsonb)::text[]), 
    -1, 
    COALESCE(p.max_per_order, 3)
FROM products p
WHERE p.variations IS NOT NULL
  AND (p.variations->'sizes')::text != '[]'
  AND (p.variations->'colors')::text != '[]'
ON CONFLICT (product_id, size, color) DO NOTHING;