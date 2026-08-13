import { z } from 'zod';
import { defineHandler, noPayload } from '@main/ipc/router';
import { IPC } from '@shared/constants';
import { historyRepo } from '@main/store';

const VISIT_DEDUPE_MS = 45_000;
const recentVisits = new Map<string, number>();

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function shouldEmitVisit(page: string): boolean {
  const now = Date.now();
  const prev = recentVisits.get(page) ?? 0;
  if (now - prev < VISIT_DEDUPE_MS) return false;
  recentVisits.set(page, now);
  if (recentVisits.size > 400) {
    const cutoff = now - VISIT_DEDUPE_MS;
    for (const [k, t] of recentVisits) {
      if (t < cutoff) recentVisits.delete(k);
    }
  }
  return true;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function isSearchUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const q =
      u.searchParams.get('q') ||
      u.searchParams.get('query') ||
      u.searchParams.get('p') ||
      u.searchParams.get('text');
    if (q && q.trim()) return q.trim().slice(0, 200);
  } catch {
    /* ignore */
  }
  return null;
}

export function registerHistoryHandlers(): void {
  defineHandler({
    channel: IPC.history.list,
    schema: z.object({ query: z.string().optional() }).optional(),
    handle: (payload) => historyRepo.list(payload?.query),
  });

  defineHandler({
    channel: IPC.history.add,
    schema: z.object({ url: z.string().url(), title: z.string().optional() }),
    handle: ({ url, title }) => {
      const entry = historyRepo.add(url, title ?? '');
      return entry;
    },
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
