const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const src = path.join(root, 'logo.png');
const dest1 = path.join(root, 'resources', 'icons', 'icon.png');
const dest2 = path.join(root, 'resources', 'icons', 'pof.png');
const dest3 = path.join(root, 'src', 'renderer', 'src', 'assets', 'logo.png');

for (const dest of [dest1, dest2, dest3]) {
  try {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
    console.log(`Copied ${src} -> ${dest}`);
  } catch (e) {
    console.error(`Copy failed ${dest}:`, e.message);
  }
}

// Try to generate ICO via png-to-ico if available, otherwise via System.Drawing fallback will be handled by PowerShell script
try {
  const pngToIco = require('png-to-ico');
  const icoBuf = require('fs').readFileSync(src);
  // png-to-ico expects array of png buffers
  // We'll generate 256, 48, 32, 16
  // For now just use single PNG as ICO (electron-builder will handle PNG anyway)
  console.log('png-to-ico available, but using PNG directly for electron-builder');
} catch (e) {
  console.log('png-to-ico not installed, using PNG directly');
}

console.log('Logo copy done');
