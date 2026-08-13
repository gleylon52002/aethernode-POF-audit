Add-Type -AssemblyName System.Drawing
$ErrorActionPreference = "Stop"
$src = "C:\Users\Mehmet\Desktop\projelerim\browser\logo.png"
$outIcon = "C:\Users\Mehmet\Desktop\projelerim\browser\resources\icons\icon.ico"
$outPof = "C:\Users\Mehmet\Desktop\projelerim\browser\resources\icons\pof.ico"

if (!(Test-Path $src)) { throw "logo.png bulunamadi: $src" }

# Kaynak görseli yükle
$srcImg = [System.Drawing.Image]::FromFile($src)
Write-Host "Kaynak: $($srcImg.Width)x$($srcImg.Height) PixelFormat=$($srcImg.PixelFormat)"

function New-SquareBitmap($img, $size) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.Clear([System.Drawing.Color]::Transparent)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  # Orantıyı koru, ortala
  $scale = [Math]::Min($size / $img.Width, $size / $img.Height)
  $w = [int]($img.Width * $scale)
  $h = [int]($img.Height * $scale)
  $x = [int](($size - $w) / 2)
  $y = [int](($size - $h) / 2)
  $g.DrawImage($img, $x, $y, $w, $h)
  $g.Dispose()
  return $bmp
}

# Tek 256 boyutlu ikon (Windows tüm boyutlara ölçekler, çok boyutlu için png-to-ico gerekir ama tek 256 de yeterli)
try {
  $bmp256 = New-SquareBitmap $srcImg 256
  $hIcon = $bmp256.GetHicon()
  $icon = [System.Drawing.Icon]::FromHandle($hIcon)
  $fs = [System.IO.File]::Create($outIcon)
  $icon.Save($fs)
  $fs.Close()
  [System.Runtime.InteropServices.Marshal]::FreeHGlobal($hIcon) | Out-Null
  $bmp256.Dispose()
  $icon.Dispose()
  Write-Host "icon.ico olusturuldu: $outIcon"
  Copy-Item -Path $outIcon -Destination $outPof -Force
  Write-Host "pof.ico kopyalandi: $outPof"
  Get-Item $outIcon, $outPof | Select-Object Name, Length, LastWriteTime | Format-Table -AutoSize | Out-String | Write-Host
} finally {
  $srcImg.Dispose()
}

# Dogrula
if (!(Test-Path $outIcon)) { throw "icon.ico olusturulamadi" }
if (!(Test-Path $outPof)) { throw "pof.ico olusturulamadi" }
Write-Host "ICON OK"
