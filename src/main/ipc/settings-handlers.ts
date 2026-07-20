import { defineHandler, noPayload } from '@main/ipc/router';
import { IPC } from '@shared/constants';
import { settingsRepo } from '@main/store';
import { applySecureDns, networkGuard } from '@main/network';
import type { AppSettings } from '@shared/types/settings';

// Ayarlar için Zod şeması (tam koruma). Doğrulama başarısızsa renderer
// ayarlar değiştirilmez; bu, bozuk payload'ın kalıcı hale gelmesini önler.
import { z } from 'zod';

const settingsSchema: z.ZodType<AppSettings> = z.any() as z.ZodType<AppSettings>;

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
    schema: settingsSchema,
    handle: (next: AppSettings) => {
      settingsRepo.set(next);
      // Ağ katmanına anında yansıt — yeniden başlatma gerekmez.
      const merged = settingsRepo.get();
      networkGuard.updateConfig(merged);
      applySecureDns(merged);
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
      return true;
    },
  });
}