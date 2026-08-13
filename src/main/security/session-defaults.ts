import { app, session, type Session } from 'electron';
import { GUEST_PARTITIONS } from '@main/network/guard';

import { ipcMain } from 'electron';
import { getMainWindow } from '@main/windows';
import { IPC } from '@shared/constants';
import * as crypto from 'crypto';

const attached = new WeakSet<Session>();

// Zararsız, video/oyun deneyimi için gerekli izinler — gizlilik etkisi yok.
const HARMLESS_PERMISSIONS = new Set(['fullscreen', 'pointerLock', 'keyboardLock']);

// Bekleyen izin isteklerini saklamak için map (id -> callback)
const pendingPermissions = new Map<string, (isAllowed: boolean) => void>();

ipcMain.on(IPC.security.permissionsRespond, (_e, id: string, isAllowed: boolean) => {
  const cb = pendingPermissions.get(id);
  if (cb) {
    cb(isAllowed);
    pendingPermissions.delete(id);
  }
});

function harden(ses: Session): void {
  if (attached.has(ses)) return;
  attached.add(ses);
  ses.setPermissionRequestHandler((webContents, perm, callback, details) => {
    if (HARMLESS_PERMISSIONS.has(perm)) {
      return callback(true);
    }
    
    const url = details.requestingUrl || webContents.getURL();
    if (!url || !url.startsWith('http')) {
      return callback(false);
    }
    
    try {
      const origin = new URL(url).origin;
      const win = getMainWindow();
      if (!win) return callback(false);
      
      const id = crypto.randomUUID();
      pendingPermissions.set(id, callback);
      win.webContents.send(IPC.security.permissionsRequest, { id, origin, permission: perm });
    } catch {
      callback(false);
    }
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
