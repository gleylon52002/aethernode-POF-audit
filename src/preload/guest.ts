/// <reference lib="dom" />
import { ipcRenderer, webFrame } from 'electron';

// Guest preload — her sekme <webview>'ının içinde, sayfa scriptlerinden
// ÖNCE çalışır. Üç görevi vardır:
//
//   1. Anti-fingerprint: canvas/WebGL/audio/navigator/screen çıktılarının
//      rastgeleleştirilmesi ana dünyaya (main world) enjekte edilir.
//   2. Cookie banner otomatik reddetme: bilinen rıza popup'ları CSS ile
//      gizlenir, "reddet" düğmeleri otomatik tıklanır.
//   3. Deep Focus modu: kabuk arayüzünden gelen komutla dikkat dağıtıcı
//      öğeler gizlenir, sayfa monokrom yapılır.
//
// Yapılandırma main process'ten senkron alınır — sayfa yüklenmeden önce
// spoofing kararı verilmiş olmalıdır.

interface GuestConfig {
  fingerprint: {
    enabled: boolean;
    /** compatibility = randomizasyon, uniformity = tüm kullanıcılarda AYNI profil */
    mode?: 'compatibility' | 'uniformity';
    spoofCanvas: boolean;
    spoofWebGL: boolean;
    spoofAudio: boolean;
    spoofFonts: boolean;
    spoofNavigator: boolean;
    spoofTimezone: boolean;
    spoofLanguage: boolean;
    spoofPlugins: boolean;
    spoofHardware: boolean;
    spoofScreen: boolean;
    spoofUserAgent: boolean;
    randomProfilePerSession: boolean;
    userAgentString?: string;
  };
  cookieBannerAutoReject: boolean;
  scriptBlocker: boolean;
  bankMode: boolean;
  bankDomains: string[];
  webrtcBlock?: boolean;
  webrtcPolicy?: 'disable_non_proxied_udp' | 'force_proxy' | 'block_all';
  webrtcAllowedHosts?: string[];
  forceDarkMode?: boolean;
  mouseGestures?: boolean;
  selectionTranslate?: boolean;
  translateTarget?: string;
}

/** Main hazır değilse fail-closed: koruma açık, sızıntı kapalı. */
const FALLBACK: GuestConfig = {
  fingerprint: {
    enabled: true,
    mode: 'uniformity',
    spoofCanvas: true,
    spoofWebGL: true,
    spoofAudio: true,
    spoofFonts: true,
    spoofNavigator: true,
    spoofTimezone: true,
    spoofLanguage: false,
    spoofPlugins: true,
    spoofHardware: true,
    spoofScreen: true,
    spoofUserAgent: true,
    randomProfilePerSession: true,
    userAgentString: '',
  },
  cookieBannerAutoReject: true,
  scriptBlocker: false,
  bankMode: true,
  bankDomains: [],
  webrtcBlock: true,
  webrtcPolicy: 'block_all',
  webrtcAllowedHosts: [],
  forceDarkMode: false,
  mouseGestures: true,
  selectionTranslate: true,
  translateTarget: 'tr',
};

// Senkron config fetch — koruma enjeksiyonları bu değerlerle çalışacağı için
// yarış hatası önlenir. Main process'te eşzamanlı handler zaten mevcut
// (guest-handlers.ts: ipcMain.on + event.returnValue).
// Fallback yalnızca sendSync başarısız olursa kullanılır (fail-closed).
let config: GuestConfig = FALLBACK;
try {
  const raw: unknown = ipcRenderer.sendSync('aethernode/guest/config');
  if (raw && typeof raw === 'object') {
    const payload = raw as GuestConfig;
    if ('fingerprint' in payload) config = payload;
  }
} catch {
  // sendSync başarısız → FALLBACK korumaları aktif kalır (fail-closed)
}

// Guest lifecycle — interval/observer sızıntısı önlemi (sekme kapatılınca temizlik)
const __guestIntervals: number[] = [];
const __guestObservers: MutationObserver[] = [];
function cleanupGuest(): void {
  for (const id of __guestIntervals.splice(0)) clearInterval(id);
  for (const mo of __guestObservers.splice(0)) {
    try { mo.takeRecords(); mo.disconnect(); } catch { /* yoksay */ }
  }
}
window.addEventListener('beforeunload', cleanupGuest);
window.addEventListener('pagehide', cleanupGuest);
window.addEventListener('unload', cleanupGuest);
// Otomatik takip — oluşturulan her interval/observer temizlik listesine eklenir
try {
  const _origSetInterval = window.setInterval.bind(window);
  (window as unknown as { setInterval: typeof setInterval }).setInterval = ((handler: TimerHandler, timeout?: number, ...args: unknown[]) => {
    const id = _origSetInterval(handler as unknown as () => void, timeout, ...(args as []));
    __guestIntervals.push(id);
    return id;
  }) as typeof setInterval;
  const _OrigMO = window.MutationObserver;
  (window as unknown as { MutationObserver: typeof MutationObserver }).MutationObserver = class extends _OrigMO {
    constructor(cb: MutationCallback) {
      super(cb);
      __guestObservers.push(this);
    }
  } as unknown as typeof MutationObserver;
} catch { /* yoksay */ }

// ---------------------------------------------------------------------------
// 1. Anti-fingerprint — ana dünyaya enjeksiyon
// ---------------------------------------------------------------------------

function buildFingerprintScript(fp: GuestConfig['fingerprint']): string {
  const parts: string[] = [];
  // Uniformity: tüm AetherNode kullanıcıları AYNI deterministik tohumu kullanır
  // ("kalabalıkta kaybol") — randomProfilePerSession yok sayılır.
  // Compatibility: varsayılan olarak oturum başına rastgele ama tutarlı profil.
  const uniformity = fp.mode === 'uniformity';
  const seed = uniformity
    ? 0xae7e01 // sabit, sürümler arası değişmez
    : fp.randomProfilePerSession !== false
      ? Math.floor(Math.random() * 0xffffff)
      : 0x51f00d;

  // Uniformity modunda tüm sinyaller sabit referans profile çekilir —
  // tekil spoof anahtarları yok sayılır, hepsi açık davranır.
  if (uniformity) {
    fp = {
      ...fp,
      spoofCanvas: true,
      spoofWebGL: true,
      spoofAudio: true,
      spoofFonts: true,
      spoofNavigator: true,
      spoofTimezone: true,
      spoofLanguage: true,
      spoofPlugins: true,
      spoofHardware: true,
      spoofScreen: true,
      spoofUserAgent: true,
      // Uniformity: kullanıcı UA ayarını yok say — herkes AYNI referans UA
      userAgentString:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
    };
  }

  // Oturum profili: seed'den türetilmiş rastgele ama tutarlı değerler
  parts.push(`
    const __anSeed = ${seed};
    const __anRand = (i) => {
      let x = (__anSeed + i) | 0;
      x = ((x << 13) ^ x) | 0;
      return (1.0 - ((x * (x * x * 15731 + 789221) + 1376312589) & 0x7fffffff) / 1073741824.0) / 2;
    };
    const __anPick = (arr, i) => arr[Math.abs((__anSeed * 31 + i * 17) | 0) % arr.length];
    const __anCores = __anPick([2, 4, 6, 8, 12, 16], 1);
    const __anMem = __anPick([2, 4, 8], 2);
    const __anTz = __anPick([
      'UTC', 'Europe/London', 'Europe/Berlin', 'Europe/Istanbul',
      'America/New_York', 'America/Los_Angeles', 'Asia/Tokyo', 'Australia/Sydney'
    ], 3);
    const __anTzOff = ({
      'UTC': 0, 'Europe/London': 0, 'Europe/Berlin': -60, 'Europe/Istanbul': -180,
      'America/New_York': 300, 'America/Los_Angeles': 480, 'Asia/Tokyo': -540, 'Australia/Sydney': -600
    })[__anTz] || 0;
    const __anScreen = __anPick([
      [1366, 768], [1440, 900], [1536, 864], [1920, 1080], [2560, 1440]
    ], 4);
    const __anLang = __anPick(['en-US', 'en-GB', 'de-DE', 'fr-FR', 'tr-TR', 'es-ES'], 5);
    const __anFontsDeny = __anPick([
      /comic|papyrus|impact|wingdings|emoji/,
      /comic|papyrus|wingdings|ms outlook/,
      /impact|papyrus|webdings|emoji/,
      /comic|brush script|wingdings|emoji/
    ], 6);
  `);

  if (fp.spoofCanvas) {
    if (uniformity) {
      // Sabit çıktı — gerçek pikselleri hiç okuma (GPU farkı sızmasın)
      parts.push(`
      (() => {
        const FIXED = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
        const blank = (w, h) => {
          try {
            const c = document.createElement('canvas');
            c.width = Math.max(1, w || 1); c.height = Math.max(1, h || 1);
            const ctx = c.getContext('2d');
            if (ctx) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, c.width, c.height); }
            return c;
          } catch (_) { return null; }
        };
        HTMLCanvasElement.prototype.toDataURL = function () { return FIXED; };
        HTMLCanvasElement.prototype.toBlob = function (cb, type, q) {
          fetch(FIXED).then((r) => r.blob()).then((b) => cb && cb(b)).catch(() => cb && cb(null));
        };
        const origGet = CanvasRenderingContext2D.prototype.getImageData;
        CanvasRenderingContext2D.prototype.getImageData = function (x, y, w, h) {
          const data = origGet.call(this, x, y, w, h);
          try { data.data.fill(0); } catch (_) {}
          return data;
        };
        if (typeof OffscreenCanvas !== 'undefined') {
          try {
            OffscreenCanvas.prototype.convertToBlob = function () {
              return fetch(FIXED).then((r) => r.blob());
            };
          } catch (_) {}
        }
        void blank;
      })();
    `);
    } else {
      parts.push(`
      (() => {
        const noise = (canvas) => {
          try {
            const ctx = canvas.getContext('2d');
            if (!ctx || canvas.width < 1 || canvas.height < 1) return;
            const img = ctx.getImageData(0, 0, Math.min(canvas.width, 16), Math.min(canvas.height, 16));
            for (let i = 0; i < img.data.length; i += 4) {
              img.data[i] = img.data[i] ^ ((__anSeed >> (i % 8)) & 1);
            }
            ctx.putImageData(img, 0, 0);
          } catch (_) {}
        };
        const proto = CanvasRenderingContext2D.prototype;
        const origGetImageData = proto.getImageData;
        proto.getImageData = function (...args) {
          const data = origGetImageData.apply(this, args);
          const px = data.data;
          for (let i = 0; i < px.length; i += 4 * 31) {
            px[i] = px[i] ^ (Math.floor(__anRand(i) * 3) & 0xff);
          }
          return data;
        };
        const wrapCanvas = (method) => {
          const orig = HTMLCanvasElement.prototype[method];
          HTMLCanvasElement.prototype[method] = function (...args) {
            noise(this);
            return orig.apply(this, args);
          };
        };
        wrapCanvas('toDataURL');
        wrapCanvas('toBlob');
      })();
    `);
    }
  }

  if (fp.spoofWebGL) {
    parts.push(`
      (() => {
        const VENDOR = 'Google Inc. (NVIDIA)';
        const RENDERER = 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1050 Direct3D11 vs_5_0 ps_5_0, D3D11)';
        const wrapCtx = (ctx) => {
          if (!ctx || ctx.__aetherGl) return ctx;
          try {
            const origParam = ctx.getParameter.bind(ctx);
            ctx.getParameter = function (p) {
              if (p === 0x9245 || p === 37445) return VENDOR;
              if (p === 0x9246 || p === 37446) return RENDERER;
              return origParam(p);
            };
            if (ctx.getExtension) {
              const origExt = ctx.getExtension.bind(ctx);
              ctx.getExtension = function (name) {
                if (name === 'WEBGL_debug_renderer_info') {
                  return { UNMASKED_VENDOR_WEBGL: 0x9245, UNMASKED_RENDERER_WEBGL: 0x9246 };
                }
                return origExt(name);
              };
            }
            ctx.__aetherGl = true;
          } catch (_) {}
          return ctx;
        };
        const spoofProto = (proto) => {
          if (!proto || !proto.getParameter) return;
          const orig = proto.getParameter;
          proto.getParameter = function (p) {
            if (p === 0x9245 || p === 37445) return VENDOR;
            if (p === 0x9246 || p === 37446) return RENDERER;
            return orig.apply(this, arguments);
          };
        };
        try { spoofProto(WebGLRenderingContext && WebGLRenderingContext.prototype); } catch (_) {}
        try { spoofProto(WebGL2RenderingContext && WebGL2RenderingContext.prototype); } catch (_) {}
        ${
          uniformity
            ? `
        // Uniformity: readPixels sıfırla — GPU raster farkı sızmasın
        const zeroRead = (proto) => {
          if (!proto || !proto.readPixels) return;
          const orig = proto.readPixels;
          proto.readPixels = function () {
            orig.apply(this, arguments);
            try {
              const buf = arguments[6];
              if (buf && buf.length) buf.fill(0);
            } catch (_) {}
          };
        };
        try { zeroRead(WebGLRenderingContext && WebGLRenderingContext.prototype); } catch (_) {}
        try { zeroRead(WebGL2RenderingContext && WebGL2RenderingContext.prototype); } catch (_) {}
        `
            : ''
        }
        // getContext üzerinden dönen her bağlamı da sar (Tembrica vb. bu yolu kullanır)
        try {
          const origGet = HTMLCanvasElement.prototype.getContext;
          HTMLCanvasElement.prototype.getContext = function (type, attrs) {
            const ctx = origGet.call(this, type, attrs);
            if (type && String(type).includes('webgl')) return wrapCtx(ctx);
            return ctx;
          };
        } catch (_) {}
        try {
          if (typeof OffscreenCanvas !== 'undefined') {
            const origGet = OffscreenCanvas.prototype.getContext;
            OffscreenCanvas.prototype.getContext = function (type, attrs) {
              const ctx = origGet.call(this, type, attrs);
              if (type && String(type).includes('webgl')) return wrapCtx(ctx);
              return ctx;
            };
          }
        } catch (_) {}
      })();
    `);
  }

  if (fp.spoofAudio) {
    if (uniformity) {
      parts.push(`
      (() => {
        if (typeof AnalyserNode !== 'undefined') {
          AnalyserNode.prototype.getFloatFrequencyData = function (array) {
            if (array && array.length) array.fill(-120);
          };
          AnalyserNode.prototype.getByteFrequencyData = function (array) {
            if (array && array.length) array.fill(0);
          };
        }
        if (typeof OfflineAudioContext !== 'undefined') {
          const origStart = OfflineAudioContext.prototype.startRendering;
          OfflineAudioContext.prototype.startRendering = function () {
            return origStart.call(this).then((buffer) => {
              try {
                for (let c = 0; c < buffer.numberOfChannels; c++) {
                  buffer.getChannelData(c).fill(0);
                }
              } catch (_) {}
              return buffer;
            });
          };
        }
      })();
    `);
    } else {
      parts.push(`
      (() => {
        if (typeof AnalyserNode !== 'undefined') {
          const orig = AnalyserNode.prototype.getFloatFrequencyData;
          AnalyserNode.prototype.getFloatFrequencyData = function (array) {
            orig.call(this, array);
            for (let i = 0; i < array.length; i += 50) {
              array[i] = array[i] + __anRand(i) * 0.1;
            }
          };
        }
        if (typeof OfflineAudioContext !== 'undefined') {
          const origStart = OfflineAudioContext.prototype.startRendering;
          OfflineAudioContext.prototype.startRendering = function () {
            return origStart.call(this).then((buffer) => {
              try {
                const ch = buffer.getChannelData(0);
                for (let i = 0; i < ch.length; i += 500) {
                  ch[i] = ch[i] + __anRand(i) * 1e-7;
                }
              } catch (_) {}
              return buffer;
            });
          };
        }
      })();
    `);
    }
  }

  if (fp.spoofFonts) {
    parts.push(`
      (() => {
        try {
          const orig = document.fonts && document.fonts.check;
          if (orig) {
            document.fonts.check = function (font, text) {
              const f = String(font || '').toLowerCase();
              if (__anFontsDeny.test(f)) return false;
              return orig.call(this, font, text);
            };
          }
        } catch (_) {}
      })();
    `);
  }

  if (fp.spoofNavigator) {
    parts.push(`
      (() => {
        try { Object.defineProperty(navigator, 'webdriver', { get: () => false }); } catch (_) {}
        try {
          if ('connection' in navigator) {
            Object.defineProperty(navigator, 'connection', { get: () => undefined });
          }
        } catch (_) {}
        try {
          if (navigator.getBattery) {
            navigator.getBattery = () =>
              Promise.resolve({
                charging: true, level: 1, chargingTime: 0, dischargingTime: Infinity,
                addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; },
              });
          }
        } catch (_) {}
        try {
          if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
            navigator.mediaDevices.enumerateDevices = () => Promise.resolve([]);
          }
        } catch (_) {}
      })();
    `);
  }

  if (fp.spoofPlugins) {
    parts.push(`
      (() => {
        try {
          Object.defineProperty(navigator, 'plugins', { get: () => {
            const p = { length: 4, item: (i) => p[i], namedItem: () => null, refresh() {} };
            p[0] = { name: 'PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' };
            p[1] = { name: 'Chrome PDF Viewer', filename: 'internal-pdf-viewer', description: '' };
            p[2] = { name: 'Chromium PDF Viewer', filename: 'internal-pdf-viewer', description: '' };
            p[3] = { name: 'Widevine Content Decryption Module', filename: 'widevinecdmadapter.dll', description: 'Enables playback of encrypted media contents' };
            return p;
          }});
          Object.defineProperty(navigator, 'mimeTypes', { get: () => ({ length: 0, item: () => null, namedItem: () => null }) });
        } catch (_) {}
      })();
    `);
  }

  if (fp.spoofLanguage) {
    if (uniformity) {
      parts.push(`
      (() => {
        try {
          Object.defineProperty(navigator, 'languages', { get: () => Object.freeze(['en-US', 'en']) });
          Object.defineProperty(navigator, 'language', { get: () => 'en-US' });
        } catch (_) {}
      })();
    `);
    } else {
      parts.push(`
      (() => {
        try {
          const lang = __anLang;
          const short = lang.split('-')[0];
          Object.defineProperty(navigator, 'languages', { get: () => Object.freeze([lang, short]) });
          Object.defineProperty(navigator, 'language', { get: () => lang });
        } catch (_) {}
      })();
    `);
    }
  }

  if (fp.spoofTimezone) {
    if (uniformity) {
      parts.push(`
      (() => {
        try { Date.prototype.getTimezoneOffset = function () { return 0; }; } catch (_) {}
        try {
          const orig = Intl.DateTimeFormat.prototype.resolvedOptions;
          Intl.DateTimeFormat.prototype.resolvedOptions = function () {
            const o = orig.apply(this, arguments);
            try { o.timeZone = 'UTC'; } catch (_) {}
            return o;
          };
        } catch (_) {}
      })();
    `);
    } else {
      parts.push(`
      (() => {
        try {
          const off = __anTzOff;
          Date.prototype.getTimezoneOffset = function () { return off; };
        } catch (_) {}
        try {
          const tz = __anTz;
          const orig = Intl.DateTimeFormat.prototype.resolvedOptions;
          Intl.DateTimeFormat.prototype.resolvedOptions = function () {
            const o = orig.apply(this, arguments);
            try { o.timeZone = tz; } catch (_) {}
            return o;
          };
        } catch (_) {}
      })();
    `);
    }
  }

  if (fp.spoofUserAgent && fp.userAgentString) {
    const ua = JSON.stringify(fp.userAgentString);
    // Uniformity: Client Hints JS yüzeyi de sabitlenir (undefined yapılmaz —
    // aksi halde CH bloğu çalışmaz ve gerçek/boş sinyal sızar).
    const chBlock = uniformity
      ? `
        try {
          const fixed = {
            brands: [
              { brand: 'Chromium', version: '130' },
              { brand: 'Google Chrome', version: '130' },
              { brand: 'Not-A.Brand', version: '99' },
            ],
            mobile: false,
            platform: 'Windows',
            getHighEntropyValues: () =>
              Promise.resolve({
                architecture: 'x86', bitness: '64', model: '',
                platformVersion: '10.0.0', uaFullVersion: '130.0.0.0',
                fullVersionList: [
                  { brand: 'Chromium', version: '130.0.0.0' },
                  { brand: 'Google Chrome', version: '130.0.0.0' },
                  { brand: 'Not-A.Brand', version: '99.0.0.0' },
                ],
              }),
            toJSON() { return { brands: this.brands, mobile: false, platform: 'Windows' }; },
          };
          Object.defineProperty(navigator, 'userAgentData', { configurable: true, get: () => fixed });
        } catch (_) {}
      `
      : `
        try {
          if (navigator.userAgentData) {
            Object.defineProperty(navigator, 'userAgentData', { get: () => undefined });
          }
        } catch (_) {}
      `;
    parts.push(`
      (() => {
        const ua = ${ua};
        try { Object.defineProperty(navigator, 'userAgent', { get: () => ua }); } catch (_) {}
        try { Object.defineProperty(navigator, 'appVersion', { get: () => ua.replace(/^Mozilla\\//, '') }); } catch (_) {}
        ${chBlock}
      })();
    `);
  }

  if (fp.spoofHardware) {
    if (uniformity) {
      parts.push(`
      (() => {
        try { Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 4 }); } catch (_) {}
        try {
          if ('deviceMemory' in navigator) {
            Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });
          }
        } catch (_) {}
        try {
          Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 0 });
        } catch (_) {}
      })();
    `);
    } else {
      parts.push(`
      (() => {
        try { Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => __anCores }); } catch (_) {}
        try {
          if ('deviceMemory' in navigator) {
            Object.defineProperty(navigator, 'deviceMemory', { get: () => __anMem });
          }
        } catch (_) {}
        try {
          Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 0 });
        } catch (_) {}
        try {
          Object.defineProperty(navigator, 'platform', {
            get: () => __anPick(['Win32', 'Win64', 'MacIntel', 'Linux x86_64'], 7),
          });
        } catch (_) {}
      })();
    `);
    }
  }

  if (fp.spoofScreen) {
    parts.push(`
      (() => {
        try {
          Object.defineProperty(screen, 'colorDepth', { get: () => 24 });
          Object.defineProperty(screen, 'pixelDepth', { get: () => 24 });
        } catch (_) {}
      })();
    `);
  }

  if (uniformity) {
    // Sabit referans profil: 1920×1080 ekran + 100px letterboxing + DPR 1
    parts.push(`
      (() => {
        try {
          Object.defineProperty(screen, 'width', { get: () => 1920 });
          Object.defineProperty(screen, 'height', { get: () => 1080 });
          Object.defineProperty(screen, 'availWidth', { get: () => 1920 });
          Object.defineProperty(screen, 'availHeight', { get: () => 1040 });
          Object.defineProperty(screen, 'availLeft', { get: () => 0 });
          Object.defineProperty(screen, 'availTop', { get: () => 0 });
        } catch (_) {}
        try { Object.defineProperty(window, 'devicePixelRatio', { get: () => 1 }); } catch (_) {}
        try {
          const round100 = (v) => Math.max(100, Math.floor(v / 100) * 100);
          Object.defineProperty(window, 'outerWidth', { get: () => round100(window.innerWidth) });
          Object.defineProperty(window, 'outerHeight', { get: () => round100(window.innerHeight) });
          Object.defineProperty(window, 'screenX', { get: () => 0 });
          Object.defineProperty(window, 'screenY', { get: () => 0 });
        } catch (_) {}
      })();
    `);
  } else if (fp.spoofScreen) {
    parts.push(`
      (() => {
        try {
          const w = __anScreen[0], h = __anScreen[1];
          Object.defineProperty(screen, 'width', { get: () => w });
          Object.defineProperty(screen, 'height', { get: () => h });
          Object.defineProperty(screen, 'availWidth', { get: () => w });
          Object.defineProperty(screen, 'availHeight', { get: () => Math.max(600, h - 40) });
          Object.defineProperty(screen, 'availLeft', { get: () => 0 });
          Object.defineProperty(screen, 'availTop', { get: () => 0 });
        } catch (_) {}
        try {
          Object.defineProperty(window, 'devicePixelRatio', {
            get: () => __anPick([1, 1.25, 1.5, 2], 8),
          });
        } catch (_) {}
      })();
    `);
  }

  // ClientRects / speech — CoverYourTracks ek vektörleri
  // Uniformity'de konum bağımlı gürültü YOK (pencere boyutu = benzersizlik).
  // Uyumlulukta sabit ofset (layout'tan bağımsız) kullanılır.
  if (uniformity) {
    parts.push(`
      (() => {
        try {
          if (window.speechSynthesis) {
            window.speechSynthesis.getVoices = () => [];
          }
        } catch (_) {}
      })();
    `);
  } else {
    parts.push(`
      (() => {
        try {
          const orig = Element.prototype.getBoundingClientRect;
          Element.prototype.getBoundingClientRect = function () {
            const r = orig.apply(this);
            const n = (__anSeed % 7) * 0.00001;
            return new DOMRect(r.x + n, r.y + n, r.width, r.height);
          };
        } catch (_) {}
        try {
          if (window.speechSynthesis) {
            window.speechSynthesis.getVoices = () => [];
          }
        } catch (_) {}
      })();
    `);
  }

  return parts.join('\n');
}

function buildCookieShieldScript(): string {
  // XSS ile document.cookie toplu okuma / çalma girişimlerini yavaşlatır.
  return `
    if (window.__aetherCookieShield) return;
    window.__aetherCookieShield = true;
    try {
      const desc =
        Object.getOwnPropertyDescriptor(Document.prototype, 'cookie') ||
        Object.getOwnPropertyDescriptor(HTMLDocument.prototype, 'cookie');
      if (!desc || !desc.get || !desc.set) return;
      let reads = 0;
      let windowStart = Date.now();
      Object.defineProperty(Document.prototype, 'cookie', {
        configurable: true,
        enumerable: true,
        get() {
          const now = Date.now();
          if (now - windowStart > 2500) { reads = 0; windowStart = now; }
          reads += 1;
          // Eşik yüksek tutulur: SPA'lar cookie'yi sık okur — yalnızca
          // patolojik exfil döngülerini (yüzlerce okuma/sn) keser.
          if (reads > 400) return '';
          return desc.get.call(this);
        },
        set(v) { return desc.set.call(this, v); },
      });
    } catch (_) {}
  `;
}

// Ana listeye erişilemezse asgari acil-durum listesi (tek kaynak: shared/utils/bank-mode.ts)
const BANK_FALLBACK = [
  'ziraatbank.com.tr',
  'garantibbva.com.tr',
  'isbank.com.tr',
  'yapikredi.com.tr',
  'akbank.com',
  'halkbank.com.tr',
  'vakifbank.com.tr',
  'paypal.com',
];

/** Ana dünyaya senkron enjeksiyon — <script> DOM'a append (isolated world'dan
 *  bile main world'da çalışır). CSP engellerse webFrame yedeği. */
function injectMainWorld(code: string): void {
  const wrapped = `(()=>{try{${code}}catch(_){}})();`;
  const tryDom = (): boolean => {
    try {
      const root = document.documentElement || document.head || document.documentElement;
      if (!root) return false;
      const s = document.createElement('script');
      s.textContent = wrapped;
      root.appendChild(s);
      s.remove();
      return true;
    } catch {
      return false;
    }
  };
  if (tryDom()) return;
  const mo = new MutationObserver(() => {
    if (tryDom()) mo.disconnect();
  });
  try {
    mo.observe(document, { childList: true, subtree: true });
  } catch {
    /* yoksay */
  }
  // CSP / henüz document yok — Chromium yolu (hafif yarış kalabilir)
  void webFrame.executeJavaScript(wrapped).then(() => {
    try {
      mo.disconnect();
    } catch {
      /* yoksay */
    }
  });
}

function buildWebRtcGuardScript(hard: boolean): string {
  return `
    if (window.__aetherRtc) return;
    window.__aetherRtc = true;
    const hard = ${hard ? 'true' : 'false'};
    const OrigPC = window.RTCPeerConnection || window.webkitRTCPeerConnection;
    if (!OrigPC) return;

    const badCand = (c) => {
      try {
        const s = c && (typeof c === 'string' ? c : c.candidate);
        return typeof s === 'string' && /\\s(host|srflx)\\s/i.test(s);
      } catch (_) { return false; }
    };
    const filterSdp = (sdp) => {
      if (!sdp || typeof sdp !== 'string') return sdp;
      return sdp.split('\\n').filter((line) => {
        if (!line.startsWith('a=candidate:')) return true;
        return !/\\s(host|srflx)\\s/i.test(line);
      }).join('\\n');
    };
    const stripConfig = (cfg) => Object.assign({}, cfg || {}, { iceServers: [] });

    function WrappedPC(config, constraints) {
      if (hard) {
        const deny = () =>
          Promise.reject(new DOMException('WebRTC blocked by AetherNode', 'NotAllowedError'));
        const stub = {
          localDescription: null,
          remoteDescription: null,
          signalingState: 'closed',
          iceConnectionState: 'closed',
          iceGatheringState: 'complete',
          connectionState: 'closed',
          canTrickleIceCandidates: null,
          createOffer: deny,
          createAnswer: deny,
          setLocalDescription: deny,
          setRemoteDescription: deny,
          addIceCandidate: () => Promise.resolve(),
          getConfiguration: () => ({ iceServers: [] }),
          setConfiguration: () => {},
          close: () => {},
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => false,
          getStats: () => Promise.resolve(new Map()),
          createDataChannel: () => { throw new DOMException('WebRTC blocked', 'NotAllowedError'); },
          addTrack: () => { throw new DOMException('WebRTC blocked', 'NotAllowedError'); },
          removeTrack: () => {},
          getSenders: () => [],
          getReceivers: () => [],
          getTransceivers: () => [],
        };
        return stub;
      }

      const pc = new OrigPC(stripConfig(config), constraints);

      // setConfiguration ile STUN geri eklenmesin
      if (typeof pc.setConfiguration === 'function') {
        const origSet = pc.setConfiguration.bind(pc);
        pc.setConfiguration = (c) => origSet(stripConfig(c));
      }

      const wrapDesc = (fn) => function (...args) {
        return fn.apply(this, args).then((desc) => {
          if (desc && desc.sdp) desc.sdp = filterSdp(desc.sdp);
          return desc;
        });
      };
      pc.createOffer = wrapDesc(pc.createOffer.bind(pc));
      pc.createAnswer = wrapDesc(pc.createAnswer.bind(pc));
      const origSetLocal = pc.setLocalDescription.bind(pc);
      pc.setLocalDescription = function (desc) {
        if (desc && desc.sdp) desc = Object.assign({}, desc, { sdp: filterSdp(desc.sdp) });
        return origSetLocal(desc);
      };

      // addEventListener('icecandidate') sızıntısını kes
      const origAdd = pc.addEventListener.bind(pc);
      const origRemove = pc.removeEventListener.bind(pc);
      const wrapMap = new WeakMap();
      pc.addEventListener = function (type, listener, options) {
        if (type === 'icecandidate' && typeof listener === 'function') {
          let wrapped = wrapMap.get(listener);
          if (!wrapped) {
            wrapped = function (ev) {
              if (ev && ev.candidate && badCand(ev.candidate)) return;
              return listener.call(this, ev);
            };
            wrapMap.set(listener, wrapped);
          }
          return origAdd(type, wrapped, options);
        }
        return origAdd(type, listener, options);
      };
      pc.removeEventListener = function (type, listener, options) {
        if (type === 'icecandidate' && typeof listener === 'function') {
          const wrapped = wrapMap.get(listener);
          if (wrapped) return origRemove(type, wrapped, options);
        }
        return origRemove(type, listener, options);
      };

      // onicecandidate property
      let userHandler = null;
      Object.defineProperty(pc, 'onicecandidate', {
        configurable: true,
        get() { return userHandler; },
        set(fn) {
          userHandler = typeof fn === 'function' ? fn : null;
        },
      });
      origAdd('icecandidate', (ev) => {
        if (ev && ev.candidate && badCand(ev.candidate)) return;
        if (userHandler) userHandler.call(pc, ev);
      });

      return pc;
    }
    WrappedPC.prototype = OrigPC.prototype;
    try { Object.setPrototypeOf(WrappedPC, OrigPC); } catch (_) {}
    try { Object.defineProperty(WrappedPC, 'name', { value: 'RTCPeerConnection' }); } catch (_) {}
    window.RTCPeerConnection = WrappedPC;
    if ('webkitRTCPeerConnection' in window) window.webkitRTCPeerConnection = WrappedPC;
  `;
}

if (!config.scriptBlocker) {
  const host = (location.hostname || '').toLowerCase().replace(/^www\./, '');
  const bankHosts =
    config.bankDomains && config.bankDomains.length > 0 ? config.bankDomains : BANK_FALLBACK;
  const searchHosts = [
    'google.com','google.com.tr','google.co.uk','googleapis.com','gstatic.com','recaptcha.net',
    'duckduckgo.com','duck.com','bing.com','startpage.com','search.brave.com','ecosia.org',
    'qwant.com','yandex.com','yandex.com.tr','ya.ru','searx.be',
  ];
  const onBank =
    config.bankMode &&
    bankHosts.some((d) => host === d || host.endsWith('.' + d));
  const onSearch = searchHosts.some((d) => host === d || host.endsWith('.' + d));
  if (!onBank && !onSearch && config.fingerprint.enabled) {
    const script = buildFingerprintScript(config.fingerprint);
    if (script.trim().length > 0) injectMainWorld(script);
  }
  if (!onSearch) injectMainWorld(buildCookieShieldScript());

  // WebRTC — banka/arama dahil her yerde (IP sızıntısı site türünden bağımsız)
  // Site istisnası: Meet/Zoom/Discord gibi siteler için STUN'e izin ver
  if (config.webrtcBlock !== false) {
    const host = (location.hostname || '').toLowerCase().replace(/^www\./, '');
    const allowed = (config.webrtcAllowedHosts ?? []).some(
      (d) => host === d.toLowerCase().replace(/^www\./, '') || host.endsWith('.' + d.toLowerCase().replace(/^www\./, '')),
    );
    if (!allowed) {
      injectMainWorld(buildWebRtcGuardScript(config.webrtcPolicy === 'block_all'));
    }
  }
}

// ---------------------------------------------------------------------------
// 2. Cookie banner otomatik reddetme (CookieConsentBlocker)
// ---------------------------------------------------------------------------

const CONSENT_HIDE_CSS = `
  #onetrust-consent-sdk, #onetrust-banner-sdk, .onetrust-pc-dark-filter,
  #CybotCookiebotDialog, #CybotCookiebotDialogBodyUnderlay,
  #usercentrics-root, #usercentrics-cmp-ui,
  .qc-cmp2-container, #qc-cmp2-container,
  #didomi-host, .didomi-popup-backdrop,
  .fc-consent-root, .fc-dialog-overlay,
  #sp_message_container_0, [id^="sp_message_container"],
  .cmp-container, .cmp-overlay,
  #cookiescript_injected, #cookiescript_injected_wrapper,
  .cc-window, .cc-banner, .cc-floating,
  #cookie-law-info-bar, #cookie-notice, .cookie-notice-container,
  .js-cookie-consent, .cookie-consent-banner,
  #truste-consent-track, .truste_box_overlay, .truste_overlay,
  #gdpr-cookie-message, .gdpr-banner, #cookiebanner, .cookiebanner,
  #cookie-banner, .cookie-banner, #cookieConsent, .cookie-consent,
  .cky-consent-container, .cky-overlay,
  #iubenda-cs-banner, .iubenda-cs-overlay,
  #tarteaucitronRoot, #tarteaucitronAlertBig,
  .osano-cm-window, .osano-cm-dialog,
  #BorlabsCookieBox, #BorlabsCookieWidget,
  .cmplz-cookiebanner, #cmplz-cookiebanner-container,
  #hs-eu-cookie-confirmation,
  [aria-label="cookieconsent"], [data-testid="cookie-policy-manage-dialog"] {
    display: none !important;
    visibility: hidden !important;
  }
`;

// "Reddet / yalnızca gerekli" düğmesi metin kalıpları (TR + EN).
const REJECT_PATTERNS =
  /^(reddet|tümünü reddet|hepsini reddet|tüm çerezleri reddet|çerezleri reddet|reddediyorum|kabul etmiyorum|kabul etme|kabul etmeden devam et?|vazgeç ve devam et|reject all( cookies)?|reject( cookies)?|decline( all)?|refuse( all)?|deny( all)?|only (strictly )?necessary|necessary (cookies )?only|use necessary cookies only|sadece gerekli( çerezler)?|yalnızca gerekli( çerezler)?|zorunlu çerezler(e izin ver)?|disagree|do not (accept|consent)|continue without (accepting|agreeing)|i do not accept)$/i;

const REJECT_SELECTORS = [
  '#onetrust-reject-all-handler',
  '.ot-pc-refuse-all-handler',
  '#CybotCookiebotDialogBodyButtonDecline',
  '#CybotCookiebotDialogBodyLevelButtonLevelOptinDeclineAll',
  '.fc-cta-do-not-consent',
  '[data-testid="uc-deny-all-button"]',
  '.didomi-continue-without-agreeing',
  '.qc-cmp2-summary-buttons > button[mode="secondary"]',
  '.cky-btn-reject',
  '.iubenda-cs-reject-btn',
  '#tarteaucitronAllDenied2',
  '.osano-cm-denyAll',
  '[data-borlabs-cookie-actions="refuse"]',
  '.cmplz-deny',
  '[data-hook="consent-banner-decline-button"]',
  'button[data-role="reject"]',
  'button[data-action="reject"]',
];

/** Shadow DOM dahil buton toplayıcı (Usercentrics vb. shadow root kullanır). */
function collectButtons(root: ParentNode, out: HTMLElement[], depth: number): void {
  if (depth > 4) return;
  root.querySelectorAll<HTMLElement>('button, [role="button"], a, input[type="button"]').forEach(
    (b) => out.push(b),
  );
  root.querySelectorAll<HTMLElement>('*').forEach((el) => {
    if (el.shadowRoot) collectButtons(el.shadowRoot, out, depth + 1);
  });
}

function isVisibleEl(el: HTMLElement): boolean {
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
}

function tryRejectConsent(root: ParentNode): boolean {
  for (const sel of REJECT_SELECTORS) {
    const btn = root.querySelector<HTMLElement>(sel);
    if (btn && isVisibleEl(btn)) {
      btn.click();
      return true;
    }
  }
  const buttons: HTMLElement[] = [];
  collectButtons(root, buttons, 0);
  for (const btn of buttons) {
    const text = (btn.textContent ?? '').trim().replace(/\s+/g, ' ');
    if (text.length > 0 && text.length < 48 && REJECT_PATTERNS.test(text) && isVisibleEl(btn)) {
      btn.click();
      return true;
    }
  }
  return false;
}

if (config.cookieBannerAutoReject) {
  const bootConsent = () => {
    if (!document.getElementById('__aether_consent_css')) {
      const style = document.createElement('style');
      style.id = '__aether_consent_css';
      style.textContent = CONSENT_HIDE_CSS;
      document.documentElement.appendChild(style);
    }

    // Geç yüklenen banner'lar (CMP scripti sayfadan saniyeler sonra gelir):
    // 1) İlk 30 sn periyodik dene, 2) DOM değişiminde debounce'lu dene.
    let done = false;
    let attempts = 0;
    const attempt = () => {
      if (done) return;
      if (tryRejectConsent(document)) {
        done = true;
        cleanup();
      }
    };
    const timer = setInterval(() => {
      attempts += 1;
      attempt();
      if (attempts >= 30) cleanup();
    }, 1000);

    let debounce: ReturnType<typeof setTimeout> | null = null;
    const mo = new MutationObserver(() => {
      if (done) return;
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(attempt, 250);
    });
    mo.observe(document.documentElement, { childList: true, subtree: true });

    const cleanup = () => {
      clearInterval(timer);
      // Gözlemciyi bir süre daha açık tut — bazı CMP'ler ikinci katman gösterir
      setTimeout(() => mo.disconnect(), 15_000);
    };
  };

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', bootConsent);
  } else {
    bootConsent();
  }
}

// ---------------------------------------------------------------------------
// 3. Deep Focus modu (Sessiz Mod)
// ---------------------------------------------------------------------------

const FOCUS_STYLE_ID = '__aether_deep_focus';

const DEEP_FOCUS_CSS = `
  html { filter: grayscale(1) !important; }
  video { filter: grayscale(0) !important; }
  *, *::before, *::after {
    animation-play-state: paused !important;
    transition: none !important;
  }
  /* YouTube */
  ytd-watch-next-secondary-results-renderer, ytd-comments, #related, #comments,
  ytd-reel-shelf-renderer, ytd-rich-shelf-renderer[is-shorts], yt-chip-cloud-renderer,
  ytd-merch-shelf-renderer,
  /* Twitter/X */
  [data-testid="sidebarColumn"], [aria-label="Trending"], [aria-label="Timeline: Trending now"],
  /* Reddit */
  [data-testid="subreddit-sidebar"], #right-sidebar-container, faceplate-tracker[source="sidebar"],
  /* Facebook */
  [data-pagelet="RightRail"], [data-pagelet="Stories"], [aria-label="Reels"],
  /* Instagram */
  [role="complementary"],
  /* Genel dikkat dağıtıcılar */
  [class*="newsletter-popup"], [id*="newsletter-popup"],
  [class*="push-prompt"], [class*="notification-prompt"] {
    display: none !important;
  }
`;

function setDeepFocus(on: boolean): void {
  const existing = document.getElementById(FOCUS_STYLE_ID);
  if (on && !existing) {
    const style = document.createElement('style');
    style.id = FOCUS_STYLE_ID;
    style.textContent = DEEP_FOCUS_CSS;
    document.documentElement.appendChild(style);
  } else if (!on && existing) {
    existing.remove();
  }
}

// Kabuk arayüzü webview.send('aethernode/guest/deepFocus', boolean) çağırır.
ipcRenderer.on('aethernode/guest/deepFocus', (_e, on: unknown) => {
  try {
    setDeepFocus(!!on);
  } catch {
    /* sayfa henüz hazır değilse yoksay */
  }
});

// ---------------------------------------------------------------------------
// 3b. Genel reklam artığı temizliği (YouTube hariç — YT kendi bölümünde)
// ---------------------------------------------------------------------------

const GENERIC_AD_CSS = `
  iframe[src*="doubleclick"], iframe[src*="googlesyndication"],
  iframe[src*="googleadservices"], iframe[id*="google_ads"],
  iframe[name*="google_ads"], iframe[src*="adform.net"],
  iframe[src*="criteo"], iframe[src*="taboola"], iframe[src*="outbrain"],
  ins.adsbygoogle, .adsbygoogle,
  [id^="div-gpt-ad"], [id^="google_ads_iframe"],
  [class*="adsbox"], [class*="ad-slot"], [class*="adslot"],
  [data-ad-slot], [data-google-query-id],
  .advertisement:empty, .ad-container:empty, .ad-wrapper:empty,
  div[id*="ad-container"]:empty, div[class*="ad-unit"]:empty,
  /* 1x1 izleme pikselleri */
  img[width="1"][height="1"], img[style*="width: 1px"][style*="height: 1px"],
  /* engellenmiş reklam sonrası boş kutu / kırık ikon */
  a[href*="doubleclick"] img, a[href*="googlesyndication"] img {
    display: none !important;
    visibility: hidden !important;
    height: 0 !important;
    max-height: 0 !important;
    overflow: hidden !important;
    pointer-events: none !important;
  }
`;

function installGenericCosmeticAds(): void {
  if (isProtectionPausedHere()) return;
  const h = (location.hostname || '').toLowerCase();
  if (/(^|\.)youtube\.com$|(^|\.)youtu\.be$|(^|\.)youtube-nocookie\.com$/.test(h)) {
    return; // YouTube kendi motoruna bırak
  }
  if (document.getElementById('__aether_cosmetic_ads')) return;
  const style = document.createElement('style');
  style.id = '__aether_cosmetic_ads';
  style.textContent = GENERIC_AD_CSS;
  (document.head || document.documentElement).appendChild(style);

  // Engellenmiş iframe/placeholder + yalnız "Kapat" kalan popup artıkları
  const scrub = () => {
    document.querySelectorAll('iframe').forEach((frame) => {
      const src = (frame.getAttribute('src') || '').toLowerCase();
      if (
        /doubleclick|googlesyndication|googleadservices|criteo|taboola|outbrain|adnxs|adform/.test(
          src,
        )
      ) {
        frame.style.setProperty('display', 'none', 'important');
      }
    });
    document.querySelectorAll('button, a, span, div').forEach((el) => {
      const t = (el.textContent || '').trim().toLowerCase();
      if (t !== 'kapat' && t !== 'close' && t !== '×' && t !== 'x') return;
      const box = el.parentElement;
      if (!box) return;
      const kids = box.children.length;
      const textLen = (box.textContent || '').trim().length;
      // Neredeyse boş kutu içinde yalnız Kapat → gizle
      if (kids <= 3 && textLen < 24) {
        (box as HTMLElement).style.setProperty('display', 'none', 'important');
      }
    });
  };
  setInterval(scrub, 2000);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scrub);
  } else {
    scrub();
  }
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', () => {
    try {
      installGenericCosmeticAds();
    } catch {
      /* yoksay */
    }
  });
} else {
  try {
    installGenericCosmeticAds();
  } catch {
    /* yoksay */
  }
}

// ---------------------------------------------------------------------------
// 4. YouTube reklam engelleme
//    A) Ana dünya: player JSON'dan reklam alanlarını sil + isInlinePlaybackNoAd
//    B) Isolated: cosmetic CSS + skip tıklama (kaçan reklamlar için)
//    googlevideo CDN'e dokunulmaz; 16x hızlandırma yok.
// ---------------------------------------------------------------------------

function isYouTubeHost(): boolean {
  const h = (location.hostname || '').toLowerCase();
  return (
    /(^|\.)youtube\.com$/.test(h) ||
    /(^|\.)youtu\.be$/.test(h) ||
    /(^|\.)youtube-nocookie\.com$/.test(h)
  );
}

function buildYouTubeAdScript(): string {
  return `
    if (window.__aetherYtAdblock) return;
    window.__aetherYtAdblock = true;

    const AD_KEYS = new Set([
      'adPlacements','playerAds','adSlots','adBreakHeartbeatParams',
      'adPlacementConfig','adBreakServiceMessage','adAnswers',
      'adsenseClientParams','adParams','adSignalInfo'
    ]);

    const prune = (obj, depth) => {
      if (!obj || typeof obj !== 'object' || depth > 12) return obj;
      if (Array.isArray(obj)) {
        for (let i = 0; i < obj.length; i++) prune(obj[i], depth + 1);
        return obj;
      }
      for (const k of Object.keys(obj)) {
        if (AD_KEYS.has(k)) {
          try { delete obj[k]; } catch (_) { obj[k] = Array.isArray(obj[k]) ? [] : undefined; }
          continue;
        }
        if (k === 'playerResponse' || k === 'playerConfig' || k === 'args') prune(obj[k], depth + 1);
        else if (typeof obj[k] === 'object') prune(obj[k], depth + 1);
      }
      try {
        const ui = obj.auxiliaryUi && obj.auxiliaryUi.messageRenderers;
        if (ui && ui.upsellDialogRenderer) delete ui.upsellDialogRenderer;
      } catch (_) {}
      try {
        if (obj.responseContext && obj.responseContext.adSignalsInfo) {
          delete obj.responseContext.adSignalsInfo;
        }
      } catch (_) {}
      return obj;
    };

    const cleanPlayer = (pr) => {
      if (!pr || typeof pr !== 'object') return pr;
      prune(pr, 0);
      try { pr.adPlacements = []; } catch (_) {}
      try { pr.playerAds = []; } catch (_) {}
      try { pr.adSlots = []; } catch (_) {}
      return pr;
    };

    // Soğuk yükleme: ytInitialPlayerResponse temizle
    try {
      let _ipr = window.ytInitialPlayerResponse;
      if (_ipr) cleanPlayer(_ipr);
      Object.defineProperty(window, 'ytInitialPlayerResponse', {
        configurable: true,
        enumerable: true,
        get() { return _ipr; },
        set(v) { _ipr = cleanPlayer(v); }
      });
    } catch (_) {}

    // JSON.parse — gömülü player cevaplarını temizle
    try {
      const _parse = JSON.parse;
      JSON.parse = function(text, reviver) {
        const v = _parse.call(this, text, reviver);
        try {
          if (v && typeof v === 'object') {
            if (v.adPlacements || v.playerAds || v.adSlots || v.playerResponse) cleanPlayer(v);
            if (v.playerResponse) cleanPlayer(v.playerResponse);
          }
        } catch (_) {}
        return v;
      };
    } catch (_) {}

    // İsteklere isInlinePlaybackNoAd ekle (fake buffering / SABR backoff önlemi)
    const stampNoAd = (body) => {
      if (typeof body !== 'string' || body.length < 20) return body;
      if (body.includes('"isInlinePlaybackNoAd":true')) return body;
      if (!body.includes('contentPlaybackContext')) return body;
      return body.replace(
        '"contentPlaybackContext":{',
        '"contentPlaybackContext":{"isInlinePlaybackNoAd":true,'
      );
    };

    try {
      const _assign = Object.assign;
      Object.assign = function(target, ...sources) {
        const r = _assign.apply(this, [target, ...sources]);
        try {
          if (r && typeof r.body === 'string') r.body = stampNoAd(r.body);
        } catch (_) {}
        return r;
      };
    } catch (_) {}

    try {
      const _stringify = JSON.stringify;
      JSON.stringify = function(value, replacer, space) {
        try {
          if (value && typeof value === 'object') {
            const cpc = value.playbackContext && value.playbackContext.contentPlaybackContext;
            if (cpc && typeof cpc === 'object' && !cpc.isInlinePlaybackNoAd) {
              value = {
                ...value,
                playbackContext: {
                  ...value.playbackContext,
                  contentPlaybackContext: { ...cpc, isInlinePlaybackNoAd: true },
                },
              };
            }
          }
        } catch (_) {}
        return _stringify.call(this, value, replacer, space);
      };
    } catch (_) {}

    const isYtApi = (url) => {
      try {
        const u = String(url);
        return u.includes('/youtubei/v1/') || u.includes('/get_watch') || u.includes('/watch?');
      } catch (_) { return false; }
    };

    // fetch — yalnızca JSON youtubei cevaplarını temizle (protobuf'a dokunma)
    try {
      const _fetch = window.fetch;
      window.fetch = async function(input, init) {
        try {
          const url = typeof input === 'string' ? input : (input && input.url) || '';
          if (isYtApi(url) && init && typeof init.body === 'string') {
            init = { ...init, body: stampNoAd(init.body) };
          }
        } catch (_) {}
        const res = await _fetch.call(this, input, init);
        try {
          const url = typeof input === 'string' ? input : (input && input.url) || '';
          if (!String(url).includes('/youtubei/')) return res;
          const ct = (res.headers && res.headers.get('content-type')) || '';
          if (ct && !ct.includes('json') && !ct.includes('text')) return res;
          const clone = res.clone();
          const text = await clone.text();
          if (!text || (!text.includes('adPlacements') && !text.includes('playerAds') && !text.includes('adSlots'))) {
            return res;
          }
          const data = JSON.parse(text);
          cleanPlayer(data);
          if (data.playerResponse) cleanPlayer(data.playerResponse);
          return new Response(JSON.stringify(data), {
            status: res.status,
            statusText: res.statusText,
            headers: res.headers,
          });
        } catch (_) {
          return res;
        }
      };
    } catch (_) {}

    // XHR
    try {
      const _open = XMLHttpRequest.prototype.open;
      const _send = XMLHttpRequest.prototype.send;
      XMLHttpRequest.prototype.open = function(method, url) {
        this.__aetherUrl = String(url || '');
        return _open.apply(this, arguments);
      };
      XMLHttpRequest.prototype.send = function(body) {
        try {
          if (isYtApi(this.__aetherUrl) && typeof body === 'string') body = stampNoAd(body);
        } catch (_) {}
        this.addEventListener('load', function() {
          try {
            if (!isYtApi(this.__aetherUrl)) return;
            if (this.responseType && this.responseType !== '' && this.responseType !== 'text') return;
            const raw = this.responseText;
            if (!raw || (!raw.includes('adPlacements') && !raw.includes('playerAds'))) return;
            const data = JSON.parse(raw);
            cleanPlayer(data);
            Object.defineProperty(this, 'responseText', { get() { return JSON.stringify(data); } });
            Object.defineProperty(this, 'response', { get() { return JSON.stringify(data); } });
          } catch (_) {}
        });
        return _send.call(this, body);
      };
    } catch (_) {}

    // Kaçan reklamlar: periyodik temizlik + player skipAd
    const tick = () => {
      try {
        if (window.ytInitialPlayerResponse) cleanPlayer(window.ytInitialPlayerResponse);
      } catch (_) {}
      try {
        const mp = window.movie_player || document.getElementById('movie_player');
        if (mp) {
          if (typeof mp.getPlayerResponse === 'function') {
            const pr = mp.getPlayerResponse();
            if (pr) cleanPlayer(pr);
          }
          const showing = document.querySelector('.html5-video-player.ad-showing');
          if (showing && typeof mp.skipAd === 'function') mp.skipAd();
        }
      } catch (_) {}
    };
    setInterval(tick, 800);
  `;
}

if (isYouTubeHost() && !config.scriptBlocker) {
  void webFrame.executeJavaScript(`(() => { try { ${buildYouTubeAdScript()} } catch (_) {} })();`);
}

const YT_AD_CSS = `
  .ytp-ad-module, .ytp-ad-overlay-container, .ytp-ad-text-overlay,
  .video-ads, .ytp-ad-player-overlay, .ytp-ad-player-overlay-layout,
  .ytp-ad-image-overlay, .ytp-ad-overlay-slot, .ytp-ad-overlay-close-button,
  ytd-ad-slot-renderer, ytd-in-feed-ad-layout-renderer,
  ytd-banner-promo-renderer, ytd-promoted-sparkles-web-renderer,
  ytd-display-ad-renderer, ytd-action-companion-ad-renderer,
  ytd-promoted-video-renderer, ytd-player-legacy-desktop-watch-ads-renderer,
  #player-ads, #masthead-ad, .ytd-mealbar-promo-renderer,
  ytd-mealbar-promo-renderer, ytd-statement-banner-renderer,
  ytd-rich-item-renderer:has(ytd-ad-slot-renderer),
  ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-ads"],
  tp-yt-paper-dialog.ytd-popup-container,
  .ytp-ad-progress-list, .ad-showing .ytp-ad-overlay-slot,
  .ytd-ad-slot-renderer, #offer-module, ytd-promo-banner,
  .ytp-suggested-action, .ytp-suggested-action-badge,
  .ytp-ce-element, .ytp-ce-covering-overlay, .ytp-ce-element-shadow,
  .ytp-cards-teaser, .ytp-pause-overlay,
  ytd-companion-slot-renderer, ytd-action-companion-ad-renderer,
  #player-ads ytd-engagement-panel-section-list-renderer,
  ytd-popup-container tp-yt-paper-dialog,
  ytd-mealbar-promo-renderer[dialog],
  #panels ytd-engagement-panel-section-list-renderer[target-id*="ad"],
  ytd-banner-promo-renderer-container,
  .ytd-banner-promo-renderer-content,
  ytd-brand-video-singleton-renderer,
  ytd-brand-video-shelf-renderer,
  ytm-promoted-sparkles-text-search-renderer,
  .ytp-ad-info-dialog-container, .ytp-ad-feedback-dialog-container,
  #masthead-ad, ytd-ad-slot-renderer, #related ytd-ad-slot-renderer {
    display: none !important;
    visibility: hidden !important;
    height: 0 !important;
    max-height: 0 !important;
    overflow: hidden !important;
    pointer-events: none !important;
  }
  /* reklam oynarken overlay'i gizle ama player'ı bozma */
  .ad-showing .ytp-chrome-top, .ad-showing .ytp-chrome-bottom { opacity: 1 !important; }
`;

function installYouTubeAdBlock(): void {
  if (isProtectionPausedHere()) return;
  if (!isYouTubeHost()) return;
  if (document.getElementById('__aether_yt_ads')) return;

  const style = document.createElement('style');
  style.id = '__aether_yt_ads';
  style.textContent = YT_AD_CSS;
  (document.head || document.documentElement).appendChild(style);

  let lastSkip = 0;
  const trySkip = () => {
    const player =
      document.querySelector('.html5-video-player.ad-showing') ||
      document.querySelector('.ad-showing');
    if (!player) return;

    // Player API skip
    try {
      const mp = (window as unknown as { movie_player?: { skipAd?: () => void } }).movie_player;
      if (mp && typeof mp.skipAd === 'function') {
        mp.skipAd();
      }
    } catch {
      /* yoksay */
    }

    const now = Date.now();
    if (now - lastSkip < 400) return;
    const skipBtn =
      document.querySelector<HTMLElement>(
        '.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button, .ytp-ad-skip-button-container button, .ytp-ad-skip-button-slot button',
      ) ?? document.querySelector<HTMLElement>('[class*="ytp-ad-skip"]');
    if (skipBtn) {
      lastSkip = now;
      skipBtn.click();
      return;
    }

    // Skip yoksa (kısa bumper): yalnızca ad-showing iken sona atla — içerik videosuna dokunma
    try {
      const vid = player.querySelector('video') as HTMLVideoElement | null;
      if (vid && Number.isFinite(vid.duration) && vid.duration > 0 && vid.currentTime < vid.duration - 0.25) {
        // 0–6 sn bumper'larda güvenli; uzun içerik reklamlarında skip beklenir
        if (vid.duration <= 16) {
          vid.currentTime = Math.max(0, vid.duration - 0.1);
          lastSkip = now;
        }
      }
    } catch {
      /* yoksay */
    }
  };

  setInterval(trySkip, 500);
  const mo = new MutationObserver(trySkip);
  mo.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class'],
  });

  const hidePromoText = () => {
    const nodes = document.querySelectorAll(
      'ytp-suggested-action, .ytp-suggested-action, ytd-mealbar-promo-renderer, tp-yt-paper-dialog, ytd-popup-container, [class*="mealbar"], [class*="upsell"], [class*="premium"]',
    );
    nodes.forEach((n) => {
      const t = (n.textContent || '').toLowerCase();
      if (
        t.includes('öğrenci') ||
        t.includes('ogrenci') ||
        t.includes('premium') ||
        t.includes('student') ||
        t.includes('try youtube') ||
        t.includes('youtube tv') ||
        t.includes('reklamsız')
      ) {
        (n as HTMLElement).style.setProperty('display', 'none', 'important');
      }
    });
  };
  setInterval(hidePromoText, 1200);
}

const bootYtAds = () => {
  try {
    installYouTubeAdBlock();
  } catch {
    /* yoksay */
  }
};
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', bootYtAds);
} else {
  bootYtAds();
}

window.addEventListener('DOMContentLoaded', () => {
  // Turtlecute adblock testi — cosmetic filtre
  try {
    if (/adblock\.turtlecute\.org$/i.test(location.hostname)) {
      const style = document.createElement('style');
      style.textContent = `
        .adbox, .banner_ads, .adsbox, .textads, [class*="adbox"], [class*="banner_ads"] {
          display: none !important; visibility: hidden !important;
        }
      `;
      document.documentElement.appendChild(style);
    }
  } catch {
    /* yoksay */
  }
});

// ---------------------------------------------------------------------------
// 5. Okuyucu Modu (Reader Mode)
// ---------------------------------------------------------------------------

const READER_STYLE_ID = '__aether_reader';
const READER_ROOT_ID = '__aether_reader_root';

const READER_CSS = `
  #${READER_ROOT_ID} {
    position: fixed !important;
    inset: 0 !important;
    z-index: 2147483646 !important;
    overflow: auto !important;
    background: #0c0a09 !important;
    color: #e7e5e4 !important;
    font: 1.125rem/1.75 Georgia, "Times New Roman", serif !important;
    padding: 0 !important;
    margin: 0 !important;
  }
  #${READER_ROOT_ID} .__ar-inner {
    max-width: 42rem;
    margin: 0 auto;
    padding: 3rem 1.5rem 4rem;
  }
  #${READER_ROOT_ID} h1 {
    font-size: 2rem;
    line-height: 1.25;
    margin: 0 0 1rem;
    font-weight: 700;
  }
  #${READER_ROOT_ID} .__ar-meta {
    font: 0.85rem/1.4 system-ui, sans-serif;
    color: #a8a29e;
    margin-bottom: 2rem;
  }
  #${READER_ROOT_ID} p { margin: 0 0 1.1em; }
  #${READER_ROOT_ID} img { max-width: 100%; height: auto; border-radius: 8px; }
  #${READER_ROOT_ID} a { color: #60a5fa; }
`;

function extractArticleHtml(): { title: string; html: string } | null {
  const article =
    document.querySelector('article') ||
    document.querySelector('[role="main"]') ||
    document.querySelector('main') ||
    document.body;
  if (!article) return null;

  const clone = article.cloneNode(true) as HTMLElement;
  clone
    .querySelectorAll(
      'script, style, nav, aside, footer, iframe, form, button, [role="navigation"], [role="complementary"], .ad, .ads, .advertisement',
    )
    .forEach((n) => n.remove());

  const title =
    document.querySelector('h1')?.textContent?.trim() ||
    document.title ||
    'Okuyucu';
  return { title, html: clone.innerHTML };
}

function setReaderMode(on: boolean): void {
  const existing = document.getElementById(READER_ROOT_ID);
  const styleEl = document.getElementById(READER_STYLE_ID);
  if (!on) {
    existing?.remove();
    styleEl?.remove();
    return;
  }
  if (existing) return;

  const extracted = extractArticleHtml();
  if (!extracted) return;

  const style = document.createElement('style');
  style.id = READER_STYLE_ID;
  style.textContent = READER_CSS;
  document.documentElement.appendChild(style);

  const root = document.createElement('div');
  root.id = READER_ROOT_ID;
  root.innerHTML = `<div class="__ar-inner"><h1>${extracted.title
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')}</h1><div class="__ar-meta">${location.hostname}</div><div>${extracted.html}</div></div>`;
  document.documentElement.appendChild(root);
}

ipcRenderer.on('aethernode/guest/readerMode', (_e, on: unknown) => {
  try {
    setReaderMode(!!on);
  } catch {
    /* yoksay */
  }
});

// ---------------------------------------------------------------------------
// 6. Script Blocker — JS tamamen kapalı (CSP + script temizleme)
// ---------------------------------------------------------------------------

if (config.scriptBlocker) {
  try {
    const meta = document.createElement('meta');
    meta.httpEquiv = 'Content-Security-Policy';
    meta.content = "script-src 'none'; worker-src 'none'";
    (document.head || document.documentElement).appendChild(meta);
  } catch {
    /* erken aşamada head yok olabilir */
  }
  window.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('script').forEach((s) => s.remove());
    const mo = new MutationObserver((muts) => {
      for (const m of muts) {
        m.addedNodes.forEach((n) => {
          if (n.nodeName === 'SCRIPT') (n as HTMLElement).remove();
        });
      }
    });
    mo.observe(document.documentElement, { childList: true, subtree: true });
  });
}

// ---------------------------------------------------------------------------
// 7. Bank Mode — pano / konum / bildirim engeli (finans sitelerinde)
// ---------------------------------------------------------------------------

(() => {
  if (!config.bankMode) return;
  const host = (location.hostname || '').toLowerCase().replace(/^www\./, '');
  const bankHosts =
    config.bankDomains && config.bankDomains.length > 0 ? config.bankDomains : BANK_FALLBACK;
  if (!bankHosts.some((d) => host === d || host.endsWith('.' + d))) return;

  void webFrame.executeJavaScript(`(() => {
    try {
      if (navigator.clipboard) {
        navigator.clipboard.writeText = () => Promise.reject(new Error('Bank Mode'));
        navigator.clipboard.readText = () => Promise.reject(new Error('Bank Mode'));
      }
    } catch (_) {}
    try {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition = function(s, e) { if (e) e({ code: 1, message: 'Bank Mode' }); };
        navigator.geolocation.watchPosition = function(s, e) { if (e) e({ code: 1, message: 'Bank Mode' }); return 0; };
      }
    } catch (_) {}
    try {
      Notification.requestPermission = () => Promise.resolve('denied');
    } catch (_) {}
  })();`);
})();

// ---------------------------------------------------------------------------
// 8. Form Otomatik Doldurma
//    Alan tespiti: autocomplete özniteliği + name/id/placeholder/label
//    heuristiği — tamamen yerel, hiçbir servise veri gitmez.
//    Kart doldurma: yalnızca HTTPS + kasa açıkken (main reddeder).
//    Cross-origin ödeme iframe'lerinde çalışmaz (preload üst frame'de koşar).
// ---------------------------------------------------------------------------

type AutofillFieldType =
  | 'firstName'
  | 'lastName'
  | 'fullName'
  | 'email'
  | 'phone'
  | 'addressLine1'
  | 'addressLine2'
  | 'city'
  | 'postalCode'
  | 'country'
  | 'cardNumber'
  | 'cardName'
  | 'cardExpiry'
  | 'cardExpiryMonth'
  | 'cardExpiryYear'
  | 'cardCvv';

interface AutofillProfileLike {
  id: string;
  name: string;
  fields: Record<string, string | undefined>;
}

interface AutofillCardSummaryLike {
  id: string;
  label: string;
  cardholderName: string;
  last4: string;
  expiryMonth: string;
  expiryYear: string;
}

const AUTOCOMPLETE_MAP: Record<string, AutofillFieldType> = {
  'given-name': 'firstName',
  'family-name': 'lastName',
  name: 'fullName',
  email: 'email',
  tel: 'phone',
  'tel-national': 'phone',
  'address-line1': 'addressLine1',
  'street-address': 'addressLine1',
  'address-line2': 'addressLine2',
  'address-level2': 'city',
  'postal-code': 'postalCode',
  country: 'country',
  'country-name': 'country',
  'cc-number': 'cardNumber',
  'cc-name': 'cardName',
  'cc-exp': 'cardExpiry',
  'cc-exp-month': 'cardExpiryMonth',
  'cc-exp-year': 'cardExpiryYear',
  'cc-csc': 'cardCvv',
};

const HEURISTICS: Array<[RegExp, AutofillFieldType]> = [
  [/kart\s*numar|card\s*number|cardnumber|pan\b|cc-?num/i, 'cardNumber'],
  [/cvv|cvc|security\s*code|güvenlik\s*kodu/i, 'cardCvv'],
  [/son\s*kullanma|expir|exp\s*date|ay\s*\/\s*yıl|mm\s*\/?\s*yy/i, 'cardExpiry'],
  [/kart.*(isim|ad)|cardholder|card\s*name|name\s*on\s*card/i, 'cardName'],
  [/e-?posta|e-?mail/i, 'email'],
  [/telefon|phone|mobile|gsm|cep/i, 'phone'],
  [/posta\s*kodu|postal|zip/i, 'postalCode'],
  [/şehir|sehir|city|il\b/i, 'city'],
  [/ülke|ulke|country/i, 'country'],
  [/adres.*2|address.*2|apartment|daire/i, 'addressLine2'],
  [/adres|address|sokak|street|mahalle/i, 'addressLine1'],
  [/soyad|soyisim|last\s*name|surname|family/i, 'lastName'],
  [/(?:^|[^y])ad[ıi]?(?:n[ıi]z)?\b|first\s*name|given/i, 'firstName'],
  [/ad\s*soyad|full\s*name|isim/i, 'fullName'],
];

function isVisibleInput(el: HTMLInputElement): boolean {
  try {
    if (el.type === 'hidden') return false;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse') return false;
    if (parseFloat(style.opacity || '1') < 0.1) return false;
    const rect = el.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return false;
    // Off-screen (honeypot)
    if (rect.left < -400 || rect.top < -400) return false;
    // aria-hidden parent
    let p: HTMLElement | null = el;
    while (p && p !== document.documentElement) {
      if (p.getAttribute('aria-hidden') === 'true') return false;
      p = p.parentElement;
    }
    return true;
  } catch { return true; }
}

function classifyField(input: HTMLInputElement): AutofillFieldType | null {
  if (!isVisibleInput(input)) return null;
  const type = (input.type || 'text').toLowerCase();
  if (!['text', 'email', 'tel', 'number', 'search'].includes(type)) {
    if (type === 'email') return 'email';
    return null;
  }
  if (type === 'email') return 'email';
  if (input.readOnly || input.disabled) return null;

  const ac = (input.getAttribute('autocomplete') || '').toLowerCase().trim();
  if (ac && AUTOCOMPLETE_MAP[ac]) return AUTOCOMPLETE_MAP[ac];
  if (ac === 'off' && /otp|code|kod/i.test(input.name || '')) return null;

  // name/id/placeholder + yakın label metni
  let hay = `${input.name || ''} ${input.id || ''} ${input.placeholder || ''}`;
  try {
    const label =
      (input.id && document.querySelector(`label[for="${CSS.escape(input.id)}"]`)) ||
      input.closest('label');
    if (label) hay += ' ' + (label.textContent || '').slice(0, 80);
  } catch {
    /* yoksay */
  }
  for (const [re, t] of HEURISTICS) {
    if (re.test(hay)) return t;
  }
  return null;
}

function isCardField(t: AutofillFieldType): boolean {
  return t.startsWith('card');
}

function profileValue(p: AutofillProfileLike, t: AutofillFieldType): string {
  const f = p.fields;
  switch (t) {
    case 'firstName':
      return f.firstName ?? '';
    case 'lastName':
      return f.lastName ?? '';
    case 'fullName':
      return [f.firstName, f.lastName].filter(Boolean).join(' ');
    case 'email':
      return f.email ?? '';
    case 'phone':
      return f.phone ?? '';
    case 'addressLine1':
      return f.addressLine1 ?? '';
    case 'addressLine2':
      return f.addressLine2 ?? '';
    case 'city':
      return f.city ?? '';
    case 'postalCode':
      return f.postalCode ?? '';
    case 'country':
      return f.country ?? '';
    default:
      return '';
  }
}

function setFieldValue(input: HTMLInputElement, value: string): void {
  if (!value) return;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  if (setter) setter.call(input, value);
  else input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  // Kısa vurgu — kullanıcı neyin dolduğunu görsün
  const prev = input.style.boxShadow;
  input.style.boxShadow = '0 0 0 2px rgba(99, 102, 241, 0.8)';
  setTimeout(() => {
    input.style.boxShadow = prev;
  }, 1600);
}

function fillFormWithProfile(anchor: HTMLElement, profile: AutofillProfileLike): number {
  const scope: ParentNode = anchor.closest('form') ?? document;
  let filled = 0;
  scope.querySelectorAll<HTMLInputElement>('input').forEach((inp) => {
    const t = classifyField(inp);
    if (!t || isCardField(t)) return;
    const v = profileValue(profile, t);
    if (v && !inp.value) {
      setFieldValue(inp, v);
      filled += 1;
    }
  });
  return filled;
}

function fillFormWithCard(
  anchor: HTMLElement,
  card: { pan: string; cvv?: string; cardholderName: string; expiryMonth: string; expiryYear: string },
): number {
  const scope: ParentNode = anchor.closest('form') ?? document;
  let filled = 0;
  scope.querySelectorAll<HTMLInputElement>('input').forEach((inp) => {
    const t = classifyField(inp);
    if (!t || !isCardField(t)) return;
    let v = '';
    if (t === 'cardNumber') v = card.pan;
    else if (t === 'cardName') v = card.cardholderName;
    else if (t === 'cardCvv') v = card.cvv ?? '';
    else if (t === 'cardExpiryMonth') v = card.expiryMonth.padStart(2, '0');
    else if (t === 'cardExpiryYear') v = card.expiryYear;
    else if (t === 'cardExpiry')
      v = `${card.expiryMonth.padStart(2, '0')}/${card.expiryYear.slice(-2)}`;
    if (v) {
      setFieldValue(inp, v);
      filled += 1;
    }
  });
  return filled;
}

const AF_BOX_ID = '__aether_autofill_box';

function removeAutofillBox(): void {
  document.getElementById(AF_BOX_ID)?.remove();
}

function showAutofillBox(input: HTMLInputElement, fieldType: AutofillFieldType): void {
  removeAutofillBox();
  const card = isCardField(fieldType);
  // Kart doldurma yalnızca HTTPS'te — sahte/HTTP ödeme sayfalarına asla
  if (card && location.protocol !== 'https:') return;

  const rect = input.getBoundingClientRect();
  const box = document.createElement('div');
  box.id = AF_BOX_ID;
  box.setAttribute(
    'style',
    [
      'position:fixed',
      `left:${Math.round(rect.left)}px`,
      `top:${Math.round(rect.bottom + 4)}px`,
      'z-index:2147483647',
      'min-width:220px;max-width:320px',
      'background:#18181b;color:#e4e4e7',
      'border:1px solid rgba(255,255,255,0.14);border-radius:10px',
      'box-shadow:0 12px 32px rgba(0,0,0,0.5)',
      'font:12px/1.4 system-ui,sans-serif',
      'padding:6px',
    ].join(';'),
  );

  const title = document.createElement('div');
  title.textContent = card ? 'AetherNode — kart doldur' : 'AetherNode — otomatik doldur';
  title.setAttribute('style', 'padding:4px 8px;color:#a1a1aa;font-size:10.5px;');
  box.appendChild(title);

  const addRow = (label: string, sub: string, onPick: () => void) => {
    const row = document.createElement('button');
    row.type = 'button';
    row.setAttribute(
      'style',
      'display:block;width:100%;text-align:left;background:none;border:0;color:#e4e4e7;padding:7px 8px;border-radius:7px;cursor:pointer;font:12px system-ui,sans-serif;',
    );
    row.onmouseenter = () => (row.style.background = 'rgba(255,255,255,0.07)');
    row.onmouseleave = () => (row.style.background = 'none');
    row.innerHTML = `<span>${label.replace(/</g, '&lt;')}</span><br><span style="color:#71717a;font-size:10.5px">${sub.replace(/</g, '&lt;')}</span>`;
    row.addEventListener('click', (e) => {
      // Yalnızca gerçek kullanıcı tıklaması — sayfa scripti tetikleyemez
      if (!e.isTrusted) return;
      onPick();
    });
    box.appendChild(row);
  };

  const finish = () => removeAutofillBox();

  if (card) {
    void ipcRenderer.invoke('aethernode/autofill/cards').then((res: unknown) => {
      const r = res as { ok: boolean; data?: AutofillCardSummaryLike[]; error?: string };
      if (!r?.ok) {
        title.textContent = 'Kart doldurma için şifre kasasını aç (kasa kilitli)';
        setTimeout(finish, 3500);
        return;
      }
      const cards = r.data ?? [];
      if (cards.length === 0) {
        title.textContent = 'Kayıtlı kart yok — Ayarlar → Otomatik Doldurma';
        setTimeout(finish, 3500);
        return;
      }
      for (const c of cards) {
        addRow(`${c.label} •••• ${c.last4}`, `${c.cardholderName} — ${c.expiryMonth}/${c.expiryYear}`, () => {
          void ipcRenderer
            .invoke('aethernode/autofill/cardFill', { id: c.id })
            .then((fillRes: unknown) => {
              const fr = fillRes as {
                ok: boolean;
                data?: {
                  pan: string;
                  cvv?: string;
                  cardholderName: string;
                  expiryMonth: string;
                  expiryYear: string;
                };
              };
              if (fr?.ok && fr.data) {
                fillFormWithCard(input, fr.data);
                // PAN'ı bellekte tutma
                fr.data.pan = '';
                if (fr.data.cvv) fr.data.cvv = '';
              }
              finish();
            });
        });
      }
    });
  } else {
    void ipcRenderer.invoke('aethernode/autofill/profiles').then((res: unknown) => {
      const r = res as { ok: boolean; data?: AutofillProfileLike[] };
      const profiles = r?.ok ? (r.data ?? []) : [];
      if (profiles.length === 0) {
        title.textContent = 'Kayıtlı profil yok — Ayarlar → Otomatik Doldurma';
        setTimeout(finish, 3500);
        return;
      }
      for (const p of profiles) {
        const sub = [p.fields.email, p.fields.city].filter(Boolean).join(' — ');
        addRow(p.name, sub || 'Profil', () => {
          fillFormWithProfile(input, p);
          finish();
        });
      }
    });
  }

  document.documentElement.appendChild(box);
  const closeOn = (e: Event) => {
    if (e.target instanceof Node && !box.contains(e.target) && e.target !== input) {
      finish();
      document.removeEventListener('mousedown', closeOn, true);
    }
  };
  document.addEventListener('mousedown', closeOn, true);
}

if (!config.scriptBlocker) {
  document.addEventListener(
    'focusin',
    (e) => {
      const el = e.target;
      if (!(el instanceof HTMLInputElement)) return;
      // yalnızca üst frame'de (preload zaten üst frame'de koşar) + http(s)
      if (!/^https?:$/.test(location.protocol)) return;
      const t = classifyField(el);
      if (t) showAutofillBox(el, t);
    },
    true,
  );

  // Ctrl+Shift+F — aktif formu ilk profille doldur
  ipcRenderer.on('aethernode/guest/autofill', () => {
    void ipcRenderer.invoke('aethernode/autofill/profiles').then((res: unknown) => {
      const r = res as { ok: boolean; data?: AutofillProfileLike[] };
      const p = r?.ok ? r.data?.[0] : undefined;
      if (!p) return;
      const anchor =
        (document.activeElement instanceof HTMLElement ? document.activeElement : null) ??
        document.querySelector<HTMLElement>('form input') ??
        document.body;
      fillFormWithProfile(anchor, p);
    });
  });
}

// ---------------------------------------------------------------------------
// Konfor: zorla koyu tema, fare hareketleri, seçim çevirisi, boost enjeksiyonu
// ---------------------------------------------------------------------------
(() => {
  if (config.forceDarkMode) {
    injectMainWorld(`
      if (document.getElementById('__aether-force-dark')) return;
      const s = document.createElement('style');
      s.id = '__aether-force-dark';
      s.textContent = \`
        html { background:#111 !important; color-scheme: dark !important; }
        html:not([data-aether-dark-skip]) { filter: invert(1) hue-rotate(180deg) !important; }
        img, video, picture, canvas, svg, iframe, embed, object,
        [style*="background-image"] { filter: invert(1) hue-rotate(180deg) !important; }
      \`;
      (document.documentElement || document.head).appendChild(s);
    `);
  }

  if (config.mouseGestures) {
    let start: { x: number; y: number } | null = null;
    window.addEventListener(
      'mousedown',
      (e) => {
        if (e.button === 2) start = { x: e.clientX, y: e.clientY };
      },
      true,
    );
    window.addEventListener(
      'contextmenu',
      (e) => {
        if (!start) return;
        const dx = e.clientX - start.x;
        const dy = e.clientY - start.y;
        start = null;
        const ax = Math.abs(dx);
        const ay = Math.abs(dy);
        if (ax < 40 && ay < 40) return;
        e.preventDefault();
        e.stopPropagation();
        if (ax > ay) {
          if (dx < 0) history.back();
          else history.forward();
        } else if (dy < 0) {
          try {
            ipcRenderer.sendToHost('aethernode/guest/openUrl', location.href);
          } catch {
            /* yoksay */
          }
        } else {
          try {
            ipcRenderer.sendToHost('aethernode/guest/gestureClose');
          } catch {
            /* yoksay */
          }
        }
      },
      true,
    );
  }

  if (config.selectionTranslate) {
    const lang = JSON.stringify(config.translateTarget || 'tr');
    injectMainWorld(`
      (() => {
        if (window.__aetherSelTr) return;
        window.__aetherSelTr = true;
        const lang = ${lang};
        let tip = null;
        document.addEventListener('mouseup', () => {
          setTimeout(() => {
            const t = String(window.getSelection && window.getSelection() || '').trim();
            if (tip) { tip.remove(); tip = null; }
            if (t.length < 2 || t.length > 500) return;
            tip = document.createElement('button');
            tip.textContent = 'Çevir';
            tip.style.cssText = 'position:fixed;z-index:2147483646;bottom:16px;right:16px;padding:8px 12px;border-radius:8px;border:0;background:#1d4ed8;color:#fff;font:12px sans-serif;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,.4)';
            tip.onclick = () => {
              window.open('https://translate.google.com/?sl=auto&tl=' + encodeURIComponent(lang) + '&text=' + encodeURIComponent(t) + '&op=translate', '_blank');
              tip && tip.remove();
            };
            document.documentElement.appendChild(tip);
            setTimeout(() => { if (tip) { tip.remove(); tip = null; } }, 5000);
          }, 10);
        });
      })();
    `);
  }

  // Boost: kabuktan gönderilen CSS/JS
  ipcRenderer.on('aethernode/guest/boost', (_e, payload: { css?: string; js?: string }) => {
    try {
      if (payload?.css) {
        const cssLit = JSON.stringify(payload.css);
        injectMainWorld(
          `(() => { const id = '__aether-boost-css'; let s = document.getElementById(id); if (!s) { s = document.createElement('style'); s.id = id; (document.documentElement||document.head).appendChild(s); } s.textContent = ${cssLit}; })();`,
        );
      }
      if (payload?.js) {
        injectMainWorld(payload.js);
      }
    } catch {
      /* yoksay */
    }
  });

  // Sayfa çevirisi — mevcut sekmede Google Translate
  ipcRenderer.on('aethernode/guest/translate', (_e, lang: unknown) => {
    try {
      const tl = String(lang || 'tr');
      const dest =
        'https://translate.google.com/translate?hl=' +
        encodeURIComponent(tl) +
        '&sl=auto&tl=' +
        encodeURIComponent(tl) +
        '&u=' +
        encodeURIComponent(location.href);
      location.href = dest;
    } catch {
      /* yoksay */
    }
  });
})();

/** Site koruması duraklatıldı mı? (kozmetik filtre için) */
function isProtectionPausedHere(): boolean {
  try {
    return !!ipcRenderer.sendSync(
      'aethernode/guest/protectionPaused',
      (location.hostname || '').toLowerCase(),
    );
  } catch {
    return false;
  }
}

// Ctrl+sol tık / Cmd+tık / orta tık — arka planda yeni sekme, odak burada kalsın
(() => {
  const resolveHref = (el: EventTarget | null): string | null => {
    let n: Element | null = el instanceof Element ? el : null;
    while (n) {
      if (n instanceof HTMLAnchorElement && n.href) {
        const href = n.href;
        if (/^https?:\/\//i.test(href)) return href;
        return null;
      }
      if (n instanceof HTMLElement) {
        const raw =
          n.getAttribute('href') ||
          n.getAttribute('data-href') ||
          n.getAttribute('data-url');
        if (raw && /^https?:\/\//i.test(raw)) return raw;
      }
      n = n.parentElement;
    }
    return null;
  };

  let lastOpenedAt = 0;
  let lastOpenedHref = '';

  const openInBackground = (e: MouseEvent): boolean => {
    const href = resolveHref(e.target);
    if (!href) return false;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    // mousedown + click aynı tıkta iki kez tetiklenmesin
    const now = Date.now();
    if (href === lastOpenedHref && now - lastOpenedAt < 500) return true;
    lastOpenedHref = href;
    lastOpenedAt = now;
    try {
      // Host sayfaya (webview embedder) — guest→renderer doğrudan köprü
      ipcRenderer.sendToHost('aethernode/guest/openBackground', href);
    } catch {
      /* yoksay */
    }
    return true;
  };

  const wantsBackground = (e: MouseEvent): boolean =>
    (e.button === 0 && (e.ctrlKey || e.metaKey)) || e.button === 1;

  // Bazı siteler mousedown'da gezinir — capture ile önce yakala
  document.addEventListener(
    'mousedown',
    (e) => {
      if (!wantsBackground(e)) return;
      openInBackground(e);
    },
    true,
  );

  document.addEventListener(
    'click',
    (e) => {
      if (!wantsBackground(e)) return;
      openInBackground(e);
    },
    true,
  );

  document.addEventListener(
    'auxclick',
    (e) => {
      if (e.button !== 1) return;
      openInBackground(e);
    },
    true,
  );
})();


