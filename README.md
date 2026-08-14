# POF Secure Browser

Gizlilik öncelikli masaüstü tarayıcı. Electron + Chromium + React, dark glassmorphism arayüz.

## Geliştirme Aşamaları

Bu proje tek seferde değil, sıralı aşamalarla geliştirilir:

| Aşama | İçerik | Durum |
|------|--------|------|
| 1 | Proje iskeleti, klasör yapısı, konfigürasyon, IPC sözleşmesi | ✅ |
| 2 | Electron altyapısı (pencere, menü, IPC, secure store) | ✅ |
| 3 | React arayüzü (tema, layout, primitive'ler, store'lar) | ✅ |
| 4 | Temel tarayıcı işlevleri (sekmeler, gezinme, yer imleri, indirmeler, ayarlar) | ✅ |
| 5 | ~~VPN entegrasyonu~~ — kaldırıldı | ❌ |
| 6 | Gelişmiş gizlilik ve güvenlik modülleri | ✅ |
| 7 | Gerçek ağ katmanı enforcement + POF özellik seti | ✅ |
| 8 | Günlük tarayıcı tamamlığı (Find, Reader, Memory, Session, Content) | ✅ |
| 9 | Yeni sekme kozmetik + Bank Mode + Script Blocker | ✅ |

### Aşama 3 + 4 kapsamı (tamamlandı)

- AppShell: özel titlebar, sidebar (10 modül), tab bar, adres çubuğu, içerik alanı
- UI primitives: Button, Input, Switch, Tooltip + 20 inline SVG ikon
- Tema: dark mode + glassmorphism + brand gradient
- Zustand store'ları: tabs, bookmarks, downloads, settings
- Sekme yönetimi: oluştur / kapat / aktif et, çoklu sekme, internal URL çözümü
- Gezinme: address bar (URL/arama), geri/ileri/yeniden yükle/durdur
- Dahili sayfalar: dashboard, bookmarks, downloads, settings, security/privacy/network/passwords/notes
- Webview entegrasyonu: her sekme için `<webview>`, başlık/favicon yükleme, indirme yakalama
- Arama motorları: duckduckgo/startpage/brave/google/searxng (Ayar'dan seçilebilir)

### Aşama 5 — kaldırıldı

VPN entegrasyonu (sayfa, IPC, transport) kullanıcı isteğiyle tamamen çıkarıldı.

### Aşama 6 kapsamı (tamamlandı — gerçek depolama + UI)

- **Şifre Yöneticisi:** `services/vault.ts` AES-256-GCM kasa (PBKDF2 anahtar türetimi). Master-password oturumda main belleğinde, diske asla yazılmaz. Katmanlı: SecureStore cihaz anahtarıyla + entry listesi master-password'le mühürlenir. unlock/list/add/update/remove/lock; ilk açılışta kurulum, hatalı parola auth-tag hatası. UI: unlock kartı → arama + göster/kopyala + ekle/düzenle Dialog.
- **Güvenli Notlar:** `services/notes-service.ts` aynı master-password'le mühürlenir; kasa kilitliyken erişilemez. UI: liste + düzenleyici (düz metin).
- **Gizlilik:** `pages/privacy` tüm `PrivacyConfig` alt alanlarını settings store'a bağlı toggle/select olarak sunar. Kalıcı.
- **Ağ Paneli:** `network-handlers` guard'ın `captured` etkinliğini `IPC.network.captured` ile renderer'a iter; store ring-buffer (500). UI: enable/disable + canlı istek tablosu.
- **Güvenlik Merkezi:** skor (settings/vault'a bağlı), sızıntı testi (WebRTC/DNS/IP/Fingerprint), permission audit, statik ihlal bilgilendirmesi.
- **Scope sınırları (Aşama 6b):** fingerprint injection, tracker/reklam webRequest engelleme, gerçek DoH çözümleme ve HTTPS upgrade bu aşamanın dışındadır. Gizlilik toggle'ları ayara yazılır; gerçek ağ katmanına uygulanması sonraki adım. Leak test/skor ve breaches yerel/simüle değerlerdir — dış API çağrısı yok (telemetri yok ilkesiyle uyumlu).

### Aşama 7 kapsamı (tamamlandı — gerçek enforcement)

Aşama 6'nın "ayar var, enforcement yok" sınırları kaldırıldı; POF özellik setinin çekirdeği gerçek katmanlara uygulandı:

- **Tracker/Reklam engelleme (gerçek):** `network/blocklist.ts` — 250+ reklam/izleyici alan adı (Google Ads, Facebook Pixel, analitik, ad-exchange, popup ağları), alt alan adı eşleştirmeli O(1) lookup. `network/guard.ts` istekleri `onBeforeRequest` seviyesinde iptal eder (sıfır bant genişliği). Engellenen istek sayısı adres çubuğunda canlı rozet olarak gösterilir.
- **HTTPS zorlama + karışık içerik engelleme (gerçek):** http ana çerçeve → https redirect; https sayfadaki http alt kaynak iptali. Localhost muaf.
- **Tracking parametresi temizleyici:** `shared/utils/url-cleaner.ts` — utm_*, fbclid, gclid, msclkid vb. 60+ parametre hem adres çubuğunda hem ağ katmanında (redirect) temizlenir. Ayarlardan kapatılabilir.
- **DNS-over-HTTPS (gerçek):** `network/secure-dns.ts` — Chromium'un yerleşik güvenli DNS çözücüsü `secure` modda yapılandırılır; tüm sorgular DoH'a gider. Ayar değişikliği anında uygulanır.
- **DNT/GPC başlıkları:** doNotTrack açıkken her isteğe `DNT: 1` + `Sec-GPC: 1` eklenir.
- **Anti-fingerprint (gerçek):** `preload/guest.ts` her sekme webview'ına preload olarak bağlanır; canvas/audio gürültüsü, navigator/hardware/screen maskeleme sayfa scriptlerinden önce ana dünyaya enjekte edilir. Oturum başına rastgele tohum.
- **WebRTC IP sızıntısı koruması (gerçek):** sekme webContents'lerine `setWebRTCIPHandlingPolicy` uygulanır.
- **Cookie banner otomatik reddetme:** bilinen consent popup'ları (OneTrust, Cookiebot, Usercentrics, Didomi, Quantcast, ...) CSS ile gizlenir, "Reddet" düğmeleri otomatik tıklanır (TR+EN kalıplar).
- **Deep Focus (Sessiz Mod):** adres çubuğundaki odak düğmesi — monokrom filtre, animasyon durdurma, YouTube/Twitter/Reddit/Facebook/Instagram dikkat dağıtıcılarını gizleme. Sekme başına aç/kapat.
- **Gezinme geçmişi:** şifreli main-store kalıcılığı, arama, tek kayıt silme, toplu temizleme, ziyaret sayacı. Incognito ziyaretleri asla kaydedilmez. `aethernode://history` + Ctrl+H.
- **Panik Tuşu (Ctrl+Shift+X):** tüm sekmeler kapanır; çerez, localStorage, IndexedDB, CacheStorage, ServiceWorker, cache ve geçmiş anında silinir.
- **Derin temizlik (zombie cookie cleaner):** Ayarlar'dan tek tıkla tüm kalıcı depolama mekanizmaları temizlenir.
- **Klavye kısayolları (main `before-input-event` — webview odaklıyken de çalışır):** Ctrl+T/W, Ctrl+Shift+T (kapatılanı geri aç), Ctrl+Shift+N (gizli sekme), Ctrl+Tab / Ctrl+Shift+Tab, Ctrl+1-8 / Ctrl+9, Ctrl+L / Alt+D / F6 (adres çubuğu + tümünü seç), Ctrl+R / F5 / Ctrl+Shift+R, Ctrl+Enter (www+.com), Alt+Enter (yeni sekmede aç), Ctrl+Plus/Minus/0 (zoom), F11 (tam ekran), Ctrl+H/J (geçmiş/indirmeler), Ctrl+D (yer imi), Ctrl+Shift+O, F12 (sekme devtools), Ctrl+Shift+X (panik), Escape (durdur).
- **User-Agent değiştirici:** Chrome/Firefox/Edge/Safari/Android/iPhone kimlikleri (Ayarlar → Genel).
- **9 arama motoru:** DuckDuckGo (varsayılan), Google, Bing, Brave, Yandex, Startpage, SearXNG, Ecosia, Qwant.
- **Sekme iyileştirmeleri:** orta tık ile kapatma, incognito sekme rozetleri, kapatılan sekme yığını (son 25), sekme içi target=_blank yeni sekmede açılır.

### Aşama 8 kapsamı (tamamlandı — günlük tarayıcı tamamlığı)

- **Sayfada bul (Ctrl+F):** FindBar + `webview.findInPage`; Enter/Shift+Enter ile sonraki/önceki eşleşme.
- **Okuyucu Modu:** Adres çubuğu düğmesi; makale içeriğini temiz okuma görünümüne çıkarır (guest inject).
- **Gerçek bellek tasarrufu:** `memorySaver` açıkken 15 dk idle sekmeler discard edilir (webview unmount); tıklanınca uyanır. Sekme çubuğunda 💤 göstergesi.
- **Oturum geri yükleme:** `startupPage: lastSession` — sekmeler localStorage'a yazılır, açılışta geri yüklenir. Ayarlar'dan seçilebilir.
- **İçerik araç seti:** Ctrl+P yazdır, Ctrl+Shift+P ekran görüntüsü (PNG), Ctrl+U kaynak kodu, Ctrl+S sayfa kaydet (HTML).
- **YouTube reklam engelleme:** Cosmetic CSS + skip-button tıklama + ad playback hızlandırma (guest preload).
- **Yeni sekme sayfası:** Saat, dinamik selamlama (Günaydın/İyi günler/…) ve POF markası.

### Aşama 9 kapsamı (tamamlandı)

- **VPN kaldırıldı:** sayfa, store, IPC, transport ve sidebar girişi silindi.
- **Yeni sekme (kozmetik):** her açılışta rastgele manzara arkaplanı (yarı saydam overlay), saat/selamlama, arama kutusu + geçmiş/yer imi önerileri, hızlı siteler, alt istatistik şeridi (engellenen / koruma skoru / sekmeler / yer imleri).
- **Banka Modu:** finans domain'lerinde `persist:bank` izolasyonu, fingerprint enjeksiyonu kapalı, pano/konum/bildirim engeli, adres çubuğunda "Banka" rozeti.
- **Script Blocker:** Gizlilik ayarlarından JS kapatma (CSP + script temizleme); adres çubuğunda JS:ON/OFF.

## Klasör Yapısı

```
src/
├── main/              Electron main process
│   ├── ipc/           IPC handler'ları (router + alan handler'ları)
│   ├── services/      İş mantığı servisleri
│   ├── security/      Session/güvenlik varsayılanları
│   ├── network/       Network guard / inspector
│   ├── store/         Secure store (ayar, şifre, notlar)
│   ├── menu/          Uygulama menüsü
│   ├── windows/       Pencere yönetimi
│   └── utils/         env, logger
├── preload/           contextBridge ile güvenli API yüzeyi
├── shared/            Main/Preload/Renderer ortak: tipler, sabitler, utils
│   ├── constants/     IPC kanal sabitleri, app/crypto sabitleri
│   ├── types/         Result, Tab, Vpn, Privacy, Settings tipleri
│   └── utils/         Zod doğrulayıcı
└── renderer/          React UI
    ├── src/
    │   ├── components/  ui (shadcn) + layouts
    │   ├── pages/       dashboard, security, privacy, ...
    │   ├── store/       Zustand store'ları
    │   ├── hooks/
    │   ├── services/
    │   ├── router/
    │   ├── styles/      global.css (tema)
    │   ├── ipc/         bridge tip bildirimi
    │   └── locales/
    └── index.html
```

### Mimari Notlar

- **Three-process ayrımı:** Main (Node), Preload (sandboxed bridge), Renderer (web). `shared/` katmanı saf tipler/sabitler içerir ve üçü tarafından da import edilir — runtime API bağımlılığı yoktur.
- **IPC güvenliği:** Tüm kanallar `src/shared/constants/ipc-channels.ts`'te merkezî tanımlı. Main tarafında `router.ts` her handler'ı Zod ile doğrular ve `Result<T>` döner. Renderer yalnızca `window.aether` üzerinden, allowlist sınırlı API'ye erişir.
- **Privacy-by-default:** `DEFAULT_SETTINGS` tüm gizlilik bayraklarını açık başlatır. Telemetri tip seviyesinde `false` olarak sabitlenmiştir.

## Kurulum

```bash
npm install
```

> Not: `npm install` sonrası `npx electron --version` çıktı vermiyorsa Electron
> ikilisi indirilmemiş demektir. O durumda `cd node_modules/electron && node install.js`
> komutunu çalıştırın; zip inip `dist/electron.exe` açılmadıysa PowerShell ile
> `Expand-Archive` kullanıp `path.txt` içine `electron.exe` yazın.

## Geliştirme

```bash
npm run dev          # Vite dev + Electron (renderer hot reload)
```

## Build

```bash
npm run build        # Tip kontrolü + main/preload/renderer derlemesi
npm run dist         # Derle + electron-builder paketi
npm run dist:win     # Windows x64 NSIS kurulumu
```

Çıktı `release/` dizinine yazılır.

## Kalite Araçları

```bash
npm run typecheck    # TypeScript tip kontrolü
npm run lint         # ESLint
npm run format       # Prettier
```

## Electron Builder

`package.json` içindeki `build` bloğu:

- `appId`: `com.aethernode.browser`
- `productName`: `AetherNode Secure Browser`
- Çıktı: `release/`
- Windows: NSIS (kullanıcı dizinine, kurulabilir dizin seçilebilir)
- macOS: DMG · Linux: AppImage + DEB
- Native modüller (`*.node`, `*.dll`) `asarUnpack` ile paket dışına çıkarılır

## Güvenlik İlkeleri

- Telemetri / analitik / arka plan isteği **yoktur**.
- `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`.
- Harici bağlantılar sistem tarayıcısında açılır.
- Renderer CSP katı; yalnızca `'self'`.

## Proje Sitesi ve İndirme
[https://aethernodevpn.com/POF/](https://aethernodevpn.com/POF/)

## Lisans

**AetherNode POF Source-Available License**

Bu projenin kaynak kodu herkese açıktır ve topluluğun kod katkılarına (Pull Request, hata düzeltmeleri vb.) izin verilmektedir.

**Yasak olan durumlar:**
- Kodu derleyip veya ismini/logosunu (rebranding) değiştirerek kendi ürününüz gibi dağıtmak.
- Ticari amaçlı bir sürümünü oluşturup yayınlamak veya satmak.

Detaylı bilgi için lütfen [LICENSE.md](LICENSE.md) dosyasına göz atın.

Copyright © 2026 AetherNode Systems. Tüm hakları saklıdır.