/**
 * Generate PWA icons for CetakRaport TK
 * Uses logo.png as the logo source with purple (#863bff) branding
 */
const sharp = require('sharp');
const path = require('path');

const SIZES = [192, 512, 180];
const BORDER_WIDTH_RATIO = 0.02;
const CORNER_RADIUS_RATIO = 0.22;

async function generateIcon(size) {
  const borderWidth = Math.max(2, Math.round(size * BORDER_WIDTH_RATIO));
  const cornerRadius = Math.round(size * CORNER_RADIUS_RATIO);
  const logoSize = Math.round(size * 0.55);
  const logoOffset = Math.round((size - logoSize) / 2);

  const bgSvg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="borderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#a855f7;stop-opacity:0.9" />
          <stop offset="50%" style="stop-color:#7c3aed;stop-opacity:0.7" />
          <stop offset="100%" style="stop-color:#a855f7;stop-opacity:0.9" />
        </linearGradient>
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#1a1028" />
          <stop offset="100%" style="stop-color:#0f0a1a" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="${size}" height="${size}" rx="${cornerRadius}" ry="${cornerRadius}" fill="url(#borderGrad)" />
      <rect x="${borderWidth}" y="${borderWidth}" width="${size - borderWidth * 2}" height="${size - borderWidth * 2}" rx="${cornerRadius - borderWidth}" ry="${cornerRadius - borderWidth}" fill="url(#bgGrad)" />
    </svg>`;

  const logoPath = 'd:\\Antigravity\\raportk\\public\\logo.png';
  const logoResized = await sharp(logoPath)
    .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const icon = await sharp(Buffer.from(bgSvg)).png().toBuffer();

  const outDir = 'd:\\Antigravity\\raportk\\public';

  await sharp(icon)
    .composite([{ input: logoResized, left: logoOffset, top: logoOffset }])
    .png()
    .toFile(path.join(outDir, `pwa-icon-${size}x${size}.png`));

  console.log(`✅ Generated pwa-icon-${size}x${size}.png`);
}

async function main() {
  console.log('🎨 Generating PWA icons for CetakRaport TK...');
  for (const size of SIZES) {
    await generateIcon(size);
  }
  console.log('🎉 All PWA icons generated!');
}

main().catch(console.error);
