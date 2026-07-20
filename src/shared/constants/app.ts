// Marka, tasarım ve genel uygulama sabitleri.
export const APP = {
  name: 'AetherNode Secure Browser',
  shortName: 'AetherNode',
  appId: 'com.aethernode.browser',
  version: '0.1.0',
} as const;

// Renderer'ın yüklendiği Vite dev sunucu adresi (geliştirme).
// Vite dev, kök dizin altındaki tüm dosyalara hizmet eder; index.html
// src/renderer/ altında olduğu için yol açıkça belirtilir.
export const DEV_SERVER_URL = 'http://localhost:5173/src/renderer/index.html';

// Production'da paketlenmiş renderer (file://).
// Vite html'i, kaynağındaki göreli konuma göre yazar; bu durumda
// dist/src/renderer/index.html. dist-electron/main'in yanından göreli yol:
//   ../dist-electron/main  -> dist/src/renderer/index.html
//   -> ../../dist/src/renderer/index.html
export const PROD_RENDERER_FILE = '../../dist/src/renderer/index.html';

// Şifreleme parametreleri.
export const CRYPTO = {
  algorithm: 'aes-256-gcm',
  keyBits: 256,
  ivBytes: 12,
  pbkdf2: {
    iterations: 310_000,
    hash: 'sha512',
    saltBytes: 16,
  },
  argon2: {
    type: 2, // argon2id
    memoryCost: 19_456, // 19 MiB
    timeCost: 3,
    parallelism: 1,
  },
} as const;

// Sekme oluşturma için başlangıç sayfası (Dashboard rotası).
export const NEW_TAB_URL = 'aethernode://dashboard';

// Desteklenen arama motorları.
export const SEARCH_ENGINES = [
  'duckduckgo',
  'startpage',
  'brave',
  'google',
  'searxng',
  'bing',
  'yandex',
  'ecosia',
  'qwant',
] as const;
export type SearchEngine = (typeof SEARCH_ENGINES)[number];

// User-Agent kimlikleri — sekme webview'larına uygulanır.
// 'default' Electron'un kendi UA'sını kullanır.
export const USER_AGENTS = {
  default: '',
  'chrome-windows':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'firefox-windows':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0',
  'edge-windows':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0',
  'safari-mac':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
  android:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
  iphone:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
} as const;
export type UserAgentId = keyof typeof USER_AGENTS;

// DoH sağlayıcı ön ayarları (SecureDnsManager karşılığı).
export const DOH_PROVIDERS = {
  cloudflare: 'https://cloudflare-dns.com/dns-query',
  'cloudflare-mozilla': 'https://mozilla.cloudflare-dns.com/dns-query',
  quad9: 'https://dns.quad9.net/dns-query',
  nextdns: 'https://dns.nextdns.io',
} as const;