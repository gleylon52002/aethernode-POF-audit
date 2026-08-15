const fs = require('fs');
const files = ['index.html', 'indir.html', 'ozellikler.html', 'gizlilik.html', 'en/index.html', 'en/indir.html', 'en/ozellikler.html', 'en/gizlilik.html'];

files.forEach(f => {
    if (!fs.existsSync(f)) return;
    let c = fs.readFileSync(f, 'utf8');
    
    // Check if already modified
    if (c.includes('gleylon52002')) return;

    // Replace İletişim column content
    const oldIletisim = `<strong class="footer__title">İletişim</strong>
      <a href="mailto:iletisim@aethernodevpn.com">iletisim@aethernodevpn.com</a>
      <a href="https://aethernodevpn.com" target="_blank" rel="noopener">aethernodevpn.com</a>`;
      
    const isEn = f.startsWith('en/');
    const vpnText = "AetherNode VPN";
    const gitText = isEn ? "GitHub (Source Code)" : "GitHub (Kaynak Kod)";
    const iletisimText = isEn ? "Contact & Links" : "İletişim & Bağlantılar";
    
    const newIletisim = `<strong class="footer__title">${iletisimText}</strong>
      <a href="mailto:iletisim@aethernodevpn.com">iletisim@aethernodevpn.com</a>
      <a href="https://aethernodevpn.com" target="_blank" rel="noopener">${vpnText}</a>
      <a href="https://github.com/gleylon52002/aethernode-POF-audit" target="_blank" rel="noopener">${gitText}</a>`;
      
    c = c.replace(oldIletisim, newIletisim);
    
    // Also, if 'İletişim' header is used but it was replaced differently:
    c = c.replace(`<strong class="footer__title">İletişim</strong>
      <a href="mailto:iletisim@aethernodevpn.com">iletisim@aethernodevpn.com</a>
      <a href="https://aethernodevpn.com" target="_blank" rel="noopener">AetherNode VPN</a>`, newIletisim);
      
    fs.writeFileSync(f, c);
});
console.log('Added GitHub and VPN links to footers.');
