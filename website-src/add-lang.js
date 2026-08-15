const fs = require('fs');

const files = [
    { name: 'index.html', path: '', lang: 'tr' },
    { name: 'indir.html', path: '', lang: 'tr' },
    { name: 'ozellikler.html', path: '', lang: 'tr' },
    { name: 'gizlilik.html', path: '', lang: 'tr' },
    { name: 'en/index.html', path: 'en/', lang: 'en' },
    { name: 'en/indir.html', path: 'en/', lang: 'en' },
    { name: 'en/ozellikler.html', path: 'en/', lang: 'en' },
    { name: 'en/gizlilik.html', path: 'en/', lang: 'en' }
];

files.forEach(f => {
    if (!fs.existsSync(f.name)) return;
    let c = fs.readFileSync(f.name, 'utf8');
    
    // Add language switcher right before hamburger
    const switchHTML = f.lang === 'tr' 
        ? `<div class="lang-switch" style="display:flex; gap:10px; margin-right: 15px;">
            <a href="index.html" style="color:var(--text-primary); font-weight:bold;">TR</a>
            <span style="color:var(--text-muted);">|</span>
            <a href="en/index.html" style="color:var(--text-muted);">EN</a>
           </div>`
        : `<div class="lang-switch" style="display:flex; gap:10px; margin-right: 15px;">
            <a href="../index.html" style="color:var(--text-muted);">TR</a>
            <span style="color:var(--text-muted);">|</span>
            <a href="index.html" style="color:var(--text-primary); font-weight:bold;">EN</a>
           </div>`;
           
    // Insert switchHTML right before <button class="hamburger"
    c = c.replace(/<button class=\"hamburger\"/, switchHTML + '\n    <button class="hamburger"');
    
    fs.writeFileSync(f.name, c);
});
console.log('Language switchers added.');
