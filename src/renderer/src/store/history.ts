import { create } from 'zustand';
import type { HistoryEntry } from '@shared/types/history';

// Gezinme geçmişi mirror — kalıcılık main process'te (şifreli store).
// Incognito sekmelerin ziyaretleri record() tarafından hiç gönderilmez
// (webview-stack profil kontrolü yapar).
interface HistoryState {
  entries: HistoryEntry[];
  loaded: boolean;
  load: (query?: string) => Promise<void>;
  record: (url: string, title: string) => void;
  remove: (id: string) => Promise<void>;
  clear: () => Promise<void>;
}

export const useHistory = create<HistoryState>((set, get) => ({
  entries: [],
  loaded: false,

  load: async (query?: string) => {
    const res = await window.aether.history.list(query);
    if (res.ok) set({ entries: (res.data as HistoryEntry[]) ?? [], loaded: true });
  },

  record: (url, title) => {
    // http(s) dışındaki adresler (dahili sayfalar, data: vb.) kaydedilmez.
    if (!/^https?:\/\//i.test(url)) return;
    void window.aether.history.add(url, title).then((res) => {
      if (res.ok && get().loaded) void get().load();
    });
  },

  remove: async (id) => {
    await window.aether.history.remove(id);
    set((s) => ({ entries: s.entries.filter((e) => e.id !== id) }));
  },

  clear: async () => {
    await window.aether.history.clear();
    set({ entries: [] });
  },
}));
