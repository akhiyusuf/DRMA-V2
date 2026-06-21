import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/utils/supabase/admin";
import { revalidatePath } from "next/cache";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");

  try {
    if (type === "products") {
      const { data: products, error } = await supabaseAdmin
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return NextResponse.json(products);
    }

    // Homepage data
    const { data: homepage, error: hpError } = await supabaseAdmin
      .from("cms_homepage")
      .select("*")
      .single();
    
    const { data: diffPoints, error: diffError } = await supabaseAdmin
      .from("cms_differentiation_points")
      .select("*")
      .order("display_order", { ascending: true });
    
    const { data: featured, error: featError } = await supabaseAdmin
      .from("cms_featured_products")
      .select("product_id");

    return NextResponse.json({
      hero: {
        title: homepage?.hero_title || "",
        description: homepage?.hero_description || "",
        collectionLabel: homepage?.hero_collection_label || "",
        buttonLabel: homepage?.hero_button_label || "Shop Now",
        ctaUrl: homepage?.hero_cta_url || "/shop",
        image: homepage?.hero_image_id || "",
      },
      mission: {
        label: homepage?.mission_label || "",
        title: homepage?.mission_title || "",
        description: homepage?.mission_description || "",
        buttonLabel: homepage?.mission_button_label || "Learn More",
        ctaUrl: homepage?.mission_cta_url || "#",
        image: homepage?.mission_image_id || "",
      },
      differentiation: {
        label: homepage?.differentiation_label || "",
        title: homepage?.differentiation_title || "",
        points: diffPoints || [],
      },
      featuredProductIds: (featured || []).map((f: any) => f.product_id),
    });
  } catch (error) {
    console.error("GET /api/cms/content error:", error);
    return NextResponse.json({ error: "Failed to read data" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { type, data } = await request.json();

    if (type === "products") {
      const productsToSave = Array.isArray(data) ? data : [data];
      
      for (const product of productsToSave) {
        const { error } = await supabaseAdmin
          .from("products")
          .upsert({
            id: product.id,
            name: product.name,
            price: product.price,
            description: product.description || "",
            category: product.category || "",
            tags: product.tags || [],
            images: product.images || [],
            variations: product.variations || { sizes: [], colors: [], materials: [] },
            in_stock: product.inStock ?? true,
          }, { onConflict: "id" });
        
        if (error) throw error;
      }
    } else {
      // Homepage data
      const { error: hpError } = await supabaseAdmin
        .from("cms_homepage")
        .upsert({
          id: 1,
          hero_title: data.hero?.title || "",
          hero_description: data.hero?.description || "",
          hero_collection_label: data.hero?.collectionLabel || "",
          hero_button_label: data.hero?.buttonLabel || "Shop Now",
          hero_cta_url: data.hero?.ctaUrl || "/shop",
          hero_image_id: data.hero?.image || "",
          mission_label: data.mission?.label || "",
          mission_title: data.mission?.title || "",
          mission_description: data.mission?.description || "",
          mission_button_label: data.mission?.buttonLabel || "Learn More",
          mission_cta_url: data.mission?.ctaUrl || "#",
          mission_image_id: data.mission?.image || "",
          differentiation_label: data.differentiation?.label || "",
          differentiation_title: data.differentiation?.title || "",
        }, { onConflict: "id" });
      
      if (hpError) throw hpError;

      // Save differentiation points
      if (data.differentiation?.points?.length > 0) {
        // Delete existing
        await supabaseAdmin.from("cms_differentiation_points").delete().neq("id", 0);
        // Insert new
        const points = data.differentiation.points.map((p: any, i: number) => ({
          number: p.number || String(i + 1),
          title: p.title || "",
          description: p.description || "",
          display_order: i,
        }));
        const { error: diffError } = await supabaseAdmin
          .from("cms_differentiation_points")
          .insert(points);
        if (diffError) throw diffError;
      }

      // Save featured products
      if (data.featuredProductIds) {
        await supabaseAdmin.from("cms_featured_products").delete().neq("product_id", "");
        if (data.featuredProductIds.length > 0) {
          const featured = data.featuredProductIds.map((pid: string, i: number) => ({
            product_id: pid,
            display_order: i,
          }));
          const { error: featError } = await supabaseAdmin
            .from("cms_featured_products")
            .insert(featured);
          if (featError) throw featError;
        }
      }
    }

    // Revalidate pages
    revalidatePath("/");
    revalidatePath("/shop");
    revalidatePath("/cms/dashboard");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/cms/content error:", error);
    return NextResponse.json({ error: "Failed to save data" }, { status: 500 });
  }
}
