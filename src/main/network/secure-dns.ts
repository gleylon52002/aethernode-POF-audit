import { app } from 'electron';
import { logger } from '@main/utils/logger';
import type { AppSettings } from '@shared/types/settings';

// SecureDnsManager — Chromium'un yerleşik güvenli DNS (DoH) çözümleyicisini
// yapılandırır. 'secure' modda TÜM DNS sorguları belirtilen DoH sunucusuna
// gider; sistem çözücüsüne düşüş yoktur (ISS seviyesinde DNS izleme kapanır).
//
// Not: app.configureHostResolver yalnızca app ready sonrasında çağrılabilir
// ve tüm session'ları etkiler. DoT (853/TCP) Chromium tarafından
// desteklenmediği için 'dot' modu da DoH şablonuna düşer — kullanıcıya
// arayüzde belirtilir.

// Birincil sunucu erişilemezse denenecek yedek DoH sunucuları.
const FALLBACK_DOH = [
  'https://cloudflare-dns.com/dns-query',
  'https://dns.google/dns-query',
  'https://dns.quad9.net/dns-query',
];

export function applySecureDns(settings: AppSettings): void {
  const dns = settings.privacy.dns;
  try {
    if (dns.enabled && dns.mode !== 'off' && dns.dohUrl) {
      const servers = [dns.dohUrl, ...FALLBACK_DOH.filter((s) => s !== dns.dohUrl)];
      // 'automatic': DoH öncelikli, sunucular yanıt vermezse sistem çözücüsüne
      // düşer — 'secure' katı modu tek sunucu arızasında TÜM siteleri
      // kilitliyordu (ERR_EMPTY_RESPONSE / ERR_NAME_NOT_RESOLVED dalgaları).
      app.configureHostResolver({
        secureDnsMode: 'automatic',
        secureDnsServers: servers,
      });
      logger.info(`Secure DNS aktif (fallback'li): ${servers.join(', ')}`);
    } else {
      app.configureHostResolver({ secureDnsMode: 'automatic', secureDnsServers: [] });
      logger.info('Secure DNS kapalı (sistem çözücüsü)');
    }
  } catch (cause) {
    logger.error('Secure DNS yapılandırılamadı', {
      error: cause instanceof Error ? cause.message : String(cause),
    });
  }
}
