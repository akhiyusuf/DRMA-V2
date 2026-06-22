-- ============================================
-- DRMA: Full Orders + Stock Migration
-- Paste this into Supabase Dashboard → SQL Editor
-- URL: https://supabase.com/dashboard/project/qeyfzpbbukhnuiabrkef/sql
-- ============================================

-- 1. Orders Table
CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    paypal_order_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'shipped', 'delivered', 'cancelled', 'refunded')),
    customer_email TEXT NOT NULL,
    customer_first_name TEXT NOT NULL,
    customer_last_name TEXT NOT NULL,
    shipping_address TEXT NOT NULL,
    shipping_city TEXT NOT NULL,
    shipping_state TEXT NOT NULL,
    shipping_zip TEXT NOT NULL,
    shipping_method TEXT NOT NULL DEFAULT 'ups_ground',
    subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0,
    tax_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    shipping_cost NUMERIC(10, 2) NOT NULL DEFAULT 0,
    total NUMERIC(10, 2) NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Order Items Table
CREATE TABLE IF NOT EXISTS order_items (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id TEXT REFERENCES products(id),
    product_name TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    selected_size TEXT,
    selected_color TEXT
);

-- 3. Add stock tracking columns to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_quantity INT DEFAULT -1;
ALTER TABLE products ADD COLUMN IF NOT EXISTS low_stock_threshold INT DEFAULT 3;
ALTER TABLE products ADD COLUMN IF NOT EXISTS max_per_order INT DEFAULT 3;
ALTER TABLE products ADD COLUMN IF NOT EXISTS sku TEXT;

-- 4. Order status history
CREATE TABLE IF NOT EXISTS order_status_history (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Set ALL products to stock_quantity = 10 and max_per_order = 3
UPDATE products
SET stock_quantity = 10,
    low_stock_threshold = 3,
    max_per_order = 3,
    in_stock = true
WHERE stock_quantity IS NULL OR stock_quantity = -1 OR stock_quantity = 0;

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON order_status_history(order_id);

-- 7. RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read orders" ON orders FOR SELECT USING (true);
CREATE POLICY "Public read order_items" ON order_items FOR SELECT USING (true);
CREATE POLICY "Public read order_status_history" ON order_status_history FOR SELECT USING (true);
CREATE POLICY "Service full access orders" ON orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service full access order_items" ON order_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service full access order_status_history" ON order_status_history FOR ALL USING (true) WITH CHECK (true);

-- 8. Auto-update orders.updated_at on row change
CREATE OR REPLACE FUNCTION update_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_orders_updated_at ON orders;
CREATE TRIGGER trg_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_orders_updated_at();