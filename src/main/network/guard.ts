import {
  session,
  type OnBeforeRequestListenerDetails,
  type Session,
} from 'electron';
import { EventEmitter } from 'node:events';
import { logger } from '@main/utils/logger';
import { isBlockedDomain } from './blocklist';
import { cleanTrackingParams } from '@shared/utils';
import type { AppSettings } from '@shared/types/settings';

// YouTube reklam istekleri — googlevideo playback'e ASLA dokunma
// (içerik videosu aynı CDN'den gelir; agresif filtre videoyu geciktirir).
function isYouTubeAdRequest(_url: string, hostname: string, path: string): boolean {
  const host = hostname.toLowerCase();
  const p = path.toLowerCase();

  // Saf reklam domain'leri
  if (
    host.includes('doubleclick.net') ||
    host.includes('googlesyndication.com') ||
    host.includes('googleadservices.com') ||
    host === 'ads.youtube.com' ||
    host.endsWith('.ads.youtube.com')
  ) {
    return true;
  }

  // googlevideo = içerik akışı — engelleme
  if (host.includes('googlevideo.com')) return false;

  // Yalnızca youtube.com üzerindeki net reklam uçları (playback CDN değil)
  if (host.includes('youtube.com') || host.includes('youtu.be')) {
    return (
      p.includes('/pagead/') ||
      p.includes('/ptracking') ||
      p.includes('/api/stats/ads') ||
      p.includes('/api/stats/atr') ||
      p.includes('/get_midroll_') ||
      p.includes('/youtubei/v1/player/ad_') ||
      p.includes('/pcs/activeview') ||
      p.includes('/pagead/adview') ||
      p.includes('/pagead/conversion') ||
      p.includes('/ad_break') ||
      p.includes('/api/sponsored_')
    );
  }

  return false;
}

// Network Guard — gerçek ağ katmanı enforcement (Aşama 6b).
//
// Sekme webview'ları 'persist:default' ve 'incognito' partition'larında
// çalıştığı için guard her üç session'a da (default dahil) bağlanır.
//
// Yaptıkları:
//   1. Tracker/reklam engelleme — yerleşik domain blocklist, alt alan adı
//      eşleştirmeli, istek yapılmadan ÖNCE iptal (sıfır bant genişliği).
//   2. HTTPS zorlama — http:// ana çerçeve istekleri https'e yükseltilir.
//   3. Karışık içerik engelleme — https sayfada http alt kaynak iptal edilir.
//   4. Tracking parametresi temizleme — ana çerçeve URL'lerinden utm_* vb.
//      parametreler redirect ile temizlenir.
//   5. DNT başlığı — doNotTrack açıkken her isteğe DNT: 1 eklenir.
//
// Ayar anlık görüntüsü bellekte tutulur (istek başına disk okuması yok);
// settings.set handler'ı updateConfig ile tazeler.

export interface CapturedRequest {
  id: string;
  url: string;
  method: string;
  resourceType: string;
  at: number;
}

export interface BlockedRequest {
  url: string;
  host: string;
  resourceType: string;
  totalBlocked: number;
  at: number;
}

interface GuardConfig {
  trackersEnabled: boolean;
  forceHttps: boolean;
  blockMixedContent: boolean;
  urlCleanerEnabled: boolean;
  doNotTrack: boolean;
}

const DEFAULT_CONFIG: GuardConfig = {
  trackersEnabled: true,
  forceHttps: true,
  blockMixedContent: true,
  urlCleanerEnabled: true,
  doNotTrack: true,
};

// Sekme içeriklerinin kullandığı partition'lar.
export const GUEST_PARTITIONS = ['persist:default', 'persist:bank', 'incognito'] as const;

// Loopback / yerel adresler HTTPS zorlama ve engelleme dışıdır
// (dev sunucusu, yerel servisler, router arayüzleri).
function isLocalHost(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '[::1]' ||
    hostname === '::1' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local')
  );
}

class NetworkGuard extends EventEmitter {
  private attached = new WeakSet<Session>();
  private inspectorOn = false;
  private counter = 0;
  private blockedTotal = 0;
  private config: GuardConfig = { ...DEFAULT_CONFIG };

  // Uygulama açılışında çağrılır: tüm ilgili session'lara kancaları bağlar.
  enable(): void {
    const sessions = [
      session.defaultSession,
      ...GUEST_PARTITIONS.map((p) => session.fromPartition(p)),
    ];
    for (const ses of sessions) this.attach(ses);
    logger.info('NetworkGuard etkin (blocking mode)');
  }

  disable(): void {
    // Inspector kapatma — engelleme aktif kalır, yalnızca captured akışı durur.
    this.inspectorOn = false;
  }

  setInspector(on: boolean): void {
    this.inspectorOn = on;
  }

  isEnabled(): boolean {
    return this.inspectorOn;
  }

  getBlockedTotal(): number {
    return this.blockedTotal;
  }

  updateConfig(settings: AppSettings): void {
    this.config = {
      trackersEnabled: settings.privacy.trackers.enabled,
      forceHttps: settings.privacy.https.enabled && settings.privacy.https.forceHttps,
      blockMixedContent:
        settings.privacy.https.enabled && settings.privacy.https.blockMixedContent,
      urlCleanerEnabled: settings.privacy.urlCleaner.enabled,
      doNotTrack: settings.general.doNotTrack,
    };
  }

  private attach(ses: Session): void {
    if (this.attached.has(ses)) return;
    this.attached.add(ses);
    ses.webRequest.onBeforeRequest((details, callback) =>
      this.onBefore(details, callback),
    );
    ses.webRequest.onBeforeSendHeaders((details, callback) => {
      const headers = { ...details.requestHeaders };
      if (this.config.doNotTrack) {
        headers['DNT'] = '1';
        headers['Sec-GPC'] = '1';
      }
      callback({ requestHeaders: headers });
    });
  }

  private onBefore(
    details: OnBeforeRequestListenerDetails,
    callback: (res: Electron.CallbackResponse) => void,
  ): void {
    const { url, resourceType } = details;
    const isMainFrame = resourceType === 'mainFrame';

    if (this.inspectorOn) {
      const captured: CapturedRequest = {
        id: `${++this.counter}`,
        url,
        method: details.method,
        resourceType,
        at: Date.now(),
      };
      this.emit('captured', captured);
    }

    // Yalnızca http(s) trafiğine karışılır; devtools/file/blob serbest.
    if (!/^https?:\/\//i.test(url)) {
      callback({});
      return;
    }

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      callback({});
      return;
    }

    if (isLocalHost(parsed.hostname)) {
      callback({});
      return;
    }

    // 1. Tracker/reklam engelleme (ana çerçeve hariç).
    //    Domain listesi + bilinen reklam script yolu kalıpları.
    if (this.config.trackersEnabled && !isMainFrame) {
      const path = parsed.pathname.toLowerCase();
      const adPath =
        /\/(pagead2?|ads)\.js$/i.test(path) ||
        /\/widget\/ads\./i.test(path);
      const ytAd = isYouTubeAdRequest(url, parsed.hostname, path);
      if (isBlockedDomain(parsed.hostname) || adPath || ytAd) {
        this.blockedTotal += 1;
        const blocked: BlockedRequest = {
          url,
          host: parsed.hostname,
          resourceType,
          totalBlocked: this.blockedTotal,
          at: Date.now(),
        };
        this.emit('blocked', blocked);
        callback({ cancel: true });
        return;
      }
    }

    // 2. HTTPS zorlama — ana çerçeve http isteği https'e yükseltilir.
    if (this.config.forceHttps && isMainFrame && parsed.protocol === 'http:') {
      parsed.protocol = 'https:';
      callback({ redirectURL: parsed.toString() });
      return;
    }

    // 3. Karışık içerik — https sayfadan gelen http alt kaynak iptal edilir.
    if (
      this.config.blockMixedContent &&
      !isMainFrame &&
      parsed.protocol === 'http:' &&
      details.referrer.startsWith('https://')
    ) {
      callback({ cancel: true });
      return;
    }

    // 4. Tracking parametresi temizleme (ana çerçeve).
    if (this.config.urlCleanerEnabled && isMainFrame) {
      const cleaned = cleanTrackingParams(url);
      if (cleaned !== url) {
        callback({ redirectURL: cleaned });
        return;
      }
    }

    callback({});
  }
}

export const networkGuard = new NetworkGuard();
