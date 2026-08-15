const fs = require('fs');

const phrases = [
  // Translate longest strings first to avoid partial replacements
  ['AetherNode POF, reklam engelleme, parmak izi koruması, güvenli DNS ve şifreli kasa gibi <strong>100+ güvenlik özelliğini</strong> tek kurulumda sunar. Eklenti yok, ayar yok — kur ve güvende gez.', 'AetherNode POF offers <strong>100+ security features</strong> like ad blocking, fingerprint protection, secure DNS, and an encrypted vault in a single installation. No extensions, no settings — just install and browse safely.'],
  ['Ağ seviyesinde reklam engelleme, banka modu, Tor tarzı parmak izi maskeleme ve daha fazlası. Ekstra eklentiye gerek kalmadan internette görünmez olun.', 'Network-level ad blocking, banking mode, Tor-style fingerprint masking, and more. Become invisible online without needing extra extensions.'],
  ['Hemen ücretsiz indirin ve dijital ayak izinizi silmeye başlayın.', 'Download for free today and start erasing your digital footprint.'],
  ['Gizlilik varsayılan açık, Windows için güvenli tarayıcı.', 'Privacy by default, secure browser for Windows.'],
  ['WINDOWS İÇİN ÜCRETSİZ · GİZLİLİK VARSAYILAN AÇIK', 'FREE FOR WINDOWS · PRIVACY BY DEFAULT'],
  ['Gizlilik önce gelir.', 'Privacy first.'],
  ['Gizliliğine önem verenlerin tercihi', 'Trusted by privacy enthusiasts'],
  ['Gizliliğinizi geri alın.', 'Take back your privacy.'],
  ['Hız ve Güvenlik Bir Arada', 'Speed and Security Combined'],
  ['İzlenmeye Son Verin', 'Stop Being Tracked'],
  ['Tam Donanımlı Kalkan', 'Fully Equipped Shield'],
  ['Güvenli İnternete İlk Adım', 'First Step to Secure Internet'],
  ['Yapılan Yenilikler & Düzeltmeler', 'Improvements & Fixes'],
  ['Bilinen Durumlar & Gelecek Planlar', 'Known Issues & Future Plans'],
  ['Taşınabilir Sürüm (Portable)', 'Portable Version'],
  ['İletişim & Bağlantılar', 'Contact & Links'],
  ['Gizlilik Politikası', 'Privacy Policy'],
  ['KVKK Aydınlatma', 'Privacy Notice'],
  ['İndir — Windows', 'Download — Windows'],
  ['Windows için indir', 'Download for Windows'],
  ['Özellikleri keşfet', 'Explore features'],
  ['VirusTotal: 0/74 %100 Temiz', 'VirusTotal: 0/74 100% Clean'],
  ['Yükleme Gerekmez', 'No Installation Required'],
  ['İndir (Installer)', 'Download (Installer)'],
  ['Kurulum Dosyası', 'Installer Package'],
  ['Güvenlik özelliği', 'Security features'],
  ['Engellenen izleyici', 'Trackers blocked'],
  ['Fiyat — tamamen ücretsiz', 'Price — completely free'],
  ['Virüs Tarama Sonucu', 'Virus Scan Result'],
  ['AES-256 şifreleme', 'AES-256 encryption'],
  ['Chromium tabanlı', 'Chromium based'],
  ['Sıfır telemetri', 'Zero telemetry'],
  ['Sürüm Notları', 'Release Notes'],
  ['Özellikleri İncele', 'View Features'],
  ['Tüm hakları saklıdır.', 'All rights reserved.'],
  ['Ücretsiz İndir', 'Download Free'],
  ['Ana menü', 'Main menu'],
  ['Menüyü aç', 'Open menu'],
  ['Özellikler', 'Features'],
  ['Gizlilik', 'Privacy'],
  ['İletişim', 'Contact'],
  ['İndir', 'Download'],
  ['KORUMA', 'PROTECTION'],
  ['Aktif', 'Active'],
  ['ENGELLENEN', 'BLOCKED'],
  ['DNS', 'DNS']
];

const files = ['en/index.html', 'en/indir.html', 'en/ozellikler.html', 'en/gizlilik.html'];

files.forEach(f => {
    if (!fs.existsSync(f)) return;
    
    // Read TR file instead and re-translate from scratch
    const trFile = f.replace('en/', '');
    let c = fs.readFileSync(trFile, 'utf8');
    
    // Paths and Lang switch
    c = c.replace(/href=\"(css|img|js)\//g, 'href="../$1/');
    c = c.replace(/src=\"(css|img|js)\//g, 'src="../$1/');
    c = c.replace(/<html lang="tr">/, '<html lang="en">');
    
    // Fix Lang switch for EN
    c = c.replace(
        `<div class="lang-switch" style="display:flex; gap:10px; margin-right: 15px; z-index: 99; position: relative;">
            <a href="#" style="color:var(--text-primary, #EDEDF2); font-weight:bold; pointer-events:none; text-decoration:none;">TR</a>
            <span style="color:var(--text-muted, #9A9AA8);">|</span>
            <a href="en/" style="color:var(--text-muted, #9A9AA8); text-decoration:none;">EN</a>
           </div>`,
        `<div class="lang-switch" style="display:flex; gap:10px; margin-right: 15px; z-index: 99; position: relative;">
            <a href="../" style="color:var(--text-muted, #9A9AA8); text-decoration:none;">TR</a>
            <span style="color:var(--text-muted, #9A9AA8);">|</span>
            <a href="#" style="color:var(--text-primary, #EDEDF2); font-weight:bold; pointer-events:none; text-decoration:none;">EN</a>
           </div>`
    );

    // Apply translations in correct order
    phrases.forEach(([tr, en]) => {
        c = c.split(tr).join(en);
    });
    
    // Some minor metadata translations
    c = c.split('Gizlilik Önce Gelir').join('Privacy First');
    c = c.split('Güvenli Tarayıcı').join('Secure Browser');
    c = c.split('reklam ve izleyici engelleme').join('ad and tracker blocking');
    c = c.split('şifreli kasa ve 100+ özellik').join('encrypted vault and 100+ features');
    c = c.split('Windows için ücretsiz indir').join('Free download for Windows');
    c = c.split('Reklam engelleme, parmak izi koruması, güvenli DNS, şifreli kasa — hepsi tek kurulumda. Windows için ücretsiz.').join('Ad blocking, fingerprint protection, secure DNS, encrypted vault — all in a single install. Free for Windows.');
    
    fs.writeFileSync(f, c);
});
console.log('Translated EN files successfully with proper ordering.');
