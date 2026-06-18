import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

const supabase = createAdminClient();

export async function POST(request: Request) {
  const { imageUrl } = await request.json();
  if (!imageUrl) {
    return NextResponse.json({ success: false, error: 'No image URL provided' }, { status: 400 });
  }

  try {
    // 1. Get file path from media table
    const { data: media, error: findError } = await supabase
      .from('media')
      .select('id, file_path')
      .eq('public_url', imageUrl)
      .single();
    
    if (findError) throw findError;

    // 2. Delete from storage
    const { error: storageError } = await supabase.storage.from('media').remove([media.file_path]);
    if (storageError) throw storageError;

    // 3. Delete from media table
    const { error: dbError } = await supabase.from('media').delete().eq('id', media.id);
    if (dbError) throw dbError;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: 'Failed to delete image' }, { status: 500 });
  }
}
