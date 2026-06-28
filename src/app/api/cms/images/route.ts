import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { requireCmsAuth } from '@/utils/cms-auth';

export async function GET(request: NextRequest) {
  // Auth required: full media library listing is a CMS-only operation
  const authError = requireCmsAuth(request);
  if (authError) return authError;

  try {
    const { data, error } = await supabaseAdmin.from('media').select('public_url');
    if (error) throw error;
    return NextResponse.json(data.map(m => m.public_url));
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to list images' }, { status: 500 });
  }
}
