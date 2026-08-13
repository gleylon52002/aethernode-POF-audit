import { shell } from 'electron';
import { logger } from '@main/utils/logger';

/**
 * Yalnızca http(s) dış bağlantıları açar — javascript:, file:, data: vb. reddedilir.
 * Varsayılan: https zorunlu (güvenli tarayıcı politikası).
 */
export function openSafeExternal(url: string, opts?: { allowHttp?: boolean }): boolean {
  try {
    const u = new URL(url);
    const ok =
      u.protocol === 'https:' || (opts?.allowHttp === true && u.protocol === 'http:');
    if (!ok) {
      logger.warn('openExternal reddedildi (şema)', { url: url.slice(0, 120) });
      return false;
    }
    void shell.openExternal(u.toString());
    return true;
  } catch {
    logger.warn('openExternal reddedildi (geçersiz URL)', { url: url.slice(0, 120) });
    return false;
  }
}
