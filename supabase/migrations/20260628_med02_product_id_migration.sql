-- MED-02: Migrate product IDs from sequential (p1..p10) to 12-char nanoids
-- Date: 2026-06-28
--
-- This migration:
--   1. Adds a `legacy_id` column to products to preserve old IDs for redirects
--   2. Alters all 3 FK constraints to ON UPDATE CASCADE (they were NO ACTION)
--   3. Updates each product's ID to a random 12-char nanoid
--
-- The FK cascade automatically updates:
--   - product_variant_stock.product_id (78 rows)
--   - cms_featured_products.product_id (5 rows)
--   - order_items.product_id (18 rows)
--
-- The application code handles legacy ID redirects via /product/[id] route:
--   - Requests for /product/p1..p10 look up by legacy_id and 301-redirect
--   - Cart items in localStorage are migrated client-side by matching name
--
-- Row counts verified before and after (no data loss):
--   products:                  10 → 10  ✓
--   product_variant_stock:     78 → 78  ✓
--   cms_featured_products:      5 →  5  ✓
--   order_items:               18 → 18  ✓
--
-- NOTE: This migration was applied directly via psycopg2 on 2026-06-28.
-- This file documents what was done for reproducibility.

BEGIN;

-- Step 1: Add legacy_id column
ALTER TABLE products ADD COLUMN IF NOT EXISTS legacy_id text;

-- Step 2: Store current IDs in legacy_id
UPDATE products SET legacy_id = id;

-- Step 3: Alter FK constraints to ON UPDATE CASCADE
ALTER TABLE cms_featured_products
  DROP CONSTRAINT IF EXISTS cms_featured_products_product_id_fkey,
  ADD CONSTRAINT cms_featured_products_product_id_fkey
  FOREIGN KEY (product_id) REFERENCES products(id)
  ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE order_items
  DROP CONSTRAINT IF EXISTS order_items_product_id_fkey,
  ADD CONSTRAINT order_items_product_id_fkey
  FOREIGN KEY (product_id) REFERENCES products(id)
  ON UPDATE CASCADE ON DELETE NO ACTION;

ALTER TABLE product_variant_stock
  DROP CONSTRAINT IF EXISTS product_variant_stock_product_id_fkey,
  ADD CONSTRAINT product_variant_stock_product_id_fkey
  FOREIGN KEY (product_id) REFERENCES products(id)
  ON UPDATE CASCADE ON DELETE CASCADE;

-- Step 4: Update product IDs to nanoids
-- (These IDs were generated with a URL-safe alphabet, 12 chars each)
UPDATE products SET id = 'Dq9pdZ9JGmCW' WHERE id = 'p1';
UPDATE products SET id = '3kK28gzzsJnd' WHERE id = 'p2';
UPDATE products SET id = 'YUif6tsWWXqx' WHERE id = 'p3';
UPDATE products SET id = '3xZsFoTQUYXK' WHERE id = 'p4';
UPDATE products SET id = 'A2r5AhNQCJ57' WHERE id = 'p5';
UPDATE products SET id = 'RzmcjSpmx2kV' WHERE id = 'p6';
UPDATE products SET id = 'VbdtBavgRWTP' WHERE id = 'p7';
UPDATE products SET id = 'enDDQLRHXQTj' WHERE id = 'p8';
UPDATE products SET id = 'YYQXAgEwyPox' WHERE id = 'p9';
UPDATE products SET id = 'k4hiEoYaoUBf' WHERE id = 'p10';

-- Step 5: Create an index on legacy_id for fast redirect lookups
CREATE INDEX IF NOT EXISTS idx_products_legacy_id ON products(legacy_id) WHERE legacy_id IS NOT NULL;

COMMIT;
