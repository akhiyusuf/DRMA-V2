require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { realtime: { transport: ws } });

async function cleanup() {
  const { data: media, error } = await supabase.from('media').select('*');
  if (error) { console.error(error); return; }
  
  const seen = new Set();
  const toDelete = [];
  
  for (const m of media) {
    if (seen.has(m.public_url)) {
      toDelete.push(m.id);
    } else {
      seen.add(m.public_url);
    }
  }
  
  if (toDelete.length > 0) {
    await supabase.from('media').delete().in('id', toDelete);
    console.log("Deleted " + toDelete.length + " duplicate media records.");
  } else {
    console.log('No duplicates found.');
  }
}
cleanup();
