import { NextResponse } from 'next/server';
import pg from 'pg';

const FUNCTIONS = [
  {
    name: 'decrement_stock',
    sql: `
CREATE OR REPLACE FUNCTION decrement_stock(p_product_id TEXT, p_quantity INT)
RETURNS JSONB AS $$
DECLARE
  v_product RECORD;
  v_new_qty INT;
BEGIN
  SELECT * INTO v_product FROM products WHERE id = p_product_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Product not found');
  END IF;
  IF v_product.stock_quantity IS NULL OR v_product.stock_quantity = -1 THEN
    RETURN jsonb_build_object('success', true, 'new_quantity', -1, 'tracked', false);
  END IF;
  v_new_qty := v_product.stock_quantity - p_quantity;
  IF v_new_qty < 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient stock', 'current_quantity', v_product.stock_quantity);
  END IF;
  UPDATE products SET stock_quantity = v_new_qty, in_stock = (v_new_qty > 0) WHERE id = p_product_id;
  RETURN jsonb_build_object('success', true, 'new_quantity', v_new_qty, 'tracked', true);
END;
$$ LANGUAGE plpgsql;`,
  },
  {
    name: 'increment_stock',
    sql: `
CREATE OR REPLACE FUNCTION increment_stock(p_product_id TEXT, p_quantity INT)
RETURNS JSONB AS $$
DECLARE
  v_product RECORD;
  v_new_qty INT;
BEGIN
  SELECT * INTO v_product FROM products WHERE id = p_product_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Product not found');
  END IF;
  IF v_product.stock_quantity IS NULL OR v_product.stock_quantity = -1 THEN
    RETURN jsonb_build_object('success', true, 'new_quantity', -1, 'tracked', false);
  END IF;
  v_new_qty := v_product.stock_quantity + p_quantity;
  UPDATE products SET stock_quantity = v_new_qty, in_stock = (v_new_qty > 0) WHERE id = p_product_id;
  RETURN jsonb_build_object('success', true, 'new_quantity', v_new_qty, 'tracked', true);
END;
$$ LANGUAGE plpgsql;`,
  },
  {
    name: 'check_stock_availability',
    sql: `
CREATE OR REPLACE FUNCTION check_stock_availability(p_items JSONB)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB := '[]'::JSONB;
  v_item JSONB;
  v_product RECORD;
  v_all_available BOOLEAN := true;
BEGIN
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT * INTO v_product FROM products WHERE id = v_item->>'product_id';
    IF NOT FOUND THEN
      v_result := v_result || jsonb_build_object('product_id', v_item->>'product_id', 'requested', (v_item->>'quantity')::INT, 'available', 0, 'sufficient', false, 'error', 'Product not found');
      v_all_available := false;
    ELSIF v_product.stock_quantity IS NULL OR v_product.stock_quantity = -1 THEN
      v_result := v_result || jsonb_build_object('product_id', v_product.id, 'product_name', v_product.name, 'requested', (v_item->>'quantity')::INT, 'available', -1, 'sufficient', true);
    ELSIF v_product.stock_quantity < (v_item->>'quantity')::INT THEN
      v_result := v_result || jsonb_build_object('product_id', v_product.id, 'product_name', v_product.name, 'requested', (v_item->>'quantity')::INT, 'available', v_product.stock_quantity, 'sufficient', false);
      v_all_available := false;
    ELSE
      v_result := v_result || jsonb_build_object('product_id', v_product.id, 'product_name', v_product.name, 'requested', (v_item->>'quantity')::INT, 'available', v_product.stock_quantity, 'sufficient', true);
    END IF;
  END LOOP;
  RETURN jsonb_build_object('available', v_all_available, 'items', v_result);
END;
$$ LANGUAGE plpgsql;`,
  },
];

export async function POST() {
  const client = new pg.Client({
    host: 'aws-0-eu-west-1.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    user: 'postgres.qeyfzpbbukhnuiabrkef',
    password: 'Allahuallam$99',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  try {
    await client.connect();

    const results: { name: string; status: string; error?: string }[] = [];

    for (const fn of FUNCTIONS) {
      try {
        await client.query(fn.sql);
        results.push({ name: fn.name, status: 'created' });
      } catch (e: any) {
        results.push({ name: fn.name, status: 'error', error: e.message });
      }
    }

    // Verify
    const verify = await client.query(`
      SELECT routine_name FROM information_schema.routines
      WHERE routine_schema = 'public'
      AND routine_name IN ('decrement_stock', 'increment_stock', 'check_stock_availability')
      ORDER BY routine_name
    `);

    await client.end();

    return NextResponse.json({
      success: true,
      created: results,
      verified: verify.rows.map((r: any) => r.routine_name),
    });
  } catch (error: any) {
    try { await client.end(); } catch {}
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}