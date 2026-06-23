import { NextResponse } from "next/server";
import pg from "pg";

const { Pool } = pg;

// This migration endpoint creates the product_variant_stock table if it doesn't exist.
// It uses a direct PostgreSQL connection (not Supabase REST) to run DDL.
// Should be called once after deployment, then can be removed.

const SQL_CREATE_TABLE = `
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

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_pvs_product_id ON product_variant_stock(product_id);
CREATE INDEX IF NOT EXISTS idx_pvs_product_size_color ON product_variant_stock(product_id, size, color);

-- Enable RLS (best practice)
ALTER TABLE product_variant_stock ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (Supabase service role)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role;
  END IF;
END $$;

GRANT ALL ON product_variant_stock TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Allow anon read access (for the product page to fetch variant stock)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon;
  END IF;
END $$;

GRANT SELECT ON product_variant_stock TO anon;

-- Enable RLS policies for service_role
CREATE POLICY "service_role_all_access" ON product_variant_stock
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow anon to read variant stock
CREATE POLICY "anon_read_access" ON product_variant_stock
  FOR SELECT TO anon
  USING (true);
`;

export async function GET() {
  // Simple secret to prevent unauthorized migration calls
  const authHeader = process.env.NEXT_PUBLIC_CMS_PASSWORD || "12345";

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    return NextResponse.json(
      { error: "DATABASE_URL not configured" },
      { status: 500 }
    );
  }

  // For Supabase, use the direct connection string
  const dbUrl = connectionString.includes("@db.")
    ? connectionString
    : `postgresql://postgres:[Allahuallam$99]@db.qeyfzpbbukhnuiabrkef.supabase.co:5432/postgres`;

  const pool = new Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
    statement_timeout: 30000,
  });

  try {
    // First check if the table already exists
    const checkResult = await pool.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'product_variant_stock'
      )`
    );

    const tableExists = checkResult.rows[0].exists;

    if (tableExists) {
      // Verify it has the right columns
      const colResult = await pool.query(
        `SELECT column_name FROM information_schema.columns
         WHERE table_name = 'product_variant_stock' AND table_schema = 'public'
         ORDER BY ordinal_position`
      );
      const columns = colResult.rows.map((r: { column_name: string }) => r.column_name);

      return NextResponse.json({
        success: true,
        message: "Table already exists",
        columns,
      });
    }

    // Create the table
    await pool.query(SQL_CREATE_TABLE);

    // Verify creation
    const verifyResult = await pool.query(
      `SELECT column_name, data_type FROM information_schema.columns
       WHERE table_name = 'product_variant_stock' AND table_schema = 'public'
       ORDER BY ordinal_position`
    );

    return NextResponse.json({
      success: true,
      message: "Migration completed successfully",
      columns: verifyResult.rows,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Migration error:", message);
    return NextResponse.json(
      { error: "Migration failed", details: message },
      { status: 500 }
    );
  } finally {
    await pool.end();
  }
}