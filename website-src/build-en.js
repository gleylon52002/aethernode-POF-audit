const fs = require('fs');
if (!fs.existsSync('en')) fs.mkdirSync('en');

const files = ['index.html', 'indir.html', 'ozellikler.html', 'gizlilik.html'];

// Basic dictionary for translation
const dict = {
    'Özellikler': 'Features',
    'İndir': 'Download',
    'Gizlilik': 'Privacy',
    'Windows için indir': 'Download for Windows',
    'Gizlilik Önce Gelir': 'Privacy First',
    'Reklam engelleme': 'Ad blocking',
    'Parmak izi koruması': 'Fingerprint protection',
    'Güvenli DNS': 'Secure DNS',
    'Sıfır telemetri': 'Zero telemetry',
    'AES-256 şifreleme': 'AES-256 encryption',
    'Chromium tabanlı': 'Chromium based',
    'İndir — Windows': 'Download — Windows',
    'Ücretsiz İndir': 'Download Free',
    'Gizliliğinizi geri alın.': 'Take back your privacy.',
    'Tamamen ücretsiz': 'Completely free',
    'Sürüm Notları': 'Release Notes',
    'Yapılan Yenilikler & Düzeltmeler': 'Improvements & Fixes',
    'Bilinen Durumlar & Gelecek Planlar': 'Known Issues & Future Plans'
};

files.forEach(f => {
    if (!fs.existsSync(f)) return;
    let c = fs.readFileSync(f, 'utf8');
    
    // Fix asset paths
    c = c.replace(/href=\"(css|img|js)\//g, 'href="../$1/');
    c = c.replace(/src=\"(css|img|js)\//g, 'src="../$1/');
    c = c.replace(/<html lang="tr">/, '<html lang="en">');

    // Translate texts
    for (const [tr, en] of Object.entries(dict)) {
        // Basic global replace
        c = c.split(tr).join(en);
    }
    
    fs.writeFileSync('en/' + f, c);
});
console.log('EN versions created.');
