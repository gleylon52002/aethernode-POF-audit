import {
  session,
  webContents,
  type OnHeadersReceivedListenerDetails,
  type Session,
} from 'electron';
import { settingsRepo } from '@main/store';
import { GUEST_PARTITIONS } from '@main/network/guard';
import { logger } from '@main/utils/logger';

// Çerez hırsızlığı / çapraz-site takip koruması:
//   - 3. parti Set-Cookie yanıtlarını düşürür
//   - isolateFirstParty: initiator yoksa üst çerçeve URL ile karşılaştır
//   - Bilinen takipçi domain çerezlerini siler

const attached = new WeakSet<Session>();

function registrableHint(hostname: string): string {
  const parts = hostname.toLowerCase().replace(/\.$/, '').split('.');
  if (parts.length <= 2) return parts.join('.');
  const multi = new Set(['co.uk', 'com.tr', 'com.br', 'co.jp', 'com.au']);
  const last2 = parts.slice(-2).join('.');
  const last3 = parts.slice(-3).join('.');
  if (multi.has(last2) && parts.length >= 3) return last3;
  return last2;
}

function topLevelUrl(details: OnHeadersReceivedListenerDetails): string {
  const initiator =
    (details as { initiator?: string }).initiator || details.referrer || '';
  if (initiator) return initiator;
  try {
    const id = (details as { webContentsId?: number }).webContentsId;
    if (typeof id === 'number') {
      const wc = webContents.fromId(id);
      const u = wc?.getURL();
      if (u) return u;
    }
  } catch {
    /* yoksay */
  }
  return '';
}

function isThirdParty(requestUrl: string, topUrl: string, isolateFirstParty: boolean): boolean {
  if (!topUrl) {
    // İlk parti izolasyonunda belirsiz köken = 3. parti say (güvenli taraf)
    return isolateFirstParty;
  }
  try {
    const req = new URL(requestUrl);
    const init = new URL(topUrl);
    if (req.protocol !== 'http:' && req.protocol !== 'https:') return false;
    if (init.protocol !== 'http:' && init.protocol !== 'https:') return false;
    return registrableHint(req.hostname) !== registrableHint(init.hostname);
  } catch {
    return isolateFirstParty;
  }
}

function stripSetCookie(
  headers: Record<string, string | string[]> | undefined,
): Record<string, string | string[]> | undefined {
  if (!headers) return headers;
  const next: Record<string, string | string[]> = {};
  for (const [k, v] of Object.entries(headers)) {
    if (k.toLowerCase() === 'set-cookie') continue;
    next[k] = v;
  }
  return next;
}

function attach(ses: Session): void {
  if (attached.has(ses)) return;
  attached.add(ses);

  ses.webRequest.onHeadersReceived(
    { urls: ['http://*/*', 'https://*/*'] },
    (details: OnHeadersReceivedListenerDetails, callback) => {
      const cfg = settingsRepo.get().privacy.cookies;
      if (!cfg.blockThirdParty && !cfg.isolateFirstParty) {
        callback({ responseHeaders: details.responseHeaders });
        return;
      }

      const top = topLevelUrl(details);
      if (!isThirdParty(details.url, top, !!cfg.isolateFirstParty)) {
        callback({ responseHeaders: details.responseHeaders });
        return;
      }

      callback({ responseHeaders: stripSetCookie(details.responseHeaders) });
    },
  );

  ses.cookies.on('changed', (_e, cookie, _cause, removed) => {
    if (removed) return;
    const cfg = settingsRepo.get().privacy.cookies;
    if (!cfg.blockThirdParty) return;
    const host = (cookie.domain || '').replace(/^\./, '');
    if (
      /doubleclick\.|googlesyndication\.|googleadservices\.|facebook\.com$|fbcdn\.|hotjar\.|scorecardresearch\./i.test(
        host,
      )
    ) {
      void ses.cookies
        .remove(
          `${cookie.secure ? 'https' : 'http'}://${host.replace(/^\./, '')}${cookie.path || '/'}`,
          cookie.name,
        )
        .catch(() => undefined);
    }
  });
}

export function enableCookieGuard(): void {
  const sessions = [
    session.defaultSession,
    ...GUEST_PARTITIONS.map((p) => session.fromPartition(p)),
  ];
  for (const ses of sessions) attach(ses);
  logger.info('Cookie guard aktif (3. parti + ilk parti izolasyon)');
}

export function attachCookieGuardPartition(partition: string): void {
  attach(session.fromPartition(partition));
}
