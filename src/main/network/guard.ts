import {
  session,
  webContents,
  type OnBeforeRequestListenerDetails,
  type Session,
} from 'electron';
import { EventEmitter } from 'node:events';
import { logger } from '@main/utils/logger';
import { cleanTrackingParams } from '@shared/utils';
import type { AppSettings } from '@shared/types/settings';
import { shouldBlockRequest, enableFilterEngine, filterStats, updateFilterLists } from './filter-engine';
import { isStunOrTurnHost } from '@main/security/webrtc-guard';

// re-export for callers
export { enableFilterEngine, filterStats, updateFilterLists };

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
  /** Uniformity fingerprint modu — Client Hints başlıkları sabitlenir */
  uniformity: boolean;
  /** WebRTC STUN/TURN sunucularını engelle (IP sızıntısı) */
  blockStun: boolean;
  webrtcAllowedHosts: string[];
}

const DEFAULT_CONFIG: GuardConfig = {
  trackersEnabled: true,
  forceHttps: true,
  blockMixedContent: true,
  urlCleanerEnabled: true,
  doNotTrack: true,
  uniformity: false,
  blockStun: true,
  webrtcAllowedHosts: [] as string[],
};

// Sekme içeriklerinin kullandığı sabit partition'lar.
export const GUEST_PARTITIONS = ['persist:default', 'persist:bank', 'incognito'] as const;

/**
 * Dinamik partition kayıt defteri.
 * persist:tab:*, persist:ct:*, persist:pwa-* gibi runtime'da oluşturulan
 * partition adlarını takip eder. Temizlik fonksiyonları bu listeyi kullanır.
 */
const _dynamicPartitions = new Set<string>();

export function registerDynamicPartition(name: string): void {
  if (name && name.startsWith('persist:') && !GUEST_PARTITIONS.includes(name as typeof GUEST_PARTITIONS[number])) {
    _dynamicPartitions.add(name);
  }
}

export function unregisterDynamicPartition(name: string): void {
  _dynamicPartitions.delete(name);
}

/** Sabit + dinamik tüm partition isimlerini döndürür. */
export function getAllPartitions(): string[] {
  return [...GUEST_PARTITIONS, ..._dynamicPartitions];
}

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

function normalizeHost(hostname: string): string {
  return hostname.toLowerCase().replace(/^www\./, '').replace(/\.$/, '').trim();
}

/** İsteğin geldiği sekme sayfasının host'u (üst çerçeve). */
function pageHostFromDetails(details: OnBeforeRequestListenerDetails): string | null {
  try {
    const id = details.webContentsId;
    if (typeof id !== 'number') return null;
    const wc = webContents.fromId(id);
    if (!wc || wc.isDestroyed()) return null;
    const pageUrl = wc.getURL();
    if (!pageUrl || !/^https?:\/\//i.test(pageUrl)) return null;
    return normalizeHost(new URL(pageUrl).hostname);
  } catch {
    return null;
  }
}

class NetworkGuard extends EventEmitter {
  private attached = new WeakSet<Session>();
  private inspectorOn = false;
  private counter = 0;
  private blockedTotal = 0;
  private config: GuardConfig = { ...DEFAULT_CONFIG };
  /** uBlock tarzı: bu sitelerde reklam/izleyici engeli kapalı (yalnızca hostname) */
  private pausedHosts = new Set<string>();

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

  /** Host için engellemeyi durdur/aç (normalize edilmiş hostname). */
  setSiteProtectionPaused(hostname: string, paused: boolean): void {
    const h = normalizeHost(hostname);
    if (!h) return;
    if (paused) this.pausedHosts.add(h);
    else this.pausedHosts.delete(h);
  }

  isSiteProtectionPaused(hostname: string): boolean {
    const h = normalizeHost(hostname);
    if (!h) return false;
    for (const p of this.pausedHosts) {
      if (h === p || h.endsWith('.' + p)) return true;
    }
    return false;
  }

  listPausedSites(): string[] {
    return [...this.pausedHosts];
  }

  /** Dinamik sekme partition'ları (per-tab isolation) için. */
  attachPartition(partition: string): void {
    this.attach(session.fromPartition(partition));
  }

  updateConfig(settings: AppSettings): void {
    this.config = {
      trackersEnabled: settings.privacy.trackers.enabled,
      forceHttps: settings.privacy.https.enabled && settings.privacy.https.forceHttps,
      blockMixedContent:
        settings.privacy.https.enabled && settings.privacy.https.blockMixedContent,
      urlCleanerEnabled: settings.privacy.urlCleaner.enabled,
      doNotTrack: settings.general.doNotTrack,
      uniformity:
        settings.privacy.fingerprint.enabled &&
        settings.privacy.fingerprint.mode === 'uniformity',
      blockStun: settings.privacy.webrtc.enabled,
      webrtcAllowedHosts: [...(settings.privacy.webrtc.allowedHosts ?? [])].map(normalizeHost).filter(Boolean),
    };
  }

  isWebRtcAllowedForHost(hostname: string): boolean {
    const h = normalizeHost(hostname);
    if (!h) return false;
    for (const a of this.config.webrtcAllowedHosts) {
      if (h === a || h.endsWith('.' + a)) return true;
    }
    return false;
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
      if (this.config.uniformity) {
        // Client Hints — tüm kullanıcılarda aynı standart değerler
        for (const k of Object.keys(headers)) {
          if (/^sec-ch-ua/i.test(k)) delete headers[k];
        }
        headers['Sec-CH-UA'] =
          '"Chromium";v="126", "Google Chrome";v="126", "Not-A.Brand";v="99"';
        headers['Sec-CH-UA-Mobile'] = '?0';
        headers['Sec-CH-UA-Platform'] = '"Windows"';
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

    // 0. WebRTC STUN/TURN — gerçek IP sızıntısını kes (Google STUN vb.)
    // Site bazlı istisna: Meet/Zoom/Discord gibi siteler için STUN'e izin ver
    if (this.config.blockStun && isStunOrTurnHost(parsed.hostname)) {
      const pageHost = pageHostFromDetails(details);
      if (pageHost && this.isWebRtcAllowedForHost(pageHost)) {
        callback({});
        return;
      }
      this.blockedTotal += 1;
      this.emit('blocked', {
        url,
        host: parsed.hostname,
        resourceType,
        totalBlocked: this.blockedTotal,
        at: Date.now(),
      } satisfies BlockedRequest);
      callback({ cancel: true });
      return;
    }

    // 1. Tracker/reklam engelleme (ana çerçeve hariç).
    //    Bu sitede koruma duraklatıldıysa atlanır (uBlock "site için kapat").
    const pageHost = pageHostFromDetails(details);
    const sitePaused = pageHost ? this.isSiteProtectionPaused(pageHost) : false;
    if (this.config.trackersEnabled && !isMainFrame && !sitePaused) {
      const path = parsed.pathname.toLowerCase();
      // Dar path kuralları — /ads/ gibi geniş kalıplar site CSS/JS'ini kırıyordu
      const adPath =
        /\/(pagead2?|show_ads|adserver)\.js$/i.test(path) ||
        /\/widget\/ads\./i.test(path) ||
        /\/pagead\//i.test(path);
      const ytAd = isYouTubeAdRequest(url, parsed.hostname, path);
      const domainHit = shouldBlockRequest(
        parsed.hostname,
        resourceType,
        details.referrer || '',
      );
      if (domainHit || adPath || ytAd) {
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
    // Referrer boş olabilir (strict-origin) — initiator ve webContents URL de kontrol edilir, fail-closed değil fail-open.
    if (
      this.config.blockMixedContent &&
      !isMainFrame &&
      parsed.protocol === 'http:'
    ) {
      const ref = details.referrer || '';
      const init = (details as unknown as { initiator?: string }).initiator || '';
      const pageHostForMixed = pageHostFromDetails(details);
      const isHttpsContext =
        ref.startsWith('https://') ||
        init.startsWith('https://') ||
        (pageHostForMixed !== null && details.webContentsId !== undefined && (() => {
          try {
            const wc = webContents.fromId(details.webContentsId);
            const pageUrl = wc?.getURL() || '';
            return pageUrl.startsWith('https://');
          } catch { return false; }
        })());
      if (isHttpsContext) {
        callback({ cancel: true });
        return;
      }
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
