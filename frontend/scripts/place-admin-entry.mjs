// Moves the built admin entry (dist/admin.html) to dist/adm/index.html so the
// console is served at /adm/ on production and /dev/adm/ on Dev. Asset URLs are
// already absolute to the build base, so only the file location changes.
import fs from 'node:fs';
import path from 'node:path';

const dist = path.resolve('dist');
const source = path.join(dist, 'admin.html');

if (!fs.existsSync(source)) {
  throw new Error(`Missing ${source}. Run the Vite build before placing the admin entry.`);
}

const destinationDir = path.join(dist, 'adm');
fs.mkdirSync(destinationDir, { recursive: true });
fs.renameSync(source, path.join(destinationDir, 'index.html'));

console.log('Placed admin console at dist/adm/index.html');
