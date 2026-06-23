const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const sourceIcon = path.join(__dirname, 'public', 'pwa-icon-512x512.png');
const androidResDir = path.join(__dirname, 'android', 'app', 'src', 'main', 'res');

// Android adaptive icon sizes (foreground layer)
const mipmapSizes = {
  'mipmap-mdpi': 108,
  'mipmap-hdpi': 162,
  'mipmap-xhdpi': 216,
  'mipmap-xxhdpi': 324,
  'mipmap-xxxhdpi': 432,
};

// Regular launcher icon sizes
const launcherSizes = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
};

async function generateIcons() {
  console.log('Generating Android icons from:', sourceIcon);
  
  if (!fs.existsSync(sourceIcon)) {
    console.error('Source icon not found:', sourceIcon);
    process.exit(1);
  }

  for (const [folder, size] of Object.entries(launcherSizes)) {
    const outputDir = path.join(androidResDir, folder);
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    // ic_launcher.png (square with slight rounding handled by Android)
    await sharp(sourceIcon)
      .resize(size, size)
      .png()
      .toFile(path.join(outputDir, 'ic_launcher.png'));

    // ic_launcher_round.png (circular)
    const roundMask = Buffer.from(
      `<svg><circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="white"/></svg>`
    );
    await sharp(sourceIcon)
      .resize(size, size)
      .composite([{ input: roundMask, blend: 'dest-in' }])
      .png()
      .toFile(path.join(outputDir, 'ic_launcher_round.png'));

    console.log(`  ✓ ${folder}: ${size}x${size}px`);
  }

  // Generate foreground icons for adaptive icons
  for (const [folder, size] of Object.entries(mipmapSizes)) {
    const outputDir = path.join(androidResDir, folder);
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    // Adaptive icon foreground: icon centered in larger canvas with padding
    const iconSize = Math.round(size * 0.65); // 65% of canvas for the actual icon
    const padding = Math.round((size - iconSize) / 2);
    
    await sharp(sourceIcon)
      .resize(iconSize, iconSize)
      .extend({
        top: padding,
        bottom: size - iconSize - padding,
        left: padding,
        right: size - iconSize - padding,
        background: { r: 26, g: 35, b: 50, alpha: 0 } // transparent
      })
      .png()
      .toFile(path.join(outputDir, 'ic_launcher_foreground.png'));

    console.log(`  ✓ ${folder} foreground: ${size}x${size}px`);
  }

  console.log('\n✅ All Android icons generated successfully!');
}

generateIcons().catch(console.error);
