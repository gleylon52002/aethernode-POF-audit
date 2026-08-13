const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'logo.png');
const outIcon = path.join(__dirname, '..', 'resources', 'icons', 'icon.ico');
const outPof = path.join(__dirname, '..', 'resources', 'icons', 'pof.ico');

if (!fs.existsSync(src)) {
  console.error('logo.png not found:', src);
  process.exit(1);
}

const pngBuf = fs.readFileSync(src);
console.log(`logo.png: ${pngBuf.length} bytes`);

// Try to generate multi-size ICO via sharp + png-to-ico if available, fallback to single PNG ICO
async function generate() {
  let pngToIco = null;
  let sharp = null;
  try { const m = require('png-to-ico'); pngToIco = m.default || m; } catch {}
  try { sharp = require('sharp'); } catch {}

  let icoBuf;
  if (pngToIco && sharp) {
    console.log('Generating multi-size ICO (16,32,48,256) via sharp + png-to-ico');
    const sizes = [16, 32, 48, 256];
    const pngs = await Promise.all(sizes.map(async (s) => {
      return await sharp(pngBuf).resize(s, s, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
    }));
    icoBuf = await pngToIco(pngs);
  } else {
    console.log('sharp/png-to-ico not available, generating single-size ICO (256) via header');
    if (pngToIco && !sharp) {
      // png-to-ico can also handle single PNG without sharp (will embed as 256)
      icoBuf = await pngToIco([pngBuf]);
    } else {
      const header = Buffer.alloc(6);
      header.writeUInt16LE(0, 0);
      header.writeUInt16LE(1, 2);
      header.writeUInt16LE(1, 4);
      const entry = Buffer.alloc(16);
      entry[0] = 0; entry[1] = 0; entry[2] = 0; entry[3] = 0;
      entry.writeUInt16LE(1, 4);
      entry.writeUInt16LE(32, 6);
      entry.writeUInt32LE(pngBuf.length, 8);
      entry.writeUInt32LE(22, 12);
      icoBuf = Buffer.concat([header, entry, pngBuf]);
    }
  }

  for (const out of [outIcon, outPof]) {
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, icoBuf);
    console.log(`Wrote ${out} (${icoBuf.length} bytes)`);
    const stat = fs.statSync(out);
    console.log(` - ${path.basename(out)}: ${stat.size} bytes`);
    // Verify ICO header
    const hdr = fs.readFileSync(out).subarray(0, 6);
    const valid = hdr[0] === 0 && hdr[1] === 0 && hdr[2] === 1 && hdr[3] === 0;
    console.log(`   ICO header valid: ${valid} (count=${hdr.readUInt16LE(4)})`);
  }
  console.log('ICO generation done');
}

generate().catch(e => { console.error(e); process.exit(1); });
