require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');
const fs = require('fs');
const path = require('path');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { realtime: { transport: ws } });

async function migrate() {
    console.log('Starting migration...');

    // 1. Load Data
    const productsData = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src/data/products.json'), 'utf8'));
    const homepageData = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src/data/cms/homepage.json'), 'utf8'));

    // 2. Upload Images to Storage
    const imageFiles = fs.readdirSync(path.join(process.cwd(), 'public/images')).filter(f => f.match(/\.(png|jpg|jpeg|svg|gif|webp)$/i));
    for (const file of imageFiles) {
        const filePath = path.join(process.cwd(), 'public/images', file);
        const fileContent = fs.readFileSync(filePath);
        
        const { data, error } = await supabase.storage.from('media').upload(file, fileContent, {
            upsert: true,
            contentType: 'image/' + file.split('.').pop()
        });

        if (error) console.error(`Error uploading ${file}:`, error);
        else {
            const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(file);
            await supabase.from('media').upsert({ file_path: file, public_url: publicUrl });
            console.log(`Uploaded ${file}`);
        }
    }

    // 3. Migrate Products
    for (const product of productsData) {
        const { error } = await supabase.from('products').upsert({
            id: product.id,
            name: product.name,
            price: product.price,
            description: product.description,
            category: product.category,
            tags: product.tags,
            in_stock: product.inStock
        });
        if (error) console.error(`Error upserting product ${product.id}:`, error);
    }

    // 4. Migrate Homepage
    // Helper to get image ID from public_url
    async function getImageId(url) {
        const path = url.split('/').pop();
        const { data } = await supabase.from('media').select('id').eq('file_path', path).single();
        return data ? data.id : null;
    }

    const heroImageId = await getImageId(homepageData.hero.image);
    const missionImageId = await getImageId(homepageData.mission.image);

    await supabase.from('cms_homepage').upsert({
        id: 1,
        hero_title: homepageData.hero.title,
        hero_description: homepageData.hero.description,
        hero_image_id: heroImageId,
        mission_title: homepageData.mission.title,
        mission_description: homepageData.mission.description,
        mission_image_id: missionImageId
    });

    // 5. Migrate Featured Products
    await supabase.from('cms_featured_products').delete().neq('product_id', '00000000-0000-0000-0000-000000000000');
    for (const [index, productId] of homepageData.featuredProductIds.entries()) {
        await supabase.from('cms_featured_products').insert({ product_id: productId, display_order: index });
    }

    // 6. Migrate Differentiation Points
    await supabase.from('cms_differentiation_points').delete().neq('id', -1);
    for (const [index, point] of homepageData.differentiation.points.entries()) {
        await supabase.from('cms_differentiation_points').insert({
            number: point.number,
            title: point.title,
            description: point.description,
            display_order: index
        });
    }

    console.log('Migration completed!');
}

migrate();
