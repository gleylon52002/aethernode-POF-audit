const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
const version = pkg.version;
const now = new Date();
const pad = (n) => String(n).padStart(2, '0');
const stamp = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
const zipName = `AetherNode-POF-v${version}-${stamp}.zip`;
const destDir = 'D:/BrowserYedekler';
const fallbackDir = path.join(__dirname, '..');
const source = 'C:/Users/Mehmet/Desktop/projelerim/browser';
let zipPath = path.join(destDir, zipName);

const exclude = new Set(['node_modules','dist','dist-electron','release','.git','.aether-backup','.vite','coverage']);

let useFallback = false;
try {
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
    console.log('Dizin olusturuldu:', destDir);
  }
  if (!fs.existsSync('D:/')) {
    throw new Error('D surucusu yok');
  }
  // Test write
  const testFile = path.join(destDir, '.write_test');
  fs.writeFileSync(testFile, 'test');
  fs.unlinkSync(testFile);
} catch (e) {
  console.log(`D:/ yazilamadi (${e.message}), fallback: ${fallbackDir}`);
  useFallback = true;
  zipPath = path.join(fallbackDir, zipName);
}

const zip = new AdmZip();

function addDir(dir, zipPrefix) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (exclude.has(e.name)) continue;
    const full = path.join(dir, e.name);
    const rel = path.join(zipPrefix, e.name);
    if (e.isDirectory()) {
      addDir(full, rel);
    } else {
      // Skip zip itself if inside source
      if (full === zipPath) continue;
      zip.addLocalFile(full, path.dirname(rel));
    }
  }
}

console.log('Dosyalar ekleniyor...');
addDir(source, '');

console.log('Zip yaziliyor:', zipPath);
zip.writeZip(zipPath);

const stat = fs.statSync(zipPath);
console.log(`YEDEK OK: ${zipPath} (${(stat.size/1024/1024).toFixed(2)} MB)`);
const listDir = useFallback ? fallbackDir : destDir;
console.log('Mevcut yedekler:');
try {
  fs.readdirSync(listDir).filter(f => f.startsWith('AetherNode-POF-')).forEach(f => {
    const s = fs.statSync(path.join(listDir, f));
    console.log(` - ${f} (${(s.size/1024/1024).toFixed(2)} MB)`);
  });
} catch {}
if (useFallback) console.log('NOT: D:/ yazilamadigi icin yedek proje kokune yazildi, lutfen D:/BrowserYedekler/ altina tasiyin');
