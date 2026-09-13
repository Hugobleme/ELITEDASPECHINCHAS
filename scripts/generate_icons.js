const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// SVG de alta resolução da chama da Elite das Pechinchas com fundo degradê laranja
const svgIcon = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ea580c"/>
      <stop offset="50%" stop-color="#f97316"/>
      <stop offset="100%" stop-color="#fbbf24"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="16" flood-color="#000000" flood-opacity="0.25"/>
    </filter>
  </defs>
  
  <!-- Fundo com Cantos Arredondados Elegantes -->
  <rect width="512" height="512" rx="128" fill="url(#bgGrad)"/>
  
  <!-- Ícone da Chama (Flame) Centralizado em Branco Puro -->
  <g transform="translate(106, 86) scale(12.5)" filter="url(#shadow)">
    <path 
      d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" 
      fill="#ffffff" 
      stroke="#ffffff" 
      stroke-width="0.8" 
      stroke-linejoin="round"
    />
  </g>
</svg>
`;

async function generate() {
  const publicDir = path.join(__dirname, '..', 'public');
  const svgBuffer = Buffer.from(svgIcon);

  // 1. icon-512x512.png
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'icon-512x512.png'));
  console.log('✓ icon-512x512.png gerado');

  // 2. icon-192x192.png
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'icon-192x192.png'));
  console.log('✓ icon-192x192.png gerado');

  // 3. apple-touch-icon.png (180x180)
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('✓ apple-touch-icon.png gerado');

  // 4. badge-72x72.png (para Web Push)
  await sharp(svgBuffer)
    .resize(72, 72)
    .png()
    .toFile(path.join(publicDir, 'badge-72x72.png'));
  console.log('✓ badge-72x72.png gerado');

  // 5. favicon.ico (32x32)
  await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toFile(path.join(publicDir, 'favicon.ico'));
  console.log('✓ favicon.ico gerado');
}

generate().catch(console.error);
