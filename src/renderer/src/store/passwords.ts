import { create } from 'zustand';
import type { PasswordEntry, VaultStatus } from '@shared/types/passwords';

// Şifre kasa mirror — Aşama 6.
//
// Kasa kilitliyken entries boş, unlocked false. unlock başarılısa main'den
// entries çekilir; hatalı parola Result<Err> döner, store kilidi açmaz.
// CRUD sonrası her seferinde list yeniden çekilir (tek pencere, sıralı işlem).

interface PasswordsState {
  entries: PasswordEntry[];
  status: VaultStatus | null;
  loaded: boolean;
  load: () => Promise<void>;
  unlock: (password: string) => Promise<boolean>;
  lock: () => Promise<void>;
  add: (entry: Omit<PasswordEntry, 'id' | 'createdAt' | 'updatedAt'>) => Promise<boolean>;
  update: (id: string, patch: Partial<Omit<PasswordEntry, 'id' | 'createdAt'>>) => Promise<boolean>;
  remove: (id: string) => Promise<boolean>;
}

export const usePasswords = create<PasswordsState>((set) => ({
  entries: [],
  status: null,
  loaded: false,

  load: async () => {
    const res = await window.aether.passwords.status();
    if (res.ok && res.data) {
      const status = res.data as VaultStatus;
      if (status.unlocked) {
        const listRes = await window.aether.passwords.list();
        set({
          status,
          entries: listRes.ok && listRes.data ? (listRes.data as PasswordEntry[]) : [],
          loaded: true,
        });
      } else {
        set({ status, entries: [], loaded: true });
      }
    }
  },

  unlock: async (password) => {
    const res = await window.aether.passwords.unlock(password);
    if (!res.ok || !res.data) return false;
    const status = res.data as VaultStatus;
    const listRes = await window.aether.passwords.list();
    set({
      status,
      entries: listRes.ok && listRes.data ? (listRes.data as PasswordEntry[]) : [],
    });
    return true;
  },

  lock: async () => {
    await window.aether.passwords.lock();
    set({ entries: [], status: { unlocked: false, initialized: true } });
  },

  add: async (entry) => {
    const res = await window.aether.passwords.add(entry);
    if (!res.ok) return false;
    await refreshEntries(set);
    return true;
  },

  update: async (id, patch) => {
    const res = await window.aether.passwords.update(id, patch);
    if (!res.ok) return false;
    await refreshEntries(set);
    return true;
  },

  remove: async (id) => {
    const res = await window.aether.passwords.remove(id);
    if (!res.ok) return false;
    await refreshEntries(set);
    return true;
  },
}));

async function refreshEntries(
  set: (partial: Partial<PasswordsState>) => void,
): Promise<void> {
  const listRes = await window.aether.passwords.list();
  set({ entries: listRes.ok && listRes.data ? (listRes.data as PasswordEntry[]) : [] });
}