/**
 * Generate PWA icons with dark background + cyan border + centered logo
 * Matches the "lapkin" style app icon design
 */
const sharp = require('sharp');
const path = require('path');

const SIZES = [192, 512];
const BG_COLOR = { r: 26, g: 35, b: 50, alpha: 255 };    // #1a2332 dark navy
const BORDER_COLOR = '#00c8d4';  // cyan/teal border
const BORDER_WIDTH_RATIO = 0.02; // border thickness as ratio of icon size
const CORNER_RADIUS_RATIO = 0.22; // rounded corner ratio

async function generateIcon(size) {
  const borderWidth = Math.max(2, Math.round(size * BORDER_WIDTH_RATIO));
  const cornerRadius = Math.round(size * CORNER_RADIUS_RATIO);
  const logoSize = Math.round(size * 0.55); // logo takes ~55% of icon
  const logoOffset = Math.round((size - logoSize) / 2);

  // Create SVG for the rounded rectangle background with cyan border
  const bgSvg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="borderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#00e5ff;stop-opacity:0.9" />
          <stop offset="50%" style="stop-color:#00b8d4;stop-opacity:0.7" />
          <stop offset="100%" style="stop-color:#00e5ff;stop-opacity:0.9" />
        </linearGradient>
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#1e2d3d" />
          <stop offset="100%" style="stop-color:#141e2b" />
        </linearGradient>
      </defs>
      <!-- Outer rounded rect (border) -->
      <rect x="0" y="0" width="${size}" height="${size}" rx="${cornerRadius}" ry="${cornerRadius}" fill="url(#borderGrad)" />
      <!-- Inner rounded rect (background) -->
      <rect x="${borderWidth}" y="${borderWidth}" width="${size - borderWidth * 2}" height="${size - borderWidth * 2}" rx="${cornerRadius - borderWidth}" ry="${cornerRadius - borderWidth}" fill="url(#bgGrad)" />
    </svg>`;

  // Resize the logo with circular transparency preserved
  const logoResized = await sharp(path.join(__dirname, 'public', 'new_logo_pwa.png'))
    .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  // Create base with SVG background, then composite logo on top
  const icon = await sharp(Buffer.from(bgSvg))
    .png()
    .toBuffer();

  const result = await sharp(icon)
    .composite([
      {
        input: logoResized,
        left: logoOffset,
        top: logoOffset,
      }
    ])
    .png()
    .toFile(path.join(__dirname, 'public', `pwa-icon-${size}x${size}.png`));

  console.log(`✅ Generated pwa-icon-${size}x${size}.png`);
  return result;
}

async function main() {
  console.log('🎨 Generating PWA icons...');
  for (const size of SIZES) {
    await generateIcon(size);
  }
  // Also generate apple-touch-icon (180x180)
  await generateIcon(180);
  console.log('🎉 All PWA icons generated!');
}

main().catch(console.error);
