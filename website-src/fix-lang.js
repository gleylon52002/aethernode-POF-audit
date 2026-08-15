const fs = require('fs');
const files = ['index.html', 'indir.html', 'ozellikler.html', 'gizlilik.html', 'en/index.html', 'en/indir.html', 'en/ozellikler.html', 'en/gizlilik.html'];

files.forEach(f => {
    if (!fs.existsSync(f)) return;
    let c = fs.readFileSync(f, 'utf8');
    
    // Remove ALL lang-switch divs
    c = c.replace(/<div class="lang-switch"[\s\S]*?<\/div>\s*/g, '');
    
    // Now add exactly one back
    const isEn = f.startsWith('en/');
    const switchHTML = !isEn 
        ? `<div class="lang-switch" style="display:flex; gap:10px; margin-right: 15px; z-index: 99; position: relative;">
            <a href="#" style="color:var(--text-primary, #EDEDF2); font-weight:bold; pointer-events:none; text-decoration:none;">TR</a>
            <span style="color:var(--text-muted, #9A9AA8);">|</span>
            <a href="en/" style="color:var(--text-muted, #9A9AA8); text-decoration:none;">EN</a>
           </div>`
        : `<div class="lang-switch" style="display:flex; gap:10px; margin-right: 15px; z-index: 99; position: relative;">
            <a href="../" style="color:var(--text-muted, #9A9AA8); text-decoration:none;">TR</a>
            <span style="color:var(--text-muted, #9A9AA8);">|</span>
            <a href="#" style="color:var(--text-primary, #EDEDF2); font-weight:bold; pointer-events:none; text-decoration:none;">EN</a>
           </div>`;
           
    c = c.replace(/<button class="hamburger"/, switchHTML + '\n    <button class="hamburger"');
    fs.writeFileSync(f, c);
});
console.log('Fixed lang switchers.');
