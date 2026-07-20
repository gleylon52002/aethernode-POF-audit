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
    spoofCanvas: boolean;
    spoofWebGL: boolean;
    spoofAudio: boolean;
    spoofFonts: boolean;
    spoofNavigator: boolean;
    spoofHardware: boolean;
    spoofScreen: boolean;
  };
  cookieBannerAutoReject: boolean;
  scriptBlocker: boolean;
  bankMode: boolean;
}

const FALLBACK: GuestConfig = {
  fingerprint: {
    enabled: false,
    spoofCanvas: false,
    spoofWebGL: false,
    spoofAudio: false,
    spoofFonts: false,
    spoofNavigator: false,
    spoofHardware: false,
    spoofScreen: false,
  },
  cookieBannerAutoReject: false,
  scriptBlocker: false,
  bankMode: true,
};

let config: GuestConfig = FALLBACK;
try {
  const raw = ipcRenderer.sendSync('aethernode/guest/config') as GuestConfig | null;
  if (raw && typeof raw === 'object') config = raw;
} catch {
  /* main hazır değilse korumasız devam etme yerine fallback */
}

// ---------------------------------------------------------------------------
// 1. Anti-fingerprint — ana dünyaya enjeksiyon
// ---------------------------------------------------------------------------

function buildFingerprintScript(fp: GuestConfig['fingerprint']): string {
  const parts: string[] = [];

  // Oturum başına sabit tohum: aynı oturumda tutarlı (CoverYourTracks
  // "unique" cezası için aşırı rastgelelik yerine kararlı profil).
  parts.push(`
    const __anSeed = ${Math.floor(Math.random() * 0xffffff)};
    const __anRand = (i) => {
      let x = (__anSeed + i) | 0;
      x = ((x << 13) ^ x) | 0;
      return (1.0 - ((x * (x * x * 15731 + 789221) + 1376312589) & 0x7fffffff) / 1073741824.0) / 2;
    };
  `);

  if (fp.spoofCanvas) {
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

  if (fp.spoofWebGL) {
    parts.push(`
      (() => {
        const spoofParam = (proto) => {
          if (!proto || !proto.getParameter) return;
          const orig = proto.getParameter;
          proto.getParameter = function (p) {
            // UNMASKED_VENDOR_WEBGL / UNMASKED_RENDERER_WEBGL
            if (p === 0x9245) return 'Google Inc. (Intel)';
            if (p === 0x9246) return 'ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0)';
            return orig.apply(this, arguments);
          };
        };
        try { spoofParam(WebGLRenderingContext && WebGLRenderingContext.prototype); } catch (_) {}
        try { spoofParam(WebGL2RenderingContext && WebGL2RenderingContext.prototype); } catch (_) {}
        try {
          const origGetExt = WebGLRenderingContext.prototype.getExtension;
          WebGLRenderingContext.prototype.getExtension = function (name) {
            if (name === 'WEBGL_debug_renderer_info') {
              return { UNMASKED_VENDOR_WEBGL: 0x9245, UNMASKED_RENDERER_WEBGL: 0x9246 };
            }
            return origGetExt.apply(this, arguments);
          };
        } catch (_) {}
      })();
    `);
  }

  if (fp.spoofAudio) {
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

  if (fp.spoofFonts) {
    parts.push(`
      (() => {
        try {
          const orig = document.fonts && document.fonts.check;
          if (orig) {
            document.fonts.check = function (font, text) {
              // Yaygın sistem fontlarını tutarlı tut; nadir fontları reddet
              const f = String(font || '').toLowerCase();
              if (/comic|papyrus|impact|wingdings|emoji/.test(f)) return false;
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
          Object.defineProperty(navigator, 'plugins', { get: () => {
            const p = { length: 3, item: (i) => p[i], namedItem: () => null, refresh() {} };
            p[0] = { name: 'PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' };
            p[1] = { name: 'Chrome PDF Viewer', filename: 'internal-pdf-viewer', description: '' };
            p[2] = { name: 'Chromium PDF Viewer', filename: 'internal-pdf-viewer', description: '' };
            return p;
          }});
          Object.defineProperty(navigator, 'mimeTypes', { get: () => ({ length: 0, item: () => null, namedItem: () => null }) });
        } catch (_) {}
        try {
          if ('connection' in navigator) {
            Object.defineProperty(navigator, 'connection', { get: () => undefined });
          }
        } catch (_) {}
        try {
          Object.defineProperty(navigator, 'languages', { get: () => Object.freeze(['en-US', 'en']) });
          Object.defineProperty(navigator, 'language', { get: () => 'en-US' });
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

  if (fp.spoofHardware) {
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

  // ClientRects / speech — CoverYourTracks ek vektörleri
  parts.push(`
    (() => {
      try {
        const orig = Element.prototype.getBoundingClientRect;
        Element.prototype.getBoundingClientRect = function () {
          const r = orig.apply(this);
          const n = __anRand(r.x + r.y) * 0.0001;
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

  return parts.join('\n');
}

if (config.fingerprint.enabled && !config.scriptBlocker) {
  // Banka Modu'nda finans sitelerinde spoofing/enjeksiyon KAPALI
  // (güvenli alan — script enjeksiyonu istenmez).
  const host = (location.hostname || '').toLowerCase().replace(/^www\./, '');
  const bankHosts = [
    'ziraatbank.com.tr','garanti.com.tr','garantibbva.com.tr','isbank.com.tr',
    'yapikredi.com.tr','akbank.com','denizbank.com','qnbfinansbank.com','teb.com.tr',
    'halkbank.com.tr','vakifbank.com.tr','ing.com.tr','enpara.com','papara.com',
    'paypal.com','chase.com','bankofamerica.com','wellsfargo.com','revolut.com','wise.com',
  ];
  const onBank =
    config.bankMode &&
    bankHosts.some((d) => host === d || host.endsWith('.' + d));
  if (!onBank) {
    const script = buildFingerprintScript(config.fingerprint);
    if (script.trim().length > 0) {
      void webFrame.executeJavaScript(`(() => { try { ${script} } catch (_) {} })();`);
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
  [aria-label="cookieconsent"], [data-testid="cookie-policy-manage-dialog"] {
    display: none !important;
    visibility: hidden !important;
  }
`;

// "Reddet / yalnızca gerekli" düğmesi metin kalıpları (TR + EN).
const REJECT_PATTERNS =
  /^(reddet|tümünü reddet|hepsini reddet|reject all|reject|decline|refuse|deny|only necessary|necessary only|sadece gerekli|yalnızca gerekli|zorunlu çerezler|disagree|kabul etme)$/i;

const REJECT_SELECTORS = [
  '#onetrust-reject-all-handler',
  '.ot-pc-refuse-all-handler',
  '#CybotCookiebotDialogBodyButtonDecline',
  '.fc-cta-do-not-consent',
  '[data-testid="uc-deny-all-button"]',
  '.didomi-continue-without-agreeing',
  '.qc-cmp2-summary-buttons > button[mode="secondary"]',
];

function tryRejectConsent(root: ParentNode): boolean {
  for (const sel of REJECT_SELECTORS) {
    const btn = root.querySelector<HTMLElement>(sel);
    if (btn) {
      btn.click();
      return true;
    }
  }
  const buttons = root.querySelectorAll<HTMLElement>('button, [role="button"], a');
  for (let i = 0; i < buttons.length; i += 1) {
    const btn = buttons[i]!;
    const text = (btn.textContent ?? '').trim();
    if (text.length > 0 && text.length < 40 && REJECT_PATTERNS.test(text)) {
      btn.click();
      return true;
    }
  }
  return false;
}

if (config.cookieBannerAutoReject) {
  window.addEventListener('DOMContentLoaded', () => {
    const style = document.createElement('style');
    style.id = '__aether_consent_css';
    style.textContent = CONSENT_HIDE_CSS;
    document.documentElement.appendChild(style);

    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      if (tryRejectConsent(document) || attempts >= 10) clearInterval(timer);
    }, 700);
  });
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
  const bankHosts = [
    'ziraatbank.com.tr','garanti.com.tr','garantibbva.com.tr','isbank.com.tr',
    'yapikredi.com.tr','akbank.com','denizbank.com','qnbfinansbank.com','teb.com.tr',
    'halkbank.com.tr','vakifbank.com.tr','ing.com.tr','enpara.com','papara.com',
    'paypal.com','chase.com','bankofamerica.com','wellsfargo.com','revolut.com','wise.com',
  ];
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
