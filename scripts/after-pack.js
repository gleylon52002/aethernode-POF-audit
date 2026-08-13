/**
 * Windows'ta winCodeSign symlink hatasını atlamak için
 * signAndEditExecutable: false kullanıyoruz; icon + sürüm bilgisini
 * afterPack ile rcedit üzerinden gömüyoruz.
 */
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')

function findRcedit() {
  const cacheRoot = path.join(
    process.env.LOCALAPPDATA || '',
    'electron-builder',
    'Cache',
    'winCodeSign',
  )
  if (fs.existsSync(cacheRoot)) {
    const dirs = fs
      .readdirSync(cacheRoot, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => path.join(cacheRoot, d.name, 'rcedit-x64.exe'))
    const found = dirs.find((p) => fs.existsSync(p))
    if (found) return found
  }
  // Fallback: rcedit npm paketinin binary'si (cache yoksa)
  try {
    const rceditPkg = require.resolve('rcedit/bin/rcedit-x64.exe')
    if (fs.existsSync(rceditPkg)) return rceditPkg
  } catch {}
  try {
    const rceditPkg2 = require.resolve('rcedit')
    // rcedit paketi JS wrapper, binary'i ayrı
    const bin = path.join(path.dirname(rceditPkg2), '..', 'bin', 'rcedit-x64.exe')
    if (fs.existsSync(bin)) return bin
  } catch {}
  return null
}

async function setIconViaRcedit(exePath, iconPath) {
  // Önce rcedit npm paketinin JS API'sini dene (cache bağımsız)
  try {
    const rcedit = require('rcedit')
    await rcedit(exePath, { icon: iconPath })
    return true
  } catch (e) {
    console.warn(`[after-pack] rcedit npm API hatası: ${e.message}`)
  }
  // Fallback: cache'deki rcedit-x64.exe
  const rceditBin = findRcedit()
  if (!rceditBin) return false
  execFileSync(rceditBin, [exePath, '--set-icon', iconPath], { stdio: 'inherit' })
  return true
}

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'win32') return

  const productName = context.packager.appInfo.productFilename
  const exePath = path.join(context.appOutDir, `${productName}.exe`)
  let iconPath = path.join(context.packager.projectDir, 'resources', 'icons', 'icon.ico')
  if (!fs.existsSync(iconPath)) {
    const logoPng = path.join(context.packager.projectDir, 'logo.png')
    if (fs.existsSync(logoPng)) iconPath = logoPng
  }
  const version = context.packager.appInfo.version || '1.0.0'

  if (!fs.existsSync(exePath)) {
    console.warn(`[after-pack] exe bulunamadı: ${exePath}`)
    return
  }
  if (!fs.existsSync(iconPath)) {
    console.warn(`[after-pack] icon bulunamadı: ${iconPath}`)
    return
  }

  const exePaths = [exePath]
  // Portable exe de varsa ona da uygula (afterPack sadece unpacked için çağrılır ama kontrol et)
  const portablePath = path.join(path.dirname(context.appOutDir), `${productName}-v${context.packager.appInfo.version}-portable.exe`)
  if (fs.existsSync(portablePath)) exePaths.push(portablePath)

  for (const p of exePaths) {
    const ok = await setIconViaRcedit(p, iconPath)
    if (ok) console.log(`[after-pack] icon gömüldü → ${p}`)
    else console.warn(`[after-pack] rcedit bulunamadı; icon gömülemedi: ${p}`)
  }

  // Version string'leri de rcedit ile ayarla (cache varsa)
  const rceditBin = findRcedit()
  if (rceditBin) {
    for (const p of exePaths) {
      try {
        execFileSync(rceditBin, [p, '--set-version-string', 'FileDescription', productName, '--set-version-string', 'ProductName', productName, '--set-file-version', version, '--set-product-version', version], { stdio: 'inherit' })
      } catch {}
    }
  }
  console.log(`[after-pack] v${version} tamamlandı`)
}
