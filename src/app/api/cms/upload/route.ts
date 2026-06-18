import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

const supabase = createAdminClient();

export async function POST(request: Request) {
  const data = await request.formData();
  const file: File | null = data.get('file') as unknown as File;

  if (!file) {
    return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const fileName = `${Date.now()}-${file.name}`;

  try {
    const { error: uploadError } = await supabase.storage.from('media').upload(fileName, buffer, {
        contentType: file.type
    });
    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(fileName);
    
    await supabase.from('media').insert({ file_path: fileName, public_url: publicUrl });

    return NextResponse.json({ success: true, path: publicUrl });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: 'Failed to upload' }, { status: 500 });
  }
}
