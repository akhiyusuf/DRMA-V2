import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

const supabase = createAdminClient();

export async function GET() {
  try {
    const { data, error } = await supabase.from('media').select('public_url');
    if (error) throw error;
    return NextResponse.json(data.map(m => m.public_url));
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to list images' }, { status: 500 });
  }
}
