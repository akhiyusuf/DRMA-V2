import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

const supabase = createAdminClient();

// ---- GET ----
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');

  try {
    if (type === 'products') {
      const { data, error } = await supabase.from('products').select('*');
      if (error) throw error;
      // Map database field 'in_stock' to frontend-friendly 'inStock'
      return NextResponse.json(data.map((p) => ({ ...p, inStock: p.in_stock })));
    }

    // Homepage data
    const { data: home, error: homeError } = await supabase
      .from('cms_homepage')
      .select(`
        hero_title, hero_description, mission_title, mission_description,
        hero_image:media!hero_image_id(public_url),
        mission_image:media!mission_image_id(public_url)
      `)
      .eq('id', 1)
      .single();
    if (homeError) throw homeError;

    const { data: featured, error: featError } = await supabase
      .from('cms_featured_products')
      .select('product_id')
      .order('display_order');
    if (featError) throw featError;

    const { data: diff, error: diffError } = await supabase
      .from('cms_differentiation_points')
      .select('*')
      .order('display_order');
    if (diffError) throw diffError;

    return NextResponse.json({
      hero: {
        title: home.hero_title,
        description: home.hero_description,
        image: home.hero_image?.[0]?.public_url || '',
      },
      mission: {
        title: home.mission_title,
        description: home.mission_description,
        image: home.mission_image?.[0]?.public_url || '',
      },
      differentiation: { points: diff },
      featuredProductIds: featured.map((f) => f.product_id),
    });
  } catch (error) {
    console.error('GET /api/cms/content error:', error);
    return NextResponse.json({ error: 'Failed to read data' }, { status: 500 });
  }
}

// ---- POST ----
export async function POST(request: Request) {
  try {
    const { type, data } = await request.json();

    // Helper: get media ID from public URL (create if missing?)
    const getMediaId = async (url: string | null | undefined): Promise<number | null> => {
      if (!url) return null;
      const { data: media } = await supabase
        .from('media')
        .select('id')
        .eq('public_url', url)
        .single();
      return media?.id ?? null;
    };

    if (type === 'products') {
      // Upsert a single product
      const { error } = await supabase.from('products').upsert({
        id: data.id,
        name: data.name,
        price: data.price,
        description: data.description,
        category: data.category,
        tags: data.tags,
        in_stock: data.inStock,
      });
      if (error) throw error;
    } else {
      // Save homepage content
      const heroImageId = await getMediaId(data.hero?.image);
      const missionImageId = await getMediaId(data.mission?.image);

      // Upsert homepage record
      const { error: homeError } = await supabase.from('cms_homepage').upsert({
        id: 1,
        hero_title: data.hero?.title ?? '',
        hero_description: data.hero?.description ?? '',
        hero_image_id: heroImageId,
        mission_title: data.mission?.title ?? '',
        mission_description: data.mission?.description ?? '',
        mission_image_id: missionImageId,
      });
      if (homeError) throw homeError;

      // Update featured products (replace all)
      const { error: deleteFeatError } = await supabase
        .from('cms_featured_products')
        .delete()
        .neq('product_id', 'none'); // delete all rows
      if (deleteFeatError) throw deleteFeatError;

      if (data.featuredProductIds?.length) {
        const featuredInserts = data.featuredProductIds.map((pid: string, i: number) => ({
          product_id: pid,
          display_order: i,
        }));
        const { error: insertFeatError } = await supabase
          .from('cms_featured_products')
          .insert(featuredInserts);
        if (insertFeatError) throw insertFeatError;
      }

      // Update differentiation points (replace all)
      const { error: deleteDiffError } = await supabase
        .from('cms_differentiation_points')
        .delete()
        .neq('id', -1);
      if (deleteDiffError) throw deleteDiffError;

      if (data.differentiation?.points?.length) {
        const diffInserts = data.differentiation.points.map((p: any, i: number) => ({
          ...p,
          display_order: i,
        }));
        const { error: insertDiffError } = await supabase
          .from('cms_differentiation_points')
          .insert(diffInserts);
        if (insertDiffError) throw insertDiffError;
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('POST /api/cms/content error:', error);
    return NextResponse.json({ error: 'Failed to save data' }, { status: 500 });
  }
}
