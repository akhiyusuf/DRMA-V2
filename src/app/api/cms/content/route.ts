import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

const supabase = createAdminClient();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  
  try {
    if (type === 'products') {
      const { data, error } = await supabase.from('products').select('*');
      if (error) throw error;
      // Map 'in_stock' to 'inStock'
      return NextResponse.json(data.map(p => ({ ...p, inStock: p.in_stock })));
    } else {
      // Homepage data
      const { data: home, error: homeError } = await supabase.from('cms_homepage').select(`
        hero_title, hero_description, mission_title, mission_description,
        hero_image:media!hero_image_id(public_url),
        mission_image:media!mission_image_id(public_url)
      `).eq('id', 1).single();
      if (homeError) throw homeError;

      const { data: featured, error: featError } = await supabase.from('cms_featured_products').select('product_id').order('display_order');
      if (featError) throw featError;

      const { data: diff, error: diffError } = await supabase.from('cms_differentiation_points').select('*').order('display_order');
      if (diffError) throw diffError;

      return NextResponse.json({
        hero: {
          title: home.hero_title,
          description: home.hero_description,
          image: home.hero_image?.[0]?.public_url || ''
        },
        mission: {
          title: home.mission_title,
          description: home.mission_description,
          image: home.mission_image?.public_url || ''
        },
        differentiation: { points: diff },
        featuredProductIds: featured.map(f => f.product_id)
      });
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to read data' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { type, data } = await request.json();
  
  try {
    if (type === 'products') {
      const { error } = await supabase.from('products').upsert({
        id: data.id,
        name: data.name,
        price: data.price,
        description: data.description,
        category: data.category,
        tags: data.tags,
        in_stock: data.inStock
      });
      if (error) throw error;
    } else {
      // Save homepage logic
      // Helper to update/insert image record to get ID
      async function getMediaId(url) {
          if (!url) return null;
          const { data: media } = await supabase.from('media').select('id').eq('public_url', url).single();
          return media ? media.id : null;
      }

      const heroImageId = await getMediaId(data.hero.image);
      const missionImageId = await getMediaId(data.mission.image);

      await supabase.from('cms_homepage').upsert({
        id: 1,
        hero_title: data.hero.title,
        hero_description: data.hero.description,
        hero_image_id: heroImageId,
        mission_title: data.mission.title,
        mission_description: data.mission.description,
        mission_image_id: missionImageId
      });

      // Featured products
      await supabase.from('cms_featured_products').delete().neq('product_id', 'none');
      for (const [i, pid] of data.featuredProductIds.entries()) {
        await supabase.from('cms_featured_products').insert({ product_id: pid, display_order: i });
      }

      // Diff points
      await supabase.from('cms_differentiation_points').delete().neq('id', -1);
      for (const [i, p] of data.differentiation.points.entries()) {
        await supabase.from('cms_differentiation_points').insert({ ...p, display_order: i });
      }
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to save data' }, { status: 500 });
  }
}
