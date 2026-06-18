const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const directory = './public/images';
const MAX_SIZE_BYTES = 800 * 1024; // 800KB

async function compressImages() {
  const files = fs.readdirSync(directory);

  for (const file of files) {
    const filePath = path.join(directory, file);
    const stats = fs.statSync(filePath);

    if (stats.size > MAX_SIZE_BYTES) {
      console.log(`Processing ${file} (${(stats.size / 1024).toFixed(2)} KB)...`);
      
      const ext = path.extname(file).toLowerCase();
      let pipeline = sharp(filePath);

      if (ext === '.png') {
        pipeline = pipeline.png({ compressionLevel: 9, palette: true });
      } else if (ext === '.jpg' || ext === '.jpeg') {
        pipeline = pipeline.jpeg({ quality: 60, mozjpeg: true });
      } else {
        continue; // Skip unsupported formats
      }

      try {
        const compressedBuffer = await pipeline.toBuffer();
        
        if (compressedBuffer.length < stats.size) {
            fs.writeFileSync(filePath, compressedBuffer);
            const newSize = fs.statSync(filePath).size;
            console.log(`Done! Reduced to: ${(newSize / 1024).toFixed(2)} KB`);
        } else {
            console.log(`Skipped: Compression did not reduce size.`);
        }
      } catch (err) {
        console.error(`Error processing ${file}:`, err);
      }
    }
  }
}

compressImages();
