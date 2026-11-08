// Dev-only install identity.
//
// Runs after the staging-web build and rewrites ONLY the built output in dist/:
//   - home-screen icons are replaced with DEV-badged copies from scripts/dev-icons/
//   - the manifest name and short name are changed to "Dev" names
//   - the iPhone home-screen title is changed to "CMG Dev"
//
// Source files in public/ are never modified, and this script never runs for the
// production build (npm run build), so production keeps its icons and names.
import fs from 'node:fs';
import path from 'node:path';

const modeArg = process.argv.find((arg) => arg.startsWith('--mode='));
const mode = modeArg ? modeArg.slice('--mode='.length) : 'production';

if (mode !== 'staging-web') {
  console.error(`dev-install-identity refuses to run for mode "${mode}". It is for the Dev build only.`);
  process.exit(1);
}

const dist = path.resolve('dist');
const iconsDir = path.resolve('scripts/dev-icons');
const indexPath = path.join(dist, 'index.html');
const manifestPath = path.join(dist, 'manifest.json');

for (const required of [indexPath, manifestPath]) {
  if (!fs.existsSync(required)) {
    throw new Error(`Missing build output: ${required}. Run the staging-web build first.`);
  }
}

const iconFiles = ['icon-192x192-v3.png', 'icon-512x512-v3.png', 'apple-touch-icon-v3.png'];
for (const file of iconFiles) {
  const source = path.join(iconsDir, file);
  if (!fs.existsSync(source)) throw new Error(`Missing DEV icon: ${source}`);
  fs.copyFileSync(source, path.join(dist, file));
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
manifest.name = 'Christian Match Ghana Dev';
manifest.short_name = 'CMG Dev';
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

const html = fs.readFileSync(indexPath, 'utf8');
const titlePattern = /(<meta name="apple-mobile-web-app-title" content=")[^"]*(")/;
if (!titlePattern.test(html)) {
  throw new Error('apple-mobile-web-app-title meta tag not found in dist/index.html');
}
fs.writeFileSync(indexPath, html.replace(titlePattern, '$1CMG Dev$2'));

console.log('Applied Dev install identity: DEV icons, "CMG Dev" names. Production is unaffected.');
