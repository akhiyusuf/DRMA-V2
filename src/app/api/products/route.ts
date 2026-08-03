import { NextResponse } from "next/server";
import { fetchPublicProducts } from "@/lib/server-data";

// Product shaping (public field stripping, is_low_stock computation) lives
// in @/lib/server-data so the server-rendered homepage and this route
// return exactly the same shape.

export async function GET() {
  try {
    const publicProducts = await fetchPublicProducts();
    return NextResponse.json(publicProducts);
  } catch (error) {
    console.error("GET /api/products error:", error);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}
