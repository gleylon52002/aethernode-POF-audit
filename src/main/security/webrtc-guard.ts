import { app, webContents, type WebContents } from 'electron';
import { settingsRepo } from '@main/store';
import { logger } from '@main/utils/logger';

/**
 * WebRTC IP sızıntı koruması.
 *
 * Yalnızca `setWebRTCIPHandlingPolicy('disable_non_proxied_udp')` YETERLİ DEĞİL:
 * proxy yokken Chromium hâlâ STUN üzerinden gerçek public IP toplayabiliyor
 * (Tembrica / browserleaks testlerinde görüldü).
 *
 * Katmanlar:
 *  1. Chromium IP handling politikası (tüm webContents)
 *  2. Uygulama komut satırı anahtarı (erken bağlama)
 *  3. NetworkGuard STUN/TURN engeli (ayrı modül)
 *  4. Guest preload RTCPeerConnection sarmalayıcısı (ayrı)
 */

export function appendWebRtcCommandLineSwitches(): void {
  try {
    // Erken: tüm süreçlere uygulanır
    app.commandLine.appendSwitch(
      'force-webrtc-ip-handling-policy',
      'disable_non_proxied_udp',
    );
    // mDNS host adayı gizleme (yerel IP'ler 192.168.x yerine .local)
    // Not: hide local IPs with mDNS varsayılan Chromium davranışı; açık tutuyoruz.
  } catch (err) {
    logger.warn('WebRTC komut satırı anahtarı uygulanamadı', { err: String(err) });
  }
}

export function applyWebRtcPolicy(contents: WebContents): void {
  const webrtc = settingsRepo.get().privacy.webrtc;
  if (!webrtc.enabled) {
    try {
      contents.setWebRTCIPHandlingPolicy('default');
    } catch {
      /* yoksay */
    }
    return;
  }

  // force_proxy: yalnızca genel arayüz (proxy arkasında anlamlı)
  // block_all / disable_non_proxied_udp: proxy dışı UDP kapalı
  const policy =
    webrtc.policy === 'force_proxy'
      ? 'default_public_interface_only'
      : 'disable_non_proxied_udp';

  try {
    contents.setWebRTCIPHandlingPolicy(policy);
  } catch (err) {
    logger.warn('WebRTC politikası uygulanamadı', { err: String(err) });
  }
}

/** Ayar değişince tüm açık webContents'lere politikayı yeniden uygula. */
export function reapplyWebRtcToAll(): void {
  for (const wc of webContents.getAllWebContents()) {
    if (wc.isDestroyed()) continue;
    applyWebRtcPolicy(wc);
  }
}

/** Bilinen STUN/TURN sunucuları — NetworkGuard bunları engeller. */
export const STUN_TURN_HOSTS = [
  'stun.l.google.com',
  'stun1.l.google.com',
  'stun2.l.google.com',
  'stun3.l.google.com',
  'stun4.l.google.com',
  'stun.services.mozilla.com',
  'stun.stunprotocol.org',
  'stun.cloudflare.com',
  'global.stun.twilio.com',
  'stun.ekiga.net',
  'stun.ideasip.com',
  'stun.voiparound.com',
  'stun.voipbuster.com',
  'stun.voipstunt.com',
  'stun.voxgratia.org',
  'stun.nextcloud.com',
  'turn.cloudflare.com',
] as const;

export function isStunOrTurnHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/\.$/, '');
  return STUN_TURN_HOSTS.some((s) => h === s || h.endsWith('.' + s));
}
