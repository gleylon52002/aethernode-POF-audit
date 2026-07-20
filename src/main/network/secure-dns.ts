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

export function applySecureDns(settings: AppSettings): void {
  const dns = settings.privacy.dns;
  try {
    if (dns.enabled && dns.mode !== 'off' && dns.dohUrl) {
      app.configureHostResolver({
        secureDnsMode: 'secure',
        secureDnsServers: [dns.dohUrl],
      });
      logger.info(`Secure DNS aktif: ${dns.dohUrl}`);
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
