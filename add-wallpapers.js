const fs = require('fs');
let c = fs.readFileSync('src/renderer/src/pages/dashboard/index.tsx', 'utf8');

const imports = `import wpPolar1 from '@renderer/assets/wallpapers/wp-polar-1.svg';
import wpCyber1 from '@renderer/assets/wallpapers/wp-cyber-1.svg';
import wpAbstract1 from '@renderer/assets/wallpapers/wp-abstract-1.svg';`;

c = c.replace(`import wpPolar1 from '@renderer/assets/wallpapers/wp-polar-1.svg';`, imports);

const landscapes = `const LANDSCAPES = [
  { credit: 'Cyber Grid — Neon', image: wpCyber1, fallback: 'linear-gradient(180deg, #4F46E5 0%, #020617 100%)' },
  { credit: 'Abstract Waves — Purple', image: wpAbstract1, fallback: 'linear-gradient(180deg, #1E1B4B 0%, #312E81 100%)' },`;

c = c.replace(`const LANDSCAPES = [`, landscapes);

fs.writeFileSync('src/renderer/src/pages/dashboard/index.tsx', c);
console.log('Wallpapers added successfully.');
