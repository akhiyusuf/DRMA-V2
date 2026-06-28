import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { requireCmsAuth } from '@/utils/cms-auth';

export async function POST(request: NextRequest) {
  // Auth required: image uploads are CMS-only operations
  const authError = requireCmsAuth(request);
  if (authError) return authError;

  const data = await request.formData();
  const file: File | null = data.get('file') as unknown as File;

  if (!file) {
    return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const fileName = `${Date.now()}-${file.name}`;

  try {
    const { error: uploadError } = await supabaseAdmin.storage.from('media').upload(fileName, buffer, {
        contentType: file.type
    });
    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabaseAdmin.storage.from('media').getPublicUrl(fileName);
    
    try {
      await supabaseAdmin.from('media').insert({ file_path: fileName, public_url: publicUrl });
    } catch (e) {
      // Ignore if media table doesn't exist
      console.log('Media table insert skipped');
    }

    return NextResponse.json({ success: true, path: publicUrl, fileName });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ success: false, error: 'Failed to upload' }, { status: 500 });
  }
}
