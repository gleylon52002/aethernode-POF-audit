import { defineHandler, noPayload } from '@main/ipc/router';
import { IPC } from '@shared/constants';
import { settingsRepo } from '@main/store';
import { applySecureDns, networkGuard } from '@main/network';
import { reapplyWebRtcToAll } from '@main/security/webrtc-guard';
import { setVaultAutoLockMinutes } from '@main/services/vault';
import { appSettingsSchema } from '@shared/schemas/settings';
import type { AppSettings } from '@shared/types/settings';
import { z } from 'zod';

export function registerSettingsHandlers(): void {
  defineHandler({
    channel: IPC.settings.all,
    schema: noPayload,
    handle: () => settingsRepo.get(),
  });

  defineHandler({
    channel: IPC.settings.get,
    schema: z.object({ key: z.string() }),
    handle: ({ key }) => {
      const all = settingsRepo.get() as unknown as Record<string, unknown>;
      return all[key];
    },
  });

  defineHandler({
    channel: IPC.settings.set,
    schema: appSettingsSchema,
    handle: (next: AppSettings) => {
      // const prev = settingsRepo.get();
      settingsRepo.set(next);
      const merged = settingsRepo.get();
      networkGuard.updateConfig(merged);
      applySecureDns(merged);
      reapplyWebRtcToAll();
      setVaultAutoLockMinutes(merged.security.vaultAutoLockMinutes ?? 5);
      return true;
    },
  });

  defineHandler({
    channel: IPC.settings.reset,
    schema: noPayload,
    handle: () => {
      settingsRepo.reset();
      const merged = settingsRepo.get();
      networkGuard.updateConfig(merged);
      applySecureDns(merged);
      reapplyWebRtcToAll();
      setVaultAutoLockMinutes(merged.security.vaultAutoLockMinutes ?? 5);
      return true;
    },
  });
}
