const fs = require('fs');
const path = require('path');
const https = require('https');

const urls = [
    "https://qeyfzpbbukhnuiabrkef.supabase.co/storage/v1/object/public/media/atlas_kimono.png",
    "https://qeyfzpbbukhnuiabrkef.supabase.co/storage/v1/object/public/media/dune_trousers.png",
    "https://qeyfzpbbukhnuiabrkef.supabase.co/storage/v1/object/public/media/ethos_fabric.png",
    "https://qeyfzpbbukhnuiabrkef.supabase.co/storage/v1/object/public/media/hero_desktop_2.png",
    "https://qeyfzpbbukhnuiabrkef.supabase.co/storage/v1/object/public/media/hero_dunes.png",
    "https://qeyfzpbbukhnuiabrkef.supabase.co/storage/v1/object/public/media/hero_main.png",
    "https://qeyfzpbbukhnuiabrkef.supabase.co/storage/v1/object/public/media/hero_mobile_2.png",
    "https://qeyfzpbbukhnuiabrkef.supabase.co/storage/v1/object/public/media/hero_model.png",
    "https://qeyfzpbbukhnuiabrkef.supabase.co/storage/v1/object/public/media/hero_model_cutout.png",
    "https://qeyfzpbbukhnuiabrkef.supabase.co/storage/v1/object/public/media/hero_model_cutout_transparent.png",
    "https://qeyfzpbbukhnuiabrkef.supabase.co/storage/v1/object/public/media/hero_new_1_cutout.png",
    "https://qeyfzpbbukhnuiabrkef.supabase.co/storage/v1/object/public/media/lumina_hijab.png",
    "https://qeyfzpbbukhnuiabrkef.supabase.co/storage/v1/object/public/media/medina_skirt.png",
    "https://qeyfzpbbukhnuiabrkef.supabase.co/storage/v1/object/public/media/nomad_hijab.png",
    "https://qeyfzpbbukhnuiabrkef.supabase.co/storage/v1/object/public/media/oasis_abaya.png",
    "https://qeyfzpbbukhnuiabrkef.supabase.co/storage/v1/object/public/media/petra_undercap.png",
    "https://qeyfzpbbukhnuiabrkef.supabase.co/storage/v1/object/public/media/sahara_dress.png",
    "https://qeyfzpbbukhnuiabrkef.supabase.co/storage/v1/object/public/media/serene_knit.png",
    "https://qeyfzpbbukhnuiabrkef.supabase.co/storage/v1/object/public/media/1781797656125-hero_main.png",
    "https://qeyfzpbbukhnuiabrkef.supabase.co/storage/v1/object/public/media/1781800281848-mountain_sunrise_warm.png"
];

const targetDir = './public/images';

async function downloadFile(url) {
    const filename = path.basename(url);
    const dest = path.join(targetDir, filename);
    
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, (response) => {
            response.pipe(file);
            file.on('finish', () => {
                file.close(resolve);
            });
        }).on('error', (err) => {
            fs.unlink(dest, () => reject(err));
        });
    });
}

async function run() {
    for (const url of urls) {
        console.log(`Downloading ${url}...`);
        try {
            await downloadFile(url);
            console.log(`Finished ${path.basename(url)}`);
        } catch (err) {
            console.error(`Failed ${url}:`, err);
        }
    }
}

run();
