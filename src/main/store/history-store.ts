import { SecureStore } from './secure-store';
import type { HistoryEntry } from '@shared/types/history';

// Gezinme geçmişi deposu — şifreli yerel kalıcılık.
// Incognito sekmeler renderer tarafında hiç add çağırmadığı için
// buraya asla düşmez. Kayıt sayısı sınırlandırılır (performans).
const KEY = process.env.AETHER_KEY ?? 'aethernode-device-key';
const MAX_ENTRIES = 5000;

interface HistoryShape {
  entries: HistoryEntry[];
}

const historyStore = new SecureStore<HistoryShape>({
  name: 'history',
  encryptionKey: KEY,
  defaults: { entries: [] },
});

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export const historyRepo = {
  list(query?: string, limit = 500): HistoryEntry[] {
    let entries = historyStore.get('entries') ?? [];
    if (query) {
      const q = query.toLowerCase();
      entries = entries.filter(
        (e) => e.url.toLowerCase().includes(q) || e.title.toLowerCase().includes(q),
      );
    }
    return entries.slice(0, limit);
  },

  add(url: string, title: string): HistoryEntry {
    const entries = historyStore.get('entries') ?? [];
    // Aynı URL art arda ziyaret edildiyse sayaç artırılır, kayıt öne alınır.
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
    historyStore.set('entries', next);
    return entry;
  },

  remove(id: string): void {
    const entries = historyStore.get('entries') ?? [];
    historyStore.set(
      'entries',
      entries.filter((e) => e.id !== id),
    );
  },

  clear(): void {
    historyStore.set('entries', []);
  },
};
