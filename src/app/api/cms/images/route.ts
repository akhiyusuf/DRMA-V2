import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabase/admin';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin.from('media').select('public_url');
    if (error) throw error;
    return NextResponse.json(data.map(m => m.public_url));
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to list images' }, { status: 500 });
  }
}
