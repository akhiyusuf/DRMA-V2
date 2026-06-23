-- DRMA-V2 Migration: Create product_variant_stock table
-- Run this in Supabase Dashboard > SQL Editor (https://supabase.com/dashboard/project/qeyfzpbbukhnuiabrkef/sql)

CREATE TABLE IF NOT EXISTS product_variant_stock (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  size TEXT NOT NULL,
  color TEXT NOT NULL,
  stock_quantity INTEGER DEFAULT -1,
  max_per_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(product_id, size, color)
);

CREATE INDEX IF NOT EXISTS idx_pvs_product_id ON product_variant_stock(product_id);
CREATE INDEX IF NOT EXISTS idx_pvs_product_size_color ON product_variant_stock(product_id, size, color);

ALTER TABLE product_variant_stock ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "service_role_all_access" ON product_variant_stock
    FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "anon_read_access" ON product_variant_stock
    FOR SELECT TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;