const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

async function convertImage(inputFile) {
  const inputPath = path.join(__dirname, 'public', inputFile);
  const parsed = path.parse(inputPath);
  const outputPath = path.join(__dirname, 'public', `${parsed.name}.webp`);

  if (!fs.existsSync(inputPath)) {
    console.error(`File not found: ${inputPath}`);
    return;
  }

  try {
    await sharp(inputPath)
      .webp({ quality: 80 })
      .toFile(outputPath);
    console.log(`Converted ${inputFile} to ${parsed.name}.webp successfully.`);
  } catch (err) {
    console.error(`Error converting ${inputFile}:`, err);
  }
}

async function main() {
  await convertImage('hero-building.png');
  await convertImage('Gambar Langit manda.png');
}

main();
