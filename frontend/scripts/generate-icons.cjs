const sharp = require('sharp');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');
const sourcePath = path.join(publicDir, 'landing-logo-circle.png');

const sizes = [
  { name: 'cmg-logo-circle.png', size: 1024 },
  { name: 'favicon-16x16.png', size: 16 },
  { name: 'favicon-32x32.png', size: 32 },
  { name: 'icon-192x192.png', size: 192 },
  { name: 'icon-512x512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'og-logo.png', size: 600 },
];

async function generate() {
  for (const { name, size } of sizes) {
    const outputPath = path.join(publicDir, name);
    await sharp(sourcePath)
      .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .png()
      .toFile(outputPath);
    console.log(`✅ Generated ${name} (${size}x${size}) from landing-logo-circle.png`);
  }
  console.log('\n🎉 All icons generated from the supplied circular logo!');
}

generate().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
