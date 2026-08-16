$ftpUser = "cortexac"
$ftpPass = "46e38U+qIFMh!t"
$ftpHost = "cortexa99.com.tr"
$baseUrl = "ftp://${ftpUser}:${ftpPass}@${ftpHost}/public_html/aethernodevpn.com"

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "🚀 STARTING CPANEL v2.0.1 UPLOAD PROCESS..." -ForegroundColor Cyan
Write-Host "========================================================`n" -ForegroundColor Cyan

# 1. latest.yml
Write-Host "[1/6] Uploading latest.yml..." -ForegroundColor Yellow
curl.exe --ftp-create-dirs -T "release/latest.yml" "$baseUrl/updates/latest.yml"
curl.exe --ftp-create-dirs -T "release/latest.yml" "$baseUrl/POF/updates/latest.yml"

# 2. Web pages
Write-Host "[2/6] Uploading Web Pages (TR & EN)..." -ForegroundColor Yellow
curl.exe --ftp-create-dirs -T "website-src/indir.html" "$baseUrl/indir.html"
curl.exe --ftp-create-dirs -T "website-src/indir.html" "$baseUrl/POF/indir.html"
curl.exe --ftp-create-dirs -T "website-src/en/indir.html" "$baseUrl/en/indir.html"
curl.exe --ftp-create-dirs -T "website-src/en/indir.html" "$baseUrl/POF/en/indir.html"

# 3. Installer (x64) -> updates
Write-Host "[3/6] Uploading Installer (x64) to updates/ ..." -ForegroundColor Yellow
curl.exe --ftp-create-dirs -T "release/AetherNode POF-v2.0.1-x64.exe" "$baseUrl/updates/AetherNode%20POF-v2.0.1-x64.exe"

# 4. Portable -> updates
Write-Host "[4/6] Uploading Portable to updates/ ..." -ForegroundColor Yellow
curl.exe --ftp-create-dirs -T "release/AetherNode POF-v2.0.1-portable.exe" "$baseUrl/updates/AetherNode%20POF-v2.0.1-portable.exe"

# 5. Installer (x64) -> POF/updates
Write-Host "[5/6] Uploading Installer (x64) to POF/updates/ ..." -ForegroundColor Yellow
curl.exe --ftp-create-dirs -T "release/AetherNode POF-v2.0.1-x64.exe" "$baseUrl/POF/updates/AetherNode%20POF-v2.0.1-x64.exe"

# 6. Portable -> POF/updates
Write-Host "[6/6] Uploading Portable to POF/updates/ ..." -ForegroundColor Yellow
curl.exe --ftp-create-dirs -T "release/AetherNode POF-v2.0.1-portable.exe" "$baseUrl/POF/updates/AetherNode%20POF-v2.0.1-portable.exe"

Write-Host "`n========================================================" -ForegroundColor Green
Write-Host "🎉 ALL v2.0.1 PACKAGES & WEB PAGES UPLOADED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "========================================================`n" -ForegroundColor Green
