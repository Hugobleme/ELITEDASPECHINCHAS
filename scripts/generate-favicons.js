const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function generateFavicons() {
  const logoPath = path.join(__dirname, '..', 'public', 'logo.png');
  const publicDir = path.join(__dirname, '..', 'public');
  const appDir = path.join(__dirname, '..', 'src', 'app');

  console.log('Generating favicons from:', logoPath);

  // 1. icon-512x512.png
  await sharp(logoPath)
    .resize(512, 512, { fit: 'cover' })
    .png()
    .toFile(path.join(publicDir, 'icon-512x512.png'));
  console.log('Created icon-512x512.png');

  // 2. icon-192x192.png
  await sharp(logoPath)
    .resize(192, 192, { fit: 'cover' })
    .png()
    .toFile(path.join(publicDir, 'icon-192x192.png'));
  console.log('Created icon-192x192.png');

  // 3. apple-touch-icon.png (180x180)
  await sharp(logoPath)
    .resize(180, 180, { fit: 'cover' })
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('Created apple-touch-icon.png');

  // 4. badge-72x72.png
  await sharp(logoPath)
    .resize(72, 72, { fit: 'cover' })
    .png()
    .toFile(path.join(publicDir, 'badge-72x72.png'));
  console.log('Created badge-72x72.png');

  // 5. favicon-32x32.png and favicon.ico
  const buffer32 = await sharp(logoPath)
    .resize(32, 32, { fit: 'cover' })
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), buffer32);
  fs.writeFileSync(path.join(publicDir, 'favicon-32x32.png'), buffer32);
  console.log('Created favicon.ico & favicon-32x32.png');

  // 6. Next.js App Router icons in src/app/
  await sharp(logoPath)
    .resize(64, 64, { fit: 'cover' })
    .png()
    .toFile(path.join(appDir, 'icon.png'));
  console.log('Created src/app/icon.png');

  await sharp(logoPath)
    .resize(180, 180, { fit: 'cover' })
    .png()
    .toFile(path.join(appDir, 'apple-icon.png'));
  console.log('Created src/app/apple-icon.png');

  // 7. Generate a clean SVG favicon embedding the official logo
  const logoBase64 = fs.readFileSync(logoPath).toString('base64');
  const svgContent = `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <clipPath id="circleClip">
      <circle cx="256" cy="256" r="256" />
    </clipPath>
  </defs>
  <circle cx="256" cy="256" r="256" fill="#070709" />
  <image href="data:image/png;base64,${logoBase64}" width="512" height="512" clip-path="url(#circleClip)" />
</svg>`;

  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svgContent, 'utf8');
  console.log('Created public/favicon.svg with official logo');
}

generateFavicons()
  .then(() => console.log('All favicons successfully generated!'))
  .catch((err) => {
    console.error('Error generating favicons:', err);
    process.exit(1);
  });
