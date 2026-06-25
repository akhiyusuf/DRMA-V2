import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/utils/supabase/admin";
import ProductView from "./ProductView";

/**
 * Server component wrapper for the product detail page.
 *
 * Owns `generateMetadata` so each product gets its own unique <title> and
 * <meta name="description"> — sourced from the CMS-editable `page_title`
 * and `meta_description` columns on the products table. When those fields
 * are NULL/empty, the page falls back to `${name} | DRMA` so legacy
 * products keep working without a manual backfill.
 */

const BRAND_SUFFIX = " | DRMA";

async function fetchProduct(id: string) {
  const { data, error } = await supabaseAdmin
    .from("products")
    .select("id, name, page_title, meta_description, description")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("generateMetadata: supabase error", error);
    return null;
  }
  return data;
}

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const product = await fetchProduct(id);

  if (!product) {
    return {
      title: "Product Not Found" + BRAND_SUFFIX,
      description: "The product you are looking for could not be found.",
    };
  }

  const title =
    product.page_title && product.page_title.trim() !== ""
      ? product.page_title.trim()
      : `${product.name}${BRAND_SUFFIX}`;

  const description =
    product.meta_description && product.meta_description.trim() !== ""
      ? product.meta_description.trim()
      : (product.description?.slice(0, 160) ?? title);

  return {
    // `absolute` opts out of the root layout's "%s | DRMA" template — the
    // CMS-supplied page_title already includes the brand suffix when the
    // store owner wants it (and the fallback above appends it explicitly).
    title: { absolute: title },
    description,
    openGraph: {
      title,
      description,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function ProductPage({ params }: Params) {
  const { id } = await params;
  const product = await fetchProduct(id);
  if (!product) notFound();
  return <ProductView id={id} />;
}
