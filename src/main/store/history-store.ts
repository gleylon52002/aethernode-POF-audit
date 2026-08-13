import { SecureStore } from './secure-store';
import type { HistoryEntry } from '@shared/types/history';
import { getDeviceEncryptionKey } from '@main/services/device-key';

const MAX_ENTRIES = 5000;

interface HistoryShape {
  entries: HistoryEntry[];
}

let historyStore: SecureStore<HistoryShape> | null = null;

function store(): SecureStore<HistoryShape> {
  if (!historyStore) {
    historyStore = new SecureStore<HistoryShape>({
      name: 'history',
      encryptionKey: getDeviceEncryptionKey(),
      defaults: { entries: [] },
    });
  }
  return historyStore;
}

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export const historyRepo = {
  list(query?: string, limit = 500): HistoryEntry[] {
    let entries = store().get('entries') ?? [];
    if (query) {
      const q = query.toLowerCase();
      entries = entries.filter(
        (e) => e.url.toLowerCase().includes(q) || e.title.toLowerCase().includes(q),
      );
    }
    return entries.slice(0, limit);
  },

  add(url: string, title: string): HistoryEntry {
    const entries = store().get('entries') ?? [];
    const existingIdx = entries.findIndex((e) => e.url === url);
    let entry: HistoryEntry;
    if (existingIdx >= 0) {
      const existing = entries[existingIdx]!;
      entry = {
        ...existing,
        title: title || existing.title,
        visitedAt: Date.now(),
        visitCount: existing.visitCount + 1,
      };
      entries.splice(existingIdx, 1);
    } else {
      entry = { id: newId(), url, title, visitedAt: Date.now(), visitCount: 1 };
    }
    const next = [entry, ...entries];
    if (next.length > MAX_ENTRIES) next.length = MAX_ENTRIES;
    store().set('entries', next);
    return entry;
  },

  remove(id: string): void {
    const entries = store().get('entries') ?? [];
    store().set(
      'entries',
      entries.filter((e) => e.id !== id),
    );
  },

  clear(): void {
    store().set('entries', []);
  },

  exportAll(): HistoryEntry[] {
    return store().get('entries') ?? [];
  },

  importAll(entries: HistoryEntry[]): void {
    store().set('entries', entries.slice(0, MAX_ENTRIES));
  },
};
