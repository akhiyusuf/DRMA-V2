import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/utils/supabase/admin";

// Self-migrating endpoint: creates product_variant_stock table if missing.
// Uses Supabase JS client to probe the table; if it doesn't exist,
// provides the SQL for the user to run in Supabase Dashboard > SQL Editor.

export async function GET() {
  try {
    // Test if the table exists
    const { error } = await supabaseAdmin
      .from("product_variant_stock")
      .select("id")
      .limit(1);

    if (!error) {
      return NextResponse.json({
        success: true,
        message: "Table product_variant_stock already exists",
      });
    }

    // Table doesn't exist - return the SQL for manual creation
    const sql = `-- Run this in Supabase Dashboard > SQL Editor
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
END $$;`;

    return NextResponse.json({
      success: false,
      message: "Table product_variant_stock does not exist yet. Run the SQL below in Supabase Dashboard > SQL Editor.",
      sql,
      error: error.message,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}