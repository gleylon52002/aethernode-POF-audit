# 🚀 AetherNode POF — Standart Sürüm Çıkarma ve Dağıtım Kılavuzu (Release & Deployment SOP)

Bu belge, her yeni sürüm yayınlandığında uygulanacak **standart, hatasız ve otomatikleştirilmiş dağıtım protokolünü** içerir. Her yeni sürüm hazırlığında buradaki adımlar sırasıyla takip edilir.

---

## 📌 1. Neden Geçmişte Sorunlar Yaşandı? (Kritik Teknik Bilgiler)

1. **cPanel / Pure-FTPd Soket Kesintisi Sorunu:**
   - Hosting üzerindeki Pure-FTPd sunucusu, 100 MB üzerindeki tek parça ikili (binary) akışlarda zaman aşımı veya güvenlik kuralı nedeniyle soket sonunu birkaç kilobayt erken keser.
   - Sonucunda yerel dosya 102.4 MB iken sunucudaki dosya 102.1 MB kalır.
2. **SHA-512 Checksum Mismatch Hatası:**
   - `latest.yml` içindeki imza, yerel `electron-builder` çıktısına göre üretilir. Sunucudaki dosya eksik veya bozuk yüklendiğinde tarayıcı indirip hash aldığında uyuşmazlık hatası verir.
3. **NSIS "Installer Integrity Check Has Failed" Hatası:**
   - NSIS yükleyicilerinin (`Setup.exe`) dosya sonunda gömülü CRC32/blok tablosu vardır. Son 200 KB eksik olduğunda Windows dosyayı çalıştırırken doğrudan bütünlük hatası verir.
4. **Çözüm:**
   - Standart FTP yerine **4 MB HTTPS Parçacıklı Yükleme (Chunked HTTPS Streaming)** motoru ([`scripts/deploy-release.mjs`](file:///c:/Users/Mehmet/Desktop/projelerim/browser/scripts/deploy-release.mjs)) kullanılır. Dosya 1:1 bit eşleşmesi ve SHA-512 doğrulaması yapılmadan işlem tamamlanmaz.

---

## 📋 2. Sürüm Çıkarma Adım Adım Kontrol Listesi

Yeni bir sürüm yayınlanacağı zaman (örneğin `v2.0.2`):

### Adım 1: Sürüm Numaralarını Güncelle
Aşağıdaki 5 dosyada sürüm numarasını yeni versiyona yükseltin:
1. [`package.json`](file:///c:/Users/Mehmet/Desktop/projelerim/browser/package.json) ➔ `"version": "2.0.2"`
2. [`src/shared/constants/app.ts`](file:///c:/Users/Mehmet/Desktop/projelerim/browser/src/shared/constants/app.ts) ➔ `version: '2.0.2'`
3. [`src/renderer/src/pages/settings/index.tsx`](file:///c:/Users/Mehmet/Desktop/projelerim/browser/src/renderer/src/pages/settings/index.tsx) ➔ `useState('v2.0.2')`
4. [`src/renderer/src/components/layouts/app-shell.tsx`](file:///c:/Users/Mehmet/Desktop/projelerim/browser/src/renderer/src/components/layouts/app-shell.tsx) ➔ `v2.0.2`
5. [`website-src/indir.html`](file:///c:/Users/Mehmet/Desktop/projelerim/browser/website-src/indir.html) & [`website-src/en/indir.html`](file:///c:/Users/Mehmet/Desktop/projelerim/browser/website-src/en/indir.html) ➔ İndirme buton linkleri ve sürüm notları

---

### Adım 2: Tip Kontrolü ve Derleme Testi
```powershell
npm run typecheck
npm run build
```
*(Hata vermediğinden emin olun)*

---

### Adım 3: EXE ve Portable Sürümü Derle
```powershell
npm run dist:win
```
Bu komut `release/` klasörü altına:
- `AetherNode POF-vX.X.X-x64.exe` (Setup yükleyici)
- `AetherNode POF-vX.X.X-portable.exe` (Taşınabilir exe)
- `latest.yml` (Otomatik güncelleme manifestosu)
üretir.

---

### Adım 4: cPanel Sunucusuna Tek Komutla Otomatik Dağıt (%100 Bit Bütünlüğü)
```powershell
npm run deploy
```
*Bu komut arka planda:*
1. Sunucuya geçici HTTPS Chunk Köprüsü kurar.
2. 102 MB'lık yükleyiciyi 4 MB'lık parçalarla aktarır.
3. Sunucu tarafında SHA-512 ve bayt boyutunu doğrular (**Bit-Perfect Match**).
4. `latest.yml` ve web indirme sayfalarını günceller.
5. Geçici köprüyü sunucudan otomatik siler.

> 💡 **İpucu:** Adım 3 ve Adım 4'ü tek komutta yapmak için:
> ```powershell
> npm run release
> ```

---

### Adım 5: Git'e Gönder (Commit & Push)
```powershell
git add . ; git commit -m "vX.X.X - Release notes and features" ; git push
```

---

## 🔍 3. Hızlı Doğrulama Komutları (Test)

Dağıtım sonrası kontrol için terminalden çalıştırılacak tek satırlık testler:

```powershell
# 1. HTTP 200 OK ve Boyut Kontrolü
curl.exe -I "https://aethernodevpn.com/updates/latest.yml"

# 2. Setup EXE İndirilebilirlik Kontrolü
curl.exe -I "https://aethernodevpn.com/updates/AetherNode%20POF-v2.0.1-x64.exe"
```

---

**Her yeni güncellemede doğrudan bu dokümandaki adımlar takip edilir.**
