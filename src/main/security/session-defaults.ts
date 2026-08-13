import { app, session, type Session } from 'electron';
import { GUEST_PARTITIONS } from '@main/network/guard';

const attached = new WeakSet<Session>();

// Zararsız, video/oyun deneyimi için gerekli izinler — gizlilik etkisi yok.
const HARMLESS_PERMISSIONS = new Set(['fullscreen', 'pointerLock', 'keyboardLock']);

function harden(ses: Session): void {
  if (attached.has(ses)) return;
  attached.add(ses);
  ses.setPermissionRequestHandler((_wc, perm, callback) => {
    callback(HARMLESS_PERMISSIONS.has(perm));
  });
  try {
    ses.setSpellCheckerEnabled(false);
  } catch {
    /* yoksay */
  }
}

// Oturum güvenlik varsayılanları:
//   - Tüm izin istekleri reddedilir (kamera, mikrofon, konum, bildirim, ...)
//   - Yazım denetimi kapalı
export function registerSecurityDefaults(): void {
  const sessions: Session[] = [
    session.defaultSession,
    ...GUEST_PARTITIONS.map((p) => session.fromPartition(p)),
  ];
  for (const ses of sessions) harden(ses);
  app.setName('AetherNode Secure Browser');
}

export function attachSecurityDefaultsPartition(partition: string): void {
  harden(session.fromPartition(partition));
}
