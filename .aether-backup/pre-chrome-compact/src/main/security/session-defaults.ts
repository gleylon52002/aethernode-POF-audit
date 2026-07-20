import { app, session, type Session } from 'electron';
import { GUEST_PARTITIONS } from '@main/network/guard';

// Oturum güvenlik varsayılanları:
//   - Tüm izin istekleri (kamera, mikrofon, konum, bildirim, ...) reddedilir.
//     Sekme içerikleri ayrı partition'larda çalıştığı için deny-all kuralı
//     default session'a ek olarak guest partition'lara da uygulanır.
//   - Yazım denetimi kapalı (kelimelerin işletim sistemi servislerine
//     gönderilmesini önler).
export function registerSecurityDefaults(): void {
  const sessions: Session[] = [
    session.defaultSession,
    ...GUEST_PARTITIONS.map((p) => session.fromPartition(p)),
  ];

  for (const ses of sessions) {
    ses.setPermissionRequestHandler((_wc, _perm, callback) => {
      callback(false);
    });
    try {
      ses.setSpellCheckerEnabled(false);
    } catch {
      /* yoksay */
    }
  }

  app.setName('AetherNode Secure Browser');
}
