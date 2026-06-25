-- Adds CMS-editable per-product SEO metadata so every product detail page
-- can have its own unique <title> and <meta name="description"> instead of
-- sharing the brand-wide mission statement from the root layout.
--
-- Both columns are nullable. When NULL, the product page falls back to
-- `${product.name} | DRMA` so legacy products keep working without a manual
-- backfill.

ALTER TABLE products
    ADD COLUMN IF NOT EXISTS page_title TEXT;

ALTER TABLE products
    ADD COLUMN IF NOT EXISTS meta_description TEXT;

-- Backfill friendly defaults for every existing product so the new fields
-- are immediately visible / editable in the CMS dashboard. These are
-- intentionally generic and meant to be refined per-product by the store
-- owner through the CMS.
UPDATE products SET page_title = name || ' | DRMA' WHERE page_title IS NULL;
UPDATE products SET meta_description = LEFT(COALESCE(description, name || ' — modest, ethically produced clothing by DRMA.'), 160) WHERE meta_description IS NULL;
