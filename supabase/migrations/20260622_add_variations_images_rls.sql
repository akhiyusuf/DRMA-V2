-- Add variations and images columns to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';
ALTER TABLE products ADD COLUMN IF NOT EXISTS variations JSONB DEFAULT '{"sizes":[], "colors":[], "materials":[]}';

-- Add missing CMS fields
ALTER TABLE cms_homepage ADD COLUMN IF NOT EXISTS hero_collection_label TEXT;
ALTER TABLE cms_homepage ADD COLUMN IF NOT EXISTS hero_button_label TEXT DEFAULT 'Shop Now';
ALTER TABLE cms_homepage ADD COLUMN IF NOT EXISTS hero_cta_url TEXT DEFAULT '/shop';
ALTER TABLE cms_homepage ADD COLUMN IF NOT EXISTS mission_label TEXT;
ALTER TABLE cms_homepage ADD COLUMN IF NOT EXISTS mission_button_label TEXT DEFAULT 'Learn More';
ALTER TABLE cms_homepage ADD COLUMN IF NOT EXISTS mission_cta_url TEXT DEFAULT '#';
ALTER TABLE cms_homepage ADD COLUMN IF NOT EXISTS differentiation_label TEXT;
ALTER TABLE cms_homepage ADD COLUMN IF NOT EXISTS differentiation_title TEXT;
ALTER TABLE cms_differentiation_points ADD COLUMN IF NOT EXISTS number TEXT;

-- Fix hero_image_id and mission_image_id to TEXT (no FK, store paths)
ALTER TABLE cms_homepage ALTER COLUMN hero_image_id TYPE TEXT;
ALTER TABLE cms_homepage ALTER COLUMN mission_image_id TYPE TEXT;

-- Create differentiation points table if not exists (in case it wasn't created earlier)
CREATE TABLE IF NOT EXISTS cms_differentiation_points (
    id SERIAL PRIMARY KEY,
    number TEXT,
    title TEXT,
    description TEXT,
    display_order INT DEFAULT 0
);

-- RLS: Enable on all tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE media ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms_homepage ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms_featured_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms_differentiation_points ENABLE ROW LEVEL SECURITY;

-- RLS: Public read access
CREATE POLICY "Public read products" ON products FOR SELECT USING (true);
CREATE POLICY "Public read media" ON media FOR SELECT USING (true);
CREATE POLICY "Public read homepage" ON cms_homepage FOR SELECT USING (true);
CREATE POLICY "Public read featured" ON cms_featured_products FOR SELECT USING (true);
CREATE POLICY "Public read diff points" ON cms_differentiation_points FOR SELECT USING (true);

-- RLS: Service role full access (for CMS writes via API)
-- (Service role bypasses RLS by default in Supabase, but we add explicit policies for clarity)
CREATE POLICY "Service full access products" ON products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service full access media" ON media FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service full access homepage" ON cms_homepage FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service full access featured" ON cms_featured_products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service full access diff points" ON cms_differentiation_points FOR ALL USING (true) WITH CHECK (true);
