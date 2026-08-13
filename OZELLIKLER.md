# AetherNode POF — Tüm Özellikler

> Gizlilik öncelikli, AetherNode VPN ile entegre masaüstü tarayıcı.
> Electron + Chromium + React · Dark glassmorphism arayüz.
> Bu belge uygulamadaki **tüm özellikleri** ve eklenme amaçlarını eksiksiz özetler.

---

## 1. Sekme ve Pencere Yönetimi

| Özellik | Açıklama |
|---|---|
| **Chrome benzeri sekme çubuğu** | Sekme sayısı arttıkça sekmeler otomatik daralır; 22+ sekmede yalnızca favicon gösterilir. Orta tıkla kapatma desteklenir. |
| **Sekme arama** (`Ctrl+Shift+A`) | Spotlight tarzı panel: tüm açık sekmelerde başlık/URL araması, ok tuşlarıyla gezinme, listeden sekme kapatma, "aktif / uykuda / ses çalıyor" rozetleri. |
| **Split View** (`Ctrl+Shift+L` / `Ctrl+\`) | İki sekme yan yana. En son kullanılan sekme otomatik eşleşir; sağ panelde başlık + yer değiştirme (⇄) + kapatma kontrolleri. |
| **Bellek tasarrufu (tab discard)** | 15 dk kullanılmayan sekmeler uyutulur; medya çalan, sabitlenmiş ve banka sekmeleri asla uyutulmaz. |
| **Kapatılan sekmeyi geri aç** (`Ctrl+Shift+T`) | Son 25 kapatılan sekme yığını (gizli sekmeler kaydedilmez). |
| **Oturum geri yükleme** | Sekmeler oturumlar arası saklanır; "son oturumu geri yükle" başlangıç seçeneği. |
| **30+ sekme uyarısı** | Nazik hatırlatma — portal ile en üst katmanda, hiçbir öğenin arkasında kalmaz. |
| **Pencere başlığı senkronu** | Görev çubuğu başlığı aktif sekmeyi gösterir: `Sayfa Adı — AetherNode`. |
| **Sekme sesi kontrolü** | Sekme başına sessize alma; ses çalan sekmede hoparlör rozeti. |
| **Dikey sekme çubuğu** (`Ctrl+Shift+V`) | Sekme listesi solda panel olarak açılır; başlıklar çok sekmede bile okunur kalır. Panel genişliği sağ kenardan sürüklenerek ayarlanır. "Yalnızca ikon" daraltılmış görünüm. |
| **Sekme grupları** | Sağ tık → gruba ekle / yeni grup (isim + 8 renk). Yatayda renkli kapsül, dikeyde katlanabilir bölümler. Grup verisi oturum geri yüklemede korunur. |

## 2. Gezinme ve Arayüz

| Özellik | Açıklama |
|---|---|
| **Akıllı adres çubuğu** | Açık sekme / yer imi / geçmiş / arama önerileri tek listede; güvenlik rozetleri (HTTPS, HTTP, Dahili, Banka, Gizli). `Alt+Enter` yeni sekmede, `Ctrl+Enter` www…com tamamlama. |
| **Dashboard (yeni sekme)** | Saat, tarih, selamlama, arama, hızlı erişim siteleri (URL bazlı tekilleştirilmiş), güvenlik istatistikleri. |
| **Yerel wallpaper'lar** | 6 manzara görseli uygulamayla paketlenir (dağ, orman, aurora, çöl, okyanus, lavanta) — CDN/ağ isteği yok. |
| **Okuyucu Modu** | Sayfayı sade makale görünümüne çevirir (reklamsız, dikkat dağıtıcısız). |
| **Deep Focus (Sessiz Mod)** | Sayfa monokrom olur; YouTube önerileri, Twitter trendleri, Reddit sidebar gibi dikkat dağıtıcılar gizlenir. |
| **Sayfada bul** (`Ctrl+F`) | Eşleşme sayacı ile arama, Enter/Shift+Enter ile sonraki/önceki eşleşme. |
| **Ekran görüntüsü** (`Ctrl+Shift+P`) | Aktif sekmenin görüntüsünü PNG indirir. |
| **Kaynağı görüntüle / sayfayı kaydet** | `Ctrl+U` / `Ctrl+S`. |
| **QR ile telefona gönder** | Adres çubuğundaki QR butonu URL'yi cihazdan çıkmadan QR koduna çevirir — sunucu ve hesap gerekmez. |
| **Toast bildirimleri** | Sayfa hatası, indirme, yedekleme gibi olaylar için. |
| **Sayfa çevirisi** (`Ctrl+Shift+Y`) | Aktif sayfayı Google Translate ile çevirir. |
| **Seçim çevirisi** | Metin seçince sağ altta "Çevir" butonu belirir — Google Translate'te açar. |
| **Fare hareketleri** | Sağ tık + sürükle: sola = geri, sağa = ileri, yukarı = yeni sekmede aç, aşağı = sekmeyi kapat. |
| **Zorla koyu tema** | Tüm sitelere koyu tema filtresi uygular (ayarlardan açılır). |

## 3. Medya Kontrolleri

| Özellik | Açıklama |
|---|---|
| **Evrensel video hızı** | 0.5×–3× hazır butonlar + manuel giriş (0.1×–10×). Main process üzerinden sayfanın **tüm frame'lerine** uygulanır — iframe içindeki oynatıcılar dahil. |
| **Ses boost (%300'e kadar)** | GainNode ile %100 üzeri yükseltme. Korumasız çapraz-origin seslerde otomatik atlanır. |
| **Hız koruması** | Netflix gibi hızı geri alan sitelerde `ratechange` yakalanıp ayar yeniden uygulanır. |

## 4. Reklam ve İzleyici Engelleme

| Özellik | Açıklama |
|---|---|
| **Ağ katmanı engelleme** | İstek daha atılmadan iptal (sıfır bant genişliği). Hagezi + EasyList + EasyPrivacy listeleri 12 saatte bir otomatik güncellenir, disk önbelleği tutulur. |
| **Yanlış pozitif koruması** | İlk parti istekler ve arama motorları/YouTube CDN allowlist'te. iframe/medya istekleri yalnızca yüksek güvenilirlikli el listesinden engellenir. |
| **YouTube reklam engelleme** | Player JSON temizliği (`adPlacements`, `playerAds`), otomatik skip, kozmetik CSS, premium/promo popup gizleme. İçerik CDN'ine (googlevideo) asla dokunulmaz. |
| **Kozmetik temizlik** | Engellenen reklamlardan kalan boş kutular, kırık iframe'ler, 1×1 izleme pikselleri gizlenir. |
| **Çerez bildirimi otomatik reddetme** | 10+ CMP desteği (OneTrust, Cookiebot, Usercentrics, Didomi, CookieYes, iubenda, Osano, Borlabs, Complianz…), **Shadow DOM** desteği, TR+EN buton kalıpları, 30 sn deneme + MutationObserver. |
| **URL temizleyici** | `utm_*`, `fbclid`, `gclid` gibi 60+ izleme parametresi otomatik silinir. |

## 5. Gizlilik

| Özellik | Açıklama |
|---|---|
| **Parmak izi koruması** | Canvas, WebGL, Audio, Font, Navigator, Plugins, ekran, donanım, dil, saat dilimi, User-Agent sahteleme — her biri ayrı ayrı açılıp kapanabilir. |
| **Uniformity modu** | Tüm kullanıcılar aynı sabit profili raporlar (Tor Browser yaklaşımı): 1920×1080, DPR 1, 4 çekirdek/8 GB, UTC, en-US, sabit UA, letterboxing, sabit Client Hints. |
| **WebRTC sızıntı koruması** | Gerçek IP'yi gizleyen ICE politikası (`disable_non_proxied_udp` veya `block_all`). |
| **DNS over HTTPS** | Birincil + 3 yedek DoH sunucusu (Cloudflare, Google, Quad9); sunucu arızasında sistem çözücüsüne düşer. |
| **HTTPS zorlama** | HTTP ana istekler HTTPS'e yükseltilir; karışık içerik engellenir. |
| **Çerez koruması** | 3. parti Set-Cookie düşürülür, bilinen izleyici çerezleri anında silinir, ilk parti izolasyon, sekme başına çerez izolasyonu seçeneği. |
| **Çerez kalkanı** | `document.cookie` üzerinden toplu veri sızdırma döngülerini keser. |
| **Gizli sekme** (`Ctrl+Shift+N`) | Ayrı bellek-içi oturum; geçmişe ve kapatılan sekme yığınına yazılmaz. |
| **Çıkışta temizlik** | Kapatırken çerez/önbellek/depolama/geçmiş/pano/geçici dosya temizliği — her biri ayrı seçilebilir. |
| **Panik tuşu** (`Ctrl+Shift+X`) | Tüm sekmeler + oturum verileri + geçmiş anında sıfırlanır. |
| **Derin temizlik** | Çerez, localStorage, IndexedDB, cache, ServiceWorker tek tıkla silinir. |
| **Sızıntı testi** | WebRTC / DNS / IP / parmak izi durumu gerçek problarla raporlanır. |
| **Site bazlı koruma duraklatma** | Her site için ayrı ayrı koruma durdurulup açılabilir; adres çubuğunda Shield rozeti ile gösterilir. |
| **Sıfır telemetri** | Hiçbir analitik veri toplanmaz — ayar değiştirilemez şekilde kapalıdır. |

## 6. Güvenlik

| Özellik | Açıklama |
|---|---|
| **Banka Modu** | ~90 finans domain'i (tüm TR bankaları, katılım bankaları, fintech'ler, yatırım platformları, kripto borsaları, global bankalar) otomatik algılanır: izole oturum, pano/konum/bildirim erişimi kapalı, parmak izi sahteleme devre dışı. |
| **İndirme koruması** | Her indirme onay ister (drive-by koruması); tehlikeli uzantılar (.exe, .bat, .ps1, .apk…) ekstra uyarı. Tamamlanan dosyalar için SHA-256 hesaplanır. |
| **İzin politikası** | Kamera, mikrofon, konum, bildirim, USB, seri port vb. tüm istekler otomatik reddedilir. Yalnızca fullscreen ve pointer lock serbesttir. |
| **Cihaz şifreleme anahtarı** | Tüm yerel depolar işletim sistemi `safeStorage` ile üretilen kuruluma özel anahtarla şifrelenir. |
| **Şifre kasası** | AES-256-GCM + PBKDF2, master parola ile mühürlü. Yaygın/zayıf parola ve parola tekrarı uyarıları (yerel kontrol). |
| **Güvenli notlar** | Kasa master parolasıyla şifreli not defteri. |
| **Güvenlik taraması** | Ayar durumuna göre A+…F puanı ve bulgu listesi. |
| **Güvenlik Lab** | Gelişmiş güvenlik testleri ve yapılandırma denetimi sayfası. |
| **Harici bağlantı koruması** | Dış uygulamaya yalnızca `https://` bağlantılar açılabilir. |
| **Script Blocker** | İsteğe bağlı: JavaScript tamamen kapatılabilir (CSP + script temizleme). |
| **IPC güvenliği** | Tüm main↔renderer mesajları Zod şemasıyla doğrulanır; kanal allowlist'i preload'da doğal olarak oluşur. |

## 7. İndirme Yöneticisi (IDM tarzı)

- Ana süreçte merkezi yakalama (`will-download`) — hangi sekmeden gelirse gelsin.
- Duraklat / devam et / iptal / dosyayı aç / klasörü aç.
- Gerçek zamanlı ilerleme, hız ve boyut bilgisi; toast bildirimleri.
- Geçmiş kalıcı saklanır; tamamlananları temizleme.
- SHA-256 bütünlük değeri arayüzde gösterilir.

## 8. Yedekleme ve Geri Yükleme

- **Kapsam:** ayarlar, geçmiş, yer imleri, şifre kasası, güvenli notlar.
- Tek dosya (`.anb`), kullanıcının seçtiği parola ile **AES-256-GCM + PBKDF2-SHA512** şifreli.
- Kasa ve notlar yedekte **çift katman** şifrelidir (yedek parolası + master parola).
- Geri yükleme sonrası kasa güvenlik gereği kilitli başlar.

## 9. Dayanıklılık

- **Geçici ağ hatalarında otomatik yeniden deneme:** boş yanıt, bağlantı sıfırlama, zaman aşımı, DNS gecikmesi.
- Sayfa yüklenemezse açıklayıcı toast gösterilir.
- Filtre listesi indirilemezse eski set korunur; önbellek bozulursa gömülü tohum listesi devreye girer.

## 10. Klavye Kısayolları

| Kısayol | İşlev |
|---|---|
| `Ctrl+T` | Yeni sekme |
| `Ctrl+W` | Sekmeyi kapat |
| `Ctrl+Shift+T` | Kapatılan sekmeyi geri aç |
| `Ctrl+Shift+N` | Gizli sekme |
| `Ctrl+Tab` / `Ctrl+Shift+Tab` | Sonraki / önceki sekme |
| `Ctrl+1…8`, `Ctrl+9` | Sekmeye git / son sekme |
| `Ctrl+Shift+A` | Sekme arama |
| `Ctrl+Shift+V` | Yatay ↔ dikey sekme çubuğu |
| `Ctrl+Shift+G` | Sekmeyi gruba ekle (hızlı menü) |
| `Ctrl+Shift+F` | Aktif formu otomatik doldur |
| `Ctrl+Shift+D` | Sayfadaki medyayı indir |
| `Ctrl+Shift+K` | Geçici bağlantı oluştur |
| `Ctrl+Shift+L`, `Ctrl+\` | Split view |
| `Ctrl+Shift+Y` | Sayfayı çevir |
| `Ctrl+L`, `Alt+D`, `F6` | Adres çubuğuna odak |
| `Ctrl+F` | Sayfada bul |
| `Ctrl+R`, `F5` / `Ctrl+Shift+R` | Yenile / önbelleksiz yenile |
| `Ctrl+D` | Yer imine ekle |
| `Ctrl+H` / `Ctrl+J` / `Ctrl+Shift+O` | Geçmiş / İndirmeler / Yer imleri |
| `Ctrl+M` (Shift ile) | Sekmeyi sessize al |
| `Ctrl+Shift+P` | Ekran görüntüsü |
| `Ctrl+Shift+X` | Panik tuşu |
| `Ctrl+U` / `Ctrl+S` / `Ctrl+P` | Kaynak / kaydet / yazdır |
| `Ctrl++` / `Ctrl+-` / `Ctrl+0` | Yakınlaştırma |
| `F11` / `F12` | Tam ekran / DevTools |

## 11. Form Otomatik Doldurma

- Ayarlar → Otomatik Doldurma: çoklu profil (ad, e-posta, telefon, adres, şehir, posta kodu, ülke) ve kart yönetimi.
- **Alan tespiti tamamen yerel:** `autocomplete` özniteliği + name/id/placeholder/label heuristiği (TR + EN kalıplar). Hiçbir servise veri gönderilmez.
- Alan odaklanınca öneri kutusu belirir; yalnızca gerçek kullanıcı tıklaması (`isTrusted`) doldurmayı tetikler. `Ctrl+Shift+F` aktif formu ilk profille doldurur.
- **Depolama:** profiller cihaz anahtarıyla şifreli; kartlar şifre kasası master parolasıyla çifte katman mühürlü (AES-256-GCM + PBKDF2).
- **Sahte form koruması:** kart doldurma yalnızca HTTPS sayfalarda; PAN doldurma sonrası bellekten temizlenir.

## 12. Medya İndirme Popup'ı

- Doğrudan http(s) kaynaklı `<video>` üzerinde yarı saydam indirme butonu belirir.
- Tıklanınca indirme, merkezi indirme yöneticisine düşer; "uçan ikon" animasyonu.
- `Ctrl+Shift+D` sayfadaki ilk indirilebilir medyayı indirir.
- DRM'li içerik ve MSE/blob tabanlı adaptif akışlar desteklenmez. Ayarlardan kapatılabilir.

## 13. Geçici / Tek Kullanımlık Oturum Linkleri

- `Ctrl+Shift+K` veya adres çubuğu → süre seç (15 dk / 1 saat / 24 saat / tek kullanımlık) → `aethernode://relay/<token>` linki.
- **Sunucusuz model:** HMAC-SHA256 imzalı token linkin içine gömülür; hiçbir sunucuya veri gönderilmez.
- Alıcı linki açtığında token yerel doğrulanır; geçerliyse sayfa izole gizli bağlamda açılır.

## 14. PWA Desteği

- Herhangi bir HTTPS siteyi uygulama olarak açma (ayrı pencerede, frameless).
- Adres çubuğu menüsünden "Uygulama olarak aç" ile erişilir.

## 15. Kimlik Konteynerleri (Containers)

- Sekme bazlı izole kimlik konteynerleri — her konteyner ayrı çerez/oturum depolarına sahiptir.
- Aynı siteye farklı hesaplarla giriş yapmayı sağlar.

## 16. Çalışma Alanları (Workspaces)

- Sekme gruplarını çalışma alanları olarak kaydetme ve yönetme.
- Her çalışma alanı kendi sekme setiyle açılır.

## 17. Boost'lar (Kullanıcı Betikleri)

- Site başına özel CSS/JS enjeksiyonu.
- Uzantı mağazası yerine yerel kullanıcı betikleri — gizlilik dostu.

## 18. Kütüphane (Library)

- İndirilenler, yer imleri, notlar ve geçmişin birleşik görünümü.
- Hızlı filtreleme ve arama.

## 19. İçe Aktarma (Import)

- Diğer tarayıcılardan yer imi ve ayar içe aktarma sayfası.

## 20. Dahili Sayfalar

`aethernode://` adresleri:

| Adres | Sayfa |
|---|---|
| `dashboard` | Yeni sekme — saat, selamlama, arama, hızlı siteler |
| `history` | Gezinme geçmişi |
| `downloads` | İndirme yöneticisi |
| `bookmarks` | Yer imleri yöneticisi |
| `passwords` | Şifre kasası |
| `notes` | Güvenli notlar |
| `security` | Güvenlik merkezi |
| `security-lab` | Gelişmiş güvenlik testleri |
| `privacy` | Gizlilik ayarları |
| `network` | Ağ paneli (canlı istek izleme) |
| `settings` | Tüm ayarlar |
| `relay` | Geçici bağlantı açılışı |
| `pdf` | Dahili PDF görüntüleyici |
| `import` | Dış tarayıcıdan içe aktarma |
| `library` | Birleşik içerik kütüphanesi |
| `workspaces` | Çalışma alanları |
| `containers` | Kimlik konteynerleri |
| `boosts` | Kullanıcı betikleri |
| `annotate` | Sayfa notlandırma |

## 21. Sidebar (Kenar Çubuğu)

Sol dikey ikon çubuğundan erişilebilen modüller:

| İkon | Modül |
|---|---|
| 🏠 | Ana Sayfa (Dashboard) |
| 🛡️ | Güvenlik Merkezi |
| 🔬 | Güvenlik Lab |
| 👁️ | Gizlilik |
| 🌐 | Ağ |
| ⭐ | Yer İmleri |
| 🕐 | Geçmiş |
| 📥 | İndirilenler |
| 🔑 | Şifreler |
| 📝 | Güvenli Notlar |
| ⚙️ | Ayarlar |

## 22. Otomatik Güncelleme

- `electron-updater` ile arka planda güncelleme kontrolü.
- Kullanıcı uygulamayı kapattığında yeni sürüm otomatik kurulur.
- Güncelleme sunucusu: `https://aethernodevpn.com/updates/`

## 23. Güvenlik ve Mimari Notlar

- **Three-process mimari:** Main (Node.js), Preload (sandboxed bridge), Renderer (web).
- **contextIsolation: true, nodeIntegration: false, sandbox: true** — Electron güvenlik en iyi pratikleri.
- **IPC güvenliği:** Tüm mesajlar Zod şemasıyla doğrulanır, `Result<T>` sarmalayıcısı ile döner.
- **Renderer CSP:** `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'`
- **Harici bağlantılar** sistem tarayıcısında açılır.
- **Telemetri yok** — hiçbir analitik/arka plan isteği yapılmaz.
- **Uzantı (extension) desteği kaldırıldı** — güvenlik yüzeyini azaltmak ve gizlilik modelini basitleştirmek için.

---

*Son güncelleme: 10 Ağustos 2026*
