import { create } from 'zustand';
import { showToast } from '@renderer/components/layouts/toast-bus';
import { playUiSound } from '@renderer/hooks/use-sound';

export type DownloadStatus =
  | 'queued'
  | 'progressing'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface DownloadItem {
  id: string;
  filename: string;
  url: string;
  path: string;
  bytesTotal: number;
  bytesReceived: number;
  status: DownloadStatus;
  startedAt: number;
  endedAt?: number;
  mimeType?: string;
  canResume?: boolean;
  sha256?: string;
}

interface DownloadsState {
  items: DownloadItem[];
  loaded: boolean;
  load: () => Promise<void>;
  pause: (id: string) => Promise<void>;
  resume: (id: string) => Promise<void>;
  cancel: (id: string) => Promise<void>;
  open: (id: string) => Promise<void>;
  openFolder: (id?: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  clearCompleted: () => Promise<void>;
  subscribe: () => () => void;
}

let lastToastIds = new Set<string>();

function applyList(items: DownloadItem[]): void {
  for (const item of items) {
    if (
      (item.status === 'progressing' || item.status === 'queued') &&
      !lastToastIds.has(item.id)
    ) {
      lastToastIds.add(item.id);
      showToast(`İndirme başladı: ${item.filename}`, 'info', 4500);
    }
    if (item.status === 'completed' && !lastToastIds.has(`${item.id}:done`)) {
      lastToastIds.add(`${item.id}:done`);
      try { playUiSound('downloadDone'); } catch {}
      showToast({
        message: `İndirme tamamlandı: ${item.filename}`,
        tone: 'success',
        duration: 6000,
        action: {
          label: 'Klasörü Aç',
          onClick: () => {
            void window.aether.downloads.openFolder(item.id);
          }
        }
      });
    }
  }
  // Eski id'leri sınırla
  if (lastToastIds.size > 400) {
    lastToastIds = new Set([...lastToastIds].slice(-200));
  }
}

export const useDownloads = create<DownloadsState>((set, get) => ({
  items: [],
  loaded: false,

  load: async () => {
    const res = await window.aether.downloads.list();
    if (res.ok) {
      const items = (res.data as DownloadItem[]) ?? [];
      // İlk yüklemede toast spam'ini engelle
      for (const item of items) {
        lastToastIds.add(item.id);
        if (item.status === 'completed') lastToastIds.add(`${item.id}:done`);
      }
      set({ items, loaded: true });
    }
  },

  pause: async (id) => {
    await window.aether.downloads.pause(id);
  },

  resume: async (id) => {
    await window.aether.downloads.resume(id);
  },

  cancel: async (id) => {
    await window.aether.downloads.cancel(id);
  },

  open: async (id) => {
    await window.aether.downloads.open(id);
  },

  openFolder: async (id) => {
    await window.aether.downloads.openFolder(id);
  },

  remove: async (id) => {
    await window.aether.downloads.remove(id);
  },

  clearCompleted: async () => {
    await window.aether.downloads.clearCompleted();
  },

  subscribe: () => {
    void get().load();
    return window.aether.downloads.onUpdated((raw) => {
      const items = (raw as DownloadItem[]) ?? [];
      applyList(items);
      set({ items, loaded: true });
    });
  },
}));
