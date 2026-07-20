import { ipcMain } from 'electron';
import { z, type ZodSchema } from 'zod';
import { validate } from '@shared/utils';
import { err, ok, type Result } from '@shared/types/result';

// Tüm IPC handler'ları tek noktadan kaydedilir. Her handler Zod şeması ile
// payload doğrular; güvensiz payload hata olarak döner. Handler hata
// yakalama merkezidir — renderer'a structured Result döner.
type Handler<P, R> = (payload: P) => Promise<R> | R;

interface Route<P, R> {
  channel: string;
  schema: ZodSchema<P>;
  handle: Handler<P, R>;
}

const routes: Route<unknown, unknown>[] = [];

export function defineHandler<P, R>(route: Route<P, R>): void {
  routes.push(route as Route<unknown, unknown>);
}

export function registerIpcHandlers(): void {
  for (const route of routes) {
    ipcMain.handle(route.channel, async (_e, raw: unknown): Promise<Result> => {
      const validation = validate(route.schema, raw);
      if (!validation.ok) return validation;
      try {
        const data = await route.handle(validation.data);
        return ok(data);
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : 'Bilinmeyen IPC hatası';
        return err(message, 'HANDLER_FAILURE');
      }
    });
  }
}

// Boş şema ile payload yok anlamına gelir.
export const noPayload = z.unknown().optional();

// Test/utility: tüm kanalları listele.
export function listChannels(): readonly string[] {
  return routes.map((r) => r.channel);
}