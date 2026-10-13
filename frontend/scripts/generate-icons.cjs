const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');
const svgPath = path.join(publicDir, 'favicon.svg');

// Read the SVG
const svgBuffer = fs.readFileSync(svgPath);

const sizes = [
  { name: 'favicon-16x16.png', size: 16 },
  { name: 'favicon-32x32.png', size: 32 },
  { name: 'icon-192x192.png', size: 192 },
  { name: 'icon-512x512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'og-logo.png', size: 600 },  // For Open Graph / Google
];

async function generate() {
  for (const { name, size } of sizes) {
    const outputPath = path.join(publicDir, name);
    await sharp(svgBuffer)
      .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .png()
      .toFile(outputPath);
    console.log(`✅ Generated ${name} (${size}x${size})`);
  }
  console.log('\n🎉 All icons generated successfully!');
}

generate().catch(console.error);
