<?php
/*
 |--------------------------------------------------------------------------
 | SEO hedef anahtar kelimeler (TR):
 | ücretsiz browser indir, güvenli tarayıcı, güvenilir browser,
 | gizlilik tarayıcısı, chrome alternatifi, reklam engelleyici tarayıcı,
 | AetherNode browser, windows güvenli browser indir
 |--------------------------------------------------------------------------
 */
$pageTitle = 'Ücretsiz Güvenli Browser İndir | AetherNode Secure Browser (Windows)';
$pageDesc  = 'Ücretsiz güvenli browser indirin. AetherNode Secure Browser: reklam/izleyici engelleme, parmak izi koruması, DNS over HTTPS, banka modu, sıfır telemetri. Windows 10/11 için güvenilir tarayıcı — bedava.';
$pageKeywords = 'ücretsiz browser indir, güvenli browser indir, güvenilir browser, güvenli tarayıcı indir, ücretsiz tarayıcı, gizlilik tarayıcısı, chrome alternatifi, reklam engelleyici tarayıcı, AetherNode browser, AetherNode Secure Browser, POF browser, windows browser indir, güvenli internet tarayıcısı, bedava browser, tracker blocker browser, DNS over HTTPS tarayıcı';
require_once __DIR__ . '/../config.php';

/*
 |--------------------------------------------------------------------------
 | İNDİRME LİNKİ — Burayı düzenleyin
 |--------------------------------------------------------------------------
 */
$browserDownloadUrl = 'https://aethernodevpn.com/POF/indir.html';
$browserVersion     = '1.0.3';
$browserPlatform    = 'Windows 10 / 11 (x64)';
$browserFileSize    = ''; // örn: '85 MB'
$pageUrl            = SITE_URL . '/pages/secure-browser.php';
$downloadReady      = ($browserDownloadUrl !== '#INDIRME-LINKI-BURAYA' && $browserDownloadUrl !== '');
?>
<?php include __DIR__ . '/../header.php'; ?>

<!-- AI / crawler summary (visible to bots, lightly styled for humans) -->
<article itemscope itemtype="https://schema.org/SoftwareApplication">
<meta itemprop="name" content="AetherNode Secure Browser">
<meta itemprop="applicationCategory" content="BrowserApplication">
<meta itemprop="operatingSystem" content="Windows 10, Windows 11">
<meta itemprop="softwareVersion" content="<?= h($browserVersion) ?>">

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": "<?= $pageUrl ?>#webpage",
      "url": "<?= $pageUrl ?>",
      "name": "Ücretsiz Güvenli Browser İndir | AetherNode Secure Browser",
      "description": "<?= h($pageDesc) ?>",
      "inLanguage": "tr-TR",
      "isPartOf": { "@id": "<?= SITE_URL ?>/#website" },
      "about": { "@id": "<?= $pageUrl ?>#app" },
      "primaryImageOfPage": {
        "@type": "ImageObject",
        "url": "<?= SITE_URL ?>/assets/img/og-image.png"
      },
      "datePublished": "2026-07-21",
      "dateModified": "2026-07-21",
      "breadcrumb": { "@id": "<?= $pageUrl ?>#breadcrumb" },
      "speakable": {
        "@type": "SpeakableSpecification",
        "cssSelector": [".seo-speakable-title", ".seo-speakable-summary", ".seo-speakable-download"]
      }
    },
    {
      "@type": "BreadcrumbList",
      "@id": "<?= $pageUrl ?>#breadcrumb",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Ana Sayfa", "item": "<?= SITE_URL ?>/" },
        { "@type": "ListItem", "position": 2, "name": "Ücretsiz Güvenli Browser İndir", "item": "<?= $pageUrl ?>" }
      ]
    },
    {
      "@type": "SoftwareApplication",
      "@id": "<?= $pageUrl ?>#app",
      "name": "AetherNode Secure Browser",
      "alternateName": ["AetherNode POF", "POF Secure Browser", "AetherNode Browser", "AetherNode Güvenli Tarayıcı"],
      "applicationCategory": "BrowserApplication",
      "applicationSubCategory": "Privacy Browser",
      "operatingSystem": "Windows 10, Windows 11",
      "softwareVersion": "<?= h($browserVersion) ?>",
      "fileSize": "<?= h($browserFileSize !== '' ? $browserFileSize : 'Windows x64 installer') ?>",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "TRY",
        "availability": "https://schema.org/InStock",
        "url": "<?= $pageUrl ?>"
      },
      "description": "Ücretsiz gizlilik öncelikli masaüstü tarayıcı. Reklam ve izleyici engelleme, parmak izi koruması, DNS over HTTPS, banka modu, sıfır telemetri. Windows 10/11.",
      "featureList": [
        "Ağ katmanı reklam ve izleyici engelleme",
        "Parmak izi koruması (Canvas, WebGL, Audio, Font)",
        "DNS over HTTPS",
        "WebRTC IP sızıntı koruması",
        "Banka Modu",
        "AES-256-GCM şifre kasası",
        "Panik tuşu",
        "Sıfır telemetri",
        "YouTube reklam engelleme",
        "Split View ve sekme grupları"
      ],
      "screenshot": "<?= SITE_URL ?>/assets/img/og-image.png",
      "author": { "@id": "<?= SITE_URL ?>/#organization" },
      "publisher": { "@id": "<?= SITE_URL ?>/#organization" },
      "url": "<?= $pageUrl ?>",
      "downloadUrl": "<?= h($downloadReady ? $browserDownloadUrl : $pageUrl) ?>",
      "installUrl": "<?= h($downloadReady ? $browserDownloadUrl : $pageUrl) ?>",
      "inLanguage": "tr",
      "isAccessibleForFree": true,
      "countriesSupported": "TR"
    },
    {
      "@type": "HowTo",
      "name": "AetherNode Secure Browser nasıl indirilir ve kurulur?",
      "description": "Windows 10/11 bilgisayara ücretsiz güvenli browser indirme ve kurulum adımları.",
      "totalTime": "PT3M",
      "supply": [{ "@type": "HowToSupply", "name": "Windows 10 veya Windows 11 bilgisayar" }],
      "tool": [{ "@type": "HowToTool", "name": "İnternet bağlantısı" }],
      "step": [
        {
          "@type": "HowToStep",
          "position": 1,
          "name": "İndirme sayfasını açın",
          "text": "Bu sayfadaki Bedava Güvenilir Browser İndir düğmesine tıklayın.",
          "url": "<?= $pageUrl ?>"
        },
        {
          "@type": "HowToStep",
          "position": 2,
          "name": "Kurulum dosyasını indirin",
          "text": "Windows x64 NSIS kurulum paketini bilgisayarınıza indirin."
        },
        {
          "@type": "HowToStep",
          "position": 3,
          "name": "Kurulumu tamamlayın",
          "text": "İndirilen .exe dosyasını çalıştırın, kurulum sihirbazını takip edin ve AetherNode Secure Browser'ı açın."
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Ücretsiz güvenli browser indirme mümkün mü?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Evet. AetherNode Secure Browser tamamen ücretsizdir. Gizli ücret, abonelik veya deneme süresi yoktur. Windows 10/11 için bedava güvenilir browser olarak sunulur."
          }
        },
        {
          "@type": "Question",
          "name": "En güvenilir browser hangisi?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Güvenilir bir browser; reklam/izleyici engelleme, parmak izi koruması, DNS over HTTPS, WebRTC sızıntı koruması ve sıfır telemetri sunmalıdır. AetherNode Secure Browser bu özellikleri varsayılan olarak açık getirir."
          }
        },
        {
          "@type": "Question",
          "name": "AetherNode Secure Browser Chrome alternatifi midir?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Evet. Chromium tabanlıdır; günlük gezinme, sekmeler, yer imleri ve indirmeleri destekler. Chrome'dan farkı gizlilik öncelikli tasarım, yerleşik reklam engelleme ve telemetri olmamasıdır."
          }
        },
        {
          "@type": "Question",
          "name": "Hangi işletim sistemlerini destekliyor?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Şu an Windows 10 ve Windows 11 (x64) için resmi kurulum paketi sunulmaktadır."
          }
        },
        {
          "@type": "Question",
          "name": "Tarayıcı telemetri topluyor mu?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Hayır. Sıfır telemetri ilkesiyle tasarlanmıştır; analitik veya arka plan veri toplama yoktur."
          }
        },
        {
          "@type": "Question",
          "name": "VPN ile birlikte kullanılır mı?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Evet. AetherNode Pro VPN cihaz trafiğini korurken Secure Browser tarayıcı katmanında reklam, izleyici ve parmak izi koruması sağlar. Birlikte kullanılabilir."
          }
        }
      ]
    }
  ]
}
</script>

<section class="content-page">
  <nav aria-label="Breadcrumb" style="max-width:900px;margin:0 auto 24px;font-size:12px;color:var(--text3);font-family:var(--font-mono)">
    <a href="/" style="color:var(--text3);text-decoration:none">Ana Sayfa</a>
    <span style="margin:0 8px">/</span>
    <span style="color:var(--text2)">Ücretsiz Güvenli Browser İndir</span>
  </nav>

  <div class="section-label" style="justify-content:center">Ücretsiz · Güvenilir · Windows</div>
  <h1 class="section-title seo-speakable-title" style="font-size: clamp(30px, 5vw, 52px); line-height: 0.95; text-align: center" itemprop="name">
    Ücretsiz Güvenli<br>
    <em>Browser İndir</em>
  </h1>
  <p class="section-sub seo-speakable-summary" style="max-width: 760px; margin: 20px auto; text-align: center" itemprop="description">
    <strong>AetherNode Secure Browser</strong> — Windows için bedava, gizlilik öncelikli tarayıcı.
    Reklam ve izleyici engelleme, parmak izi koruması, DNS over HTTPS, banka modu ve <strong>sıfır telemetri</strong>.
    Güvenilir browser arıyorsanız resmi indirme sayfası burasıdır.
  </p>

  <!-- Primary Download CTA -->
  <div class="seo-speakable-download" style="max-width: 680px; margin: 36px auto; text-align: center">
    <a href="<?= h($browserDownloadUrl) ?>"
       class="btn-hero btn-hero-main"
       id="browser-download-btn"
       itemprop="downloadUrl"
       <?php if (!$downloadReady): ?>
       onclick="alert('İndirme linki henüz ayarlanmadı. pages/secure-browser.php içindeki $browserDownloadUrl değişkenini güncelleyin.'); return false;"
       <?php else: ?>
       rel="nofollow noopener"
       <?php endif; ?>
       style="font-size:17px;padding:18px 36px;background:linear-gradient(135deg,#00c853,#00e676);box-shadow:0 6px 28px rgba(0,230,118,.4);border:none">
      <i class="fas fa-download"></i>
      Bedava Güvenilir Browser İndir
    </a>
    <p style="margin-top:14px;font-size:12px;color:var(--text3);font-family:var(--font-mono)">
      v<?= h($browserVersion) ?> · <?= h($browserPlatform) ?>
      <?php if ($browserFileSize !== ''): ?> · <?= h($browserFileSize) ?><?php endif; ?>
      · Ücretsiz · NSIS Kurulum · Telemetri Yok
    </p>
  </div>

  <!-- Keyword-rich intro -->
  <div style="max-width:820px;margin:0 auto 48px" class="reveal">
    <div class="panel-card" style="padding:28px">
      <h2 style="font-family:var(--font-display);font-size:20px;text-transform:uppercase;letter-spacing:1px;margin-bottom:14px">
        Neden AetherNode Secure Browser?
      </h2>
      <p style="color:var(--text2);font-size:15px;line-height:1.75;margin-bottom:12px">
        Birçok kullanıcı <strong style="color:var(--text1)">ücretsiz browser indir</strong> veya
        <strong style="color:var(--text1)">güvenli tarayıcı</strong> ararken telemetri toplayan,
        reklamlı veya zayıf gizlilik ayarlı ürünlerle karşılaşır. AetherNode Secure Browser
        (POF), gizliliği varsayılan açar: izleyiciler ağ katmanında engellenir, WebRTC IP sızıntısı
        kapatılır, çerez banner’ları otomatik reddedilir ve hiçbir analitik veri toplanmaz.
      </p>
      <p style="color:var(--text2);font-size:15px;line-height:1.75">
        Chromium tabanlı olduğu için alışık olduğunuz gezinme deneyimini korur; farkı
        <strong style="color:var(--text1)">güvenilir browser</strong> standartlarını ürünün
        merkezine koymasıdır — Chrome alternatifi arayanlar için ücretsiz, Windows odaklı bir çözümdür.
      </p>
    </div>
  </div>

  <!-- Feature grid -->
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:20px;max-width:1100px;margin:0 auto">
    <div class="panel-card reveal">
      <div class="panel-card-icon"><i class="fas fa-ban"></i></div>
      <h2 class="panel-card-title" style="font-size:16px">Reklam &amp; İzleyici Engelleme</h2>
      <p style="color:var(--text2);font-size:13px;line-height:1.6">
        İstekler ağ katmanında iptal edilir (sıfır bant genişliği). EasyList, EasyPrivacy ve Hagezi listeleri otomatik güncellenir. YouTube reklam engelleme dahildir.
      </p>
    </div>
    <div class="panel-card reveal">
      <div class="panel-card-icon"><i class="fas fa-fingerprint"></i></div>
      <h2 class="panel-card-title" style="font-size:16px">Parmak İzi Koruması</h2>
      <p style="color:var(--text2);font-size:13px;line-height:1.6">
        Canvas, WebGL, Audio, Font, Navigator maskeleme. Uniformity modu ile kalabalıkta kaybolma — Tor tarzı sabit profil seçeneği.
      </p>
    </div>
    <div class="panel-card reveal">
      <div class="panel-card-icon"><i class="fas fa-university"></i></div>
      <h2 class="panel-card-title" style="font-size:16px">Banka Modu</h2>
      <p style="color:var(--text2);font-size:13px;line-height:1.6">
        ~90 finans domain’inde izole oturum; pano, konum ve bildirim engeli; adres çubuğunda Banka rozeti.
      </p>
    </div>
    <div class="panel-card reveal">
      <div class="panel-card-icon"><i class="fas fa-eye-slash"></i></div>
      <h2 class="panel-card-title" style="font-size:16px">Sıfır Telemetri</h2>
      <p style="color:var(--text2);font-size:13px;line-height:1.6">
        Analitik yok, arka plan isteği yok. Telemetri ayarı değiştirilemez şekilde kapalıdır — gerçek gizlilik tarayıcısı.
      </p>
    </div>
  </div>

  <!-- Detailed SEO sections -->
  <div style="max-width:900px;margin:64px auto 0">
    <div style="text-align:center;margin-bottom:40px" class="reveal">
      <div class="section-label" style="justify-content:center">Özellikler</div>
      <h2 class="section-title">Güvenli Tarayıcı<br><em>Özellikleri</em></h2>
    </div>

    <div class="panel-card reveal" style="padding:28px;margin-bottom:20px">
      <h3 style="font-family:var(--font-display);font-size:18px;text-transform:uppercase;letter-spacing:1px;margin-bottom:14px">
        <i class="fas fa-shield-alt" style="color:var(--orange)"></i> Ağ ve Gizlilik
      </h3>
      <ul style="list-style:none;padding:0;color:var(--text2);font-size:14px;line-height:2">
        <li><i class="fas fa-check" style="color:#00ff88;font-size:10px;margin-right:10px"></i><strong style="color:var(--text1)">DNS over HTTPS</strong> — birincil + yedek DoH sunucuları</li>
        <li><i class="fas fa-check" style="color:#00ff88;font-size:10px;margin-right:10px"></i><strong style="color:var(--text1)">HTTPS zorlama</strong> ve karışık içerik engelleme</li>
        <li><i class="fas fa-check" style="color:#00ff88;font-size:10px;margin-right:10px"></i><strong style="color:var(--text1)">WebRTC IP sızıntı koruması</strong></li>
        <li><i class="fas fa-check" style="color:#00ff88;font-size:10px;margin-right:10px"></i><strong style="color:var(--text1)">URL temizleyici</strong> — utm_*, fbclid, gclid ve 60+ takip parametresi</li>
        <li><i class="fas fa-check" style="color:#00ff88;font-size:10px;margin-right:10px"></i><strong style="color:var(--text1)">Çerez bildirimi otomatik reddetme</strong></li>
        <li><i class="fas fa-check" style="color:#00ff88;font-size:10px;margin-right:10px"></i><strong style="color:var(--text1)">DNT + GPC</strong> başlıkları</li>
      </ul>
    </div>

    <div class="panel-card reveal" style="padding:28px;margin-bottom:20px">
      <h3 style="font-family:var(--font-display);font-size:18px;text-transform:uppercase;letter-spacing:1px;margin-bottom:14px">
        <i class="fas fa-lock" style="color:var(--orange)"></i> Güvenlik
      </h3>
      <ul style="list-style:none;padding:0;color:var(--text2);font-size:14px;line-height:2">
        <li><i class="fas fa-check" style="color:#00ff88;font-size:10px;margin-right:10px"></i><strong style="color:var(--text1)">AES-256-GCM şifre kasası</strong></li>
        <li><i class="fas fa-check" style="color:#00ff88;font-size:10px;margin-right:10px"></i><strong style="color:var(--text1)">Güvenli notlar</strong></li>
        <li><i class="fas fa-check" style="color:#00ff88;font-size:10px;margin-right:10px"></i><strong style="color:var(--text1)">İndirme koruması</strong> + SHA-256 özeti</li>
        <li><i class="fas fa-check" style="color:#00ff88;font-size:10px;margin-right:10px"></i><strong style="color:var(--text1)">Panik tuşu</strong> (Ctrl+Shift+X)</li>
        <li><i class="fas fa-check" style="color:#00ff88;font-size:10px;margin-right:10px"></i><strong style="color:var(--text1)">İzin politikası</strong> — kamera/mikrofon/konum varsayılan reddedilir</li>
        <li><i class="fas fa-check" style="color:#00ff88;font-size:10px;margin-right:10px"></i><strong style="color:var(--text1)">Script Blocker</strong></li>
      </ul>
    </div>

    <div class="panel-card reveal" style="padding:28px;margin-bottom:20px">
      <h3 style="font-family:var(--font-display);font-size:18px;text-transform:uppercase;letter-spacing:1px;margin-bottom:14px">
        <i class="fas fa-window-maximize" style="color:var(--orange)"></i> Günlük Kullanım
      </h3>
      <ul style="list-style:none;padding:0;color:var(--text2);font-size:14px;line-height:2">
        <li><i class="fas fa-check" style="color:#00ff88;font-size:10px;margin-right:10px"></i>Split View, dikey sekme çubuğu, sekme grupları</li>
        <li><i class="fas fa-check" style="color:#00ff88;font-size:10px;margin-right:10px"></i>Okuyucu modu, Deep Focus, sayfada bul</li>
        <li><i class="fas fa-check" style="color:#00ff88;font-size:10px;margin-right:10px"></i>Bellek tasarrufu (boşta sekmeleri uyutma)</li>
        <li><i class="fas fa-check" style="color:#00ff88;font-size:10px;margin-right:10px"></i>IDM tarzı indirme yöneticisi</li>
        <li><i class="fas fa-check" style="color:#00ff88;font-size:10px;margin-right:10px"></i>9 arama motoru (varsayılan: DuckDuckGo)</li>
      </ul>
    </div>
  </div>

  <!-- Comparison table for SEO -->
  <div style="max-width:900px;margin:56px auto 0" class="reveal">
    <div style="text-align:center;margin-bottom:28px">
      <h2 class="section-title" style="font-size:clamp(24px,4vw,36px)">Chrome vs<br><em>AetherNode Browser</em></h2>
    </div>
    <div class="panel-card" style="padding:0;overflow:hidden">
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead>
          <tr style="background:rgba(255,255,255,.03)">
            <th style="text-align:left;padding:14px 18px;color:var(--text3);font-family:var(--font-mono);font-weight:500;border-bottom:1px solid var(--border)">Özellik</th>
            <th style="text-align:center;padding:14px 12px;color:var(--text3);font-family:var(--font-mono);font-weight:500;border-bottom:1px solid var(--border)">Chrome</th>
            <th style="text-align:center;padding:14px 12px;color:#00ff88;font-family:var(--font-mono);font-weight:600;border-bottom:1px solid var(--border)">AetherNode</th>
          </tr>
        </thead>
        <tbody style="color:var(--text2)">
          <tr><td style="padding:12px 18px;border-bottom:1px solid var(--border)">Ücretsiz indirme</td><td style="text-align:center;border-bottom:1px solid var(--border)">✓</td><td style="text-align:center;color:#00ff88;border-bottom:1px solid var(--border)">✓</td></tr>
          <tr><td style="padding:12px 18px;border-bottom:1px solid var(--border)">Yerleşik reklam/izleyici engelleme</td><td style="text-align:center;border-bottom:1px solid var(--border)">—</td><td style="text-align:center;color:#00ff88;border-bottom:1px solid var(--border)">✓</td></tr>
          <tr><td style="padding:12px 18px;border-bottom:1px solid var(--border)">Sıfır telemetri</td><td style="text-align:center;border-bottom:1px solid var(--border)">—</td><td style="text-align:center;color:#00ff88;border-bottom:1px solid var(--border)">✓</td></tr>
          <tr><td style="padding:12px 18px;border-bottom:1px solid var(--border)">Parmak izi koruması (varsayılan)</td><td style="text-align:center;border-bottom:1px solid var(--border)">—</td><td style="text-align:center;color:#00ff88;border-bottom:1px solid var(--border)">✓</td></tr>
          <tr><td style="padding:12px 18px;border-bottom:1px solid var(--border)">Banka Modu</td><td style="text-align:center;border-bottom:1px solid var(--border)">—</td><td style="text-align:center;color:#00ff88;border-bottom:1px solid var(--border)">✓</td></tr>
          <tr><td style="padding:12px 18px">Panik tuşu</td><td style="text-align:center">—</td><td style="text-align:center;color:#00ff88">✓</td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- How to -->
  <div style="max-width:820px;margin:56px auto 0" class="reveal">
    <div class="panel-card" style="padding:28px">
      <h2 style="font-family:var(--font-display);font-size:20px;text-transform:uppercase;letter-spacing:1px;margin-bottom:18px">
        <i class="fas fa-list-ol" style="color:var(--orange)"></i> Güvenli Browser Nasıl İndirilir?
      </h2>
      <ol style="margin:0;padding-left:20px;color:var(--text2);font-size:14px;line-height:2">
        <li>Bu sayfadaki <strong style="color:var(--text1)">Bedava Güvenilir Browser İndir</strong> düğmesine tıklayın.</li>
        <li>Windows x64 kurulum dosyasını bilgisayarınıza kaydedin.</li>
        <li>İndirilen <code style="color:var(--orange)">.exe</code> dosyasını çalıştırıp kurulumu tamamlayın.</li>
        <li>AetherNode Secure Browser’ı açın — gizlilik korumaları varsayılan açıktır.</li>
      </ol>
    </div>
  </div>

  <!-- System requirements -->
  <div style="max-width:900px;margin:40px auto 0" class="reveal">
    <div class="panel-card" style="padding:28px">
      <h2 style="font-family:var(--font-display);font-size:18px;text-transform:uppercase;letter-spacing:1px;margin-bottom:16px">
        <i class="fas fa-desktop" style="color:var(--orange)"></i> Sistem Gereksinimleri
      </h2>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px;color:var(--text2);font-size:14px;line-height:1.7">
        <div><strong style="color:var(--text1)">İşletim Sistemi</strong><br itemprop="operatingSystem"><?= h($browserPlatform) ?></div>
        <div><strong style="color:var(--text1)">Mimari</strong><br>x64</div>
        <div><strong style="color:var(--text1)">Sürüm</strong><br itemprop="softwareVersion">v<?= h($browserVersion) ?></div>
        <div><strong style="color:var(--text1)">Fiyat</strong><br itemprop="offers" itemscope itemtype="https://schema.org/Offer"><meta itemprop="price" content="0"><meta itemprop="priceCurrency" content="TRY">Ücretsiz (0₺)</div>
      </div>
    </div>
  </div>

  <!-- FAQ -->
  <div style="max-width:800px;margin:64px auto 0">
    <div style="text-align:center;margin-bottom:40px" class="reveal">
      <div class="section-label" style="justify-content:center">SSS</div>
      <h2 class="section-title">Ücretsiz Browser<br><em>Sık Sorulanlar</em></h2>
    </div>
    <div class="faq-list reveal">
      <div class="faq-item open">
        <button class="faq-question" onclick="toggleFaq(this)">
          <span class="faq-q-text">Ücretsiz güvenli browser indirme mümkün mü?</span>
          <div class="faq-icon"><i class="fas fa-plus"></i></div>
        </button>
        <div class="faq-answer">
          <div class="faq-answer-inner">Evet. AetherNode Secure Browser tamamen ücretsizdir; gizli ücret veya abonelik yoktur.</div>
        </div>
      </div>
      <div class="faq-item">
        <button class="faq-question" onclick="toggleFaq(this)">
          <span class="faq-q-text">Chrome alternatifi olarak kullanılabilir mi?</span>
          <div class="faq-icon"><i class="fas fa-plus"></i></div>
        </button>
        <div class="faq-answer">
          <div class="faq-answer-inner">Evet. Chromium tabanlıdır; sekmeler, yer imleri ve indirmeler çalışır. Farkı yerleşik gizlilik korumaları ve sıfır telemetridir.</div>
        </div>
      </div>
      <div class="faq-item">
        <button class="faq-question" onclick="toggleFaq(this)">
          <span class="faq-q-text">Hangi işletim sistemlerini destekliyor?</span>
          <div class="faq-icon"><i class="fas fa-plus"></i></div>
        </button>
        <div class="faq-answer">
          <div class="faq-answer-inner">Windows 10 ve Windows 11 (x64) için NSIS kurulum paketi sunulur.</div>
        </div>
      </div>
      <div class="faq-item">
        <button class="faq-question" onclick="toggleFaq(this)">
          <span class="faq-q-text">Telemetri toplanıyor mu?</span>
          <div class="faq-icon"><i class="fas fa-plus"></i></div>
        </button>
        <div class="faq-answer">
          <div class="faq-answer-inner">Hayır. Sıfır telemetri; analitik veya arka plan veri toplama yoktur.</div>
        </div>
      </div>
      <div class="faq-item">
        <button class="faq-question" onclick="toggleFaq(this)">
          <span class="faq-q-text">VPN ile birlikte kullanılır mı?</span>
          <div class="faq-icon"><i class="fas fa-plus"></i></div>
        </button>
        <div class="faq-answer">
          <div class="faq-answer-inner">Evet. AetherNode Pro VPN cihaz trafiğini, Secure Browser ise tarayıcı gizliliğini korur. Birlikte kullanılabilir.</div>
        </div>
      </div>
    </div>
  </div>

  <!-- Bottom CTA -->
  <div style="text-align:center;margin:64px auto 20px;max-width:640px" class="reveal">
    <h2 class="section-title" style="font-size:clamp(24px,4vw,36px)">Hemen Ücretsiz İndirin</h2>
    <p class="section-sub" style="margin:16px auto 28px;text-align:center">
      Windows için güvenilir, bedava gizlilik tarayıcısı — AetherNode Secure Browser.
    </p>
    <a href="<?= h($browserDownloadUrl) ?>"
       class="btn-hero btn-hero-main"
       <?php if (!$downloadReady): ?>
       onclick="alert('İndirme linki henüz ayarlanmadı. pages/secure-browser.php içindeki $browserDownloadUrl değişkenini güncelleyin.'); return false;"
       <?php else: ?>
       
       <?php endif; ?>
       style="background:linear-gradient(135deg,#00c853,#00e676);box-shadow:0 6px 28px rgba(0,230,118,.4);border:none;font-size:16px;padding:16px 32px">
      <i class="fas fa-download"></i>
      Bedava Güvenilir Browser İndir
    </a>
  </div>

  <!-- Related internal links (SEO) -->
  <p style="max-width:820px;margin:40px auto 0;text-align:center;font-size:13px;color:var(--text3);line-height:1.8">
    İlgili:
    <a href="/pages/features.php" style="color:var(--orange)">VPN özellikleri</a> ·
    <a href="/pages/ram-only-vpn-nedir.php" style="color:var(--orange)">RAM-only VPN nedir</a> ·
    <a href="/pages/pricing.php" style="color:var(--orange)">VPN fiyatları</a> ·
    <a href="/" style="color:var(--orange)">AetherNode Pro ana sayfa</a>
  </p>
</section>
</article>

<?php include __DIR__ . '/../footer.php'; ?>
