const fs = require('fs');
const path = require('path');
const s = fs.readFileSync(path.join(process.env.TEMP, 'adblock.js'), 'utf8');

// Domains are often in `list(\`...\`)` template strings with whitespace
const hosts = new Set();
for (const m of s.matchAll(/list\(\s*[`'"]([\s\S]*?)[`'"]\s*\)/g)) {
  for (const part of m[1].trim().split(/\s+/)) {
    const h = part.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '');
    if (h.includes('.') && /^[a-z0-9.-]+$/.test(h) && h.length < 90) hosts.add(h);
  }
}
// Fallback: bare host tokens near common TLDs in long strings
for (const m of s.matchAll(/([a-z0-9-]+(?:\.[a-z0-9-]+)+)/gi)) {
  const h = m[1].toLowerCase();
  if (
    h.split('.').length >= 2 &&
    h.length < 80 &&
    !h.endsWith('.js') &&
    !h.includes('superadblock') &&
    !['schema.org', 'w3.org'].includes(h)
  ) {
    // only keep if looks like ad/tracker style or appears in list() already
    hosts.add(h);
  }
}

const list = [...hosts].sort();
fs.writeFileSync(path.join(process.env.TEMP, 'sabt-hosts.txt'), list.join('\n'));
console.log('HOST_COUNT', list.length);
console.log(list.slice(0, 40).join('\n'));
console.log('...');
console.log(list.slice(-20).join('\n'));
