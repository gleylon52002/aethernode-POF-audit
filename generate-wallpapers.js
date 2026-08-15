const fs = require('fs');
const path = require('path');

const wpDir = 'src/renderer/src/assets/wallpapers';
const dashFile = 'src/renderer/src/pages/dashboard/index.tsx';

// Generate 30 distinct wallpapers
const palettes = [
  { n: 'Void', c1: '#020617', c2: '#0F172A', c3: '#1E293B', a: '#38BDF8' },
  { n: 'Neon', c1: '#2E1065', c2: '#4C1D95', c3: '#5B21B6', a: '#F472B6' },
  { n: 'Mint', c1: '#022C22', c2: '#064E3B', c3: '#065F46', a: '#34D399' },
  { n: 'Magma', c1: '#450A0A', c2: '#7F1D1D', c3: '#991B1B', a: '#FBBF24' },
  { n: 'Deep', c1: '#082F49', c2: '#0C4A6E', c3: '#0369A1', a: '#7DD3FC' },
];

const patterns = ['grid', 'waves', 'particles', 'geometry', 'aurora', 'mesh'];

let newWps = [];

for (let i = 1; i <= 30; i++) {
  const p = palettes[i % palettes.length];
  const pat = patterns[i % patterns.length];
  const name = `wp-gen-${i}.svg`;
  const credit = `Tasarım: ${p.n} ${pat.charAt(0).toUpperCase() + pat.slice(1)}`;
  
  let content = '';
  if (pat === 'grid') {
    content = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" preserveAspectRatio="none">
  <defs><radialGradient id="g${i}" cx="50%" cy="100%" r="100%"><stop offset="0%" stop-color="${p.c3}"/><stop offset="100%" stop-color="${p.c1}"/></radialGradient>
  <pattern id="p${i}" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="${p.a}" stroke-width="1" stroke-opacity="0.3"/></pattern></defs>
  <rect width="1920" height="1080" fill="url(#g${i})"/>
  <rect width="1920" height="1080" fill="url(#p${i})" style="transform: perspective(600px) rotateX(60deg) scale(2.5); transform-origin: center bottom;"/></svg>`;
  } else if (pat === 'waves') {
    content = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" preserveAspectRatio="none">
  <defs><linearGradient id="g${i}" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${p.c1}"/><stop offset="100%" stop-color="${p.c2}"/></linearGradient></defs>
  <rect width="1920" height="1080" fill="url(#g${i})"/>
  <path d="M0,600 Q480,300 960,600 T1920,600 L1920,1080 L0,1080 Z" fill="${p.c3}" opacity="0.6"/>
  <path d="M0,800 Q480,600 960,800 T1920,800 L1920,1080 L0,1080 Z" fill="${p.a}" opacity="0.4"/>
  <circle cx="1500" cy="300" r="${50 + i * 5}" fill="${p.a}" opacity="0.1" filter="blur(20px)"/></svg>`;
  } else if (pat === 'particles') {
    content = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" preserveAspectRatio="none">
  <rect width="1920" height="1080" fill="${p.c1}"/>
  ${Array.from({length: 40}).map((_, j) => `<circle cx="${(j * 53 + i * 7) % 1920}" cy="${(j * 41 + i * 13) % 1080}" r="${(j % 5) + 1}" fill="${p.a}" opacity="${(j % 10) / 10 + 0.1}"/>`).join('')}
  <circle cx="960" cy="540" r="400" fill="${p.c3}" opacity="0.3" filter="blur(60px)"/></svg>`;
  } else if (pat === 'geometry') {
    content = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" preserveAspectRatio="none">
  <rect width="1920" height="1080" fill="${p.c2}"/>
  <polygon points="0,0 1920,0 1920,400 0,800" fill="${p.c1}"/>
  <polygon points="1920,1080 0,1080 0,600 1920,100" fill="${p.c3}" opacity="0.5"/>
  <rect x="800" y="400" width="300" height="300" fill="${p.a}" opacity="0.2" transform="rotate(${i * 10} 950 550)"/></svg>`;
  } else if (pat === 'aurora') {
    content = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" preserveAspectRatio="none">
  <rect width="1920" height="1080" fill="${p.c1}"/>
  <ellipse cx="${500 + i * 20}" cy="300" rx="800" ry="200" fill="${p.a}" opacity="0.2" filter="blur(80px)" transform="rotate(-20 500 300)"/>
  <ellipse cx="${1400 - i * 10}" cy="800" rx="900" ry="250" fill="${p.c3}" opacity="0.3" filter="blur(100px)" transform="rotate(15 1400 800)"/></svg>`;
  } else {
    content = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" preserveAspectRatio="none">
  <rect width="1920" height="1080" fill="${p.c1}"/>
  <path d="M0,540 L1920,540 M960,0 L960,1080 M0,0 L1920,1080 M1920,0 L0,1080" stroke="${p.c3}" stroke-width="2" opacity="0.4"/>
  <circle cx="960" cy="540" r="300" fill="none" stroke="${p.a}" stroke-width="4" opacity="0.6"/>
  <circle cx="960" cy="540" r="450" fill="none" stroke="${p.c2}" stroke-width="1" opacity="0.3"/></svg>`;
  }
  
  fs.writeFileSync(path.join(wpDir, name), content);
  
  newWps.push({
    importName: `wpGen${i}`,
    fileName: name,
    credit: credit,
    fallback: `linear-gradient(135deg, ${p.c1} 0%, ${p.c3} 100%)`
  });
}

// Update dashboard/index.tsx
let db = fs.readFileSync(dashFile, 'utf8');

// Insert imports
const importBlock = newWps.map(w => `import ${w.importName} from '@renderer/assets/wallpapers/${w.fileName}';`).join('\n');
db = db.replace('const LANDSCAPES = [', `${importBlock}\n\nconst LANDSCAPES = [\n`);

// Insert array items
const arrayBlock = newWps.map(w => `  { credit: '${w.credit}', image: ${w.importName}, fallback: '${w.fallback}' },`).join('\n');
db = db.replace('const LANDSCAPES = [', `const LANDSCAPES = [\n${arrayBlock}`);

fs.writeFileSync(dashFile, db);
console.log('Generated 30 SVG wallpapers and updated dashboard!');
