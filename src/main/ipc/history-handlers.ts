import { z } from 'zod';
import { defineHandler, noPayload } from '@main/ipc/router';
import { IPC } from '@shared/constants';
import { historyRepo } from '@main/store';

// Gezinme geçmişi handler'ları. Incognito sekmeler renderer tarafında
// hiç add çağırmaz — main geçmişe yalnızca normal sekme ziyaretleri düşer.
export function registerHistoryHandlers(): void {
  defineHandler({
    channel: IPC.history.list,
    schema: z.object({ query: z.string().optional() }).optional(),
    handle: (payload) => historyRepo.list(payload?.query),
  });

  defineHandler({
    channel: IPC.history.add,
    schema: z.object({ url: z.string().url(), title: z.string().optional() }),
    handle: ({ url, title }) => historyRepo.add(url, title ?? ''),
  });

  defineHandler({
    channel: IPC.history.remove,
    schema: z.object({ id: z.string() }),
    handle: ({ id }) => {
      historyRepo.remove(id);
      return true;
    },
  });

  defineHandler({
    channel: IPC.history.clear,
    schema: noPayload,
    handle: () => {
      historyRepo.clear();
      return true;
    },
  });
}
