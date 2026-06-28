import { MetadataRoute } from "next";
import { supabaseAdmin } from "@/utils/supabase/admin";

/**
 * Dynamic sitemap generator (MED-03 fix).
 *
 * Generates /sitemap.xml at request time, including:
 *   - All static public pages (homepage, shop, about, ethics, legal)
 *   - All individual product detail pages
 *
 * This is the Next.js 16 native approach (MetadataRoute.Sitemap),
 * which replaces the static public/sitemap.xml file. No external
 * dependencies (next-sitemap) required.
 *
 * The static public/sitemap.xml is kept as a fallback for crawlers
 * that don't execute dynamic routes; Next.js serves the dynamic
 * version at /sitemap.xml with higher priority.
 */
const BASE_URL = "https://drma-v2.vercel.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];

  // ── Static pages ──
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/shop`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/ethics`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/privacy`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/terms`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
  entries.push(...staticPages);

  // ── Dynamic product pages ──
  try {
    const { data: products, error } = await supabaseAdmin
      .from("products")
      .select("id, updated_at")
      .order("updated_at", { ascending: false });

    if (!error && products) {
      for (const product of products) {
        entries.push({
          url: `${BASE_URL}/product/${product.id}`,
          lastModified: product.updated_at
            ? new Date(product.updated_at)
            : new Date(),
          changeFrequency: "weekly",
          priority: 0.7,
        });
      }
    }
  } catch (error) {
    // If DB is unavailable, return static-only sitemap (already populated)
    console.error("sitemap.ts: failed to fetch products:", error);
  }

  return entries;
}
