import { create } from 'zustand';
import type { SecureNote } from '@shared/types/notes';

// Güvenli notlar mirror — Aşama 6.
// Notlar vault kilitliyken erişilemez; list hata döner. load hata durumunda
// boş liste yerine bir "kilitli" bayrağı bırakır.

interface NotesState {
  notes: SecureNote[];
  loaded: boolean;
  locked: boolean;
  error: string | null;
  selectedId: string | null;
  load: () => Promise<void>;
  add: (title: string, body: string) => Promise<boolean>;
  update: (id: string, patch: Partial<Pick<SecureNote, 'title' | 'body' | 'pinned' | 'color' | 'tags'>>) => Promise<boolean>;
  remove: (id: string) => Promise<boolean>;
  select: (id: string | null) => void;
  togglePin: (id: string) => Promise<boolean>;
}

export const useNotes = create<NotesState>((set, get) => ({
  notes: [],
  loaded: false,
  locked: false,
  error: null,
  selectedId: null,

  load: async () => {
    const res = await window.aether.notes.list();
    if (res.ok && res.data) {
      const notes = res.data as SecureNote[];
      set({
        notes,
        loaded: true,
        locked: false,
        error: null,
        selectedId: notes[0]?.id ?? null,
      });
    } else {
      // Kasa kilitli (veya başka hata): kilitli durumu işaretle.
      set({
        loaded: true,
        locked: true,
        error: res.ok ? null : res.error,
        notes: [],
        selectedId: null,
      });
    }
  },

  add: async (title, body) => {
    const res = await window.aether.notes.add(title, body);
    if (!res.ok) {
      set({ error: res.error });
      return false;
    }
    await get().load();
    return true;
  },

  update: async (id, patch) => {
    const res = await window.aether.notes.update(id, patch);
    if (!res.ok) {
      set({ error: res.error });
      return false;
    }
    await get().load();
    return true;
  },

  remove: async (id) => {
    const res = await window.aether.notes.remove(id);
    if (!res.ok) {
      set({ error: res.error });
      return false;
    }
    const remaining = get().notes.filter((n) => n.id !== id);
    set({
      notes: remaining,
      selectedId: remaining[0]?.id ?? null,
    });
    await get().load();
    return true;
  },

  select: (id) => set({ selectedId: id }),

  togglePin: async (id) => {
    const note = get().notes.find((n) => n.id === id);
    if (!note) return false;
    return get().update(id, { pinned: !note.pinned });
  },
}));