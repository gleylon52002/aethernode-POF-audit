import { z } from 'zod';
import { defineHandler, noPayload } from '@main/ipc/router';
import { IPC } from '@shared/constants';
import type { PasswordEntry, VaultStatus } from '@shared/types/passwords';
import {
  unlock as vaultUnlock,
  lock as vaultLock,
  status as vaultStatus,
  isUnlocked,
  listEntries,
  addEntry,
  updateEntry,
  removeEntry,
  resetVaultIdleTimer,
  type EntryInput,
  type EntryPatch,
} from '@main/services/vault';

// Şifre yöneticisi handler'ları — Aşama 6.
//
// Tüm erişim vault üzerinden; kasa kilitliyken liste/CRUD "Kasa kilitli" hatası
// döner (router try/catch içinde Result<Err> yazar). unlock hatalı parolada
// openWithPassword'in auth-tag hatasını fırlatır → err Result.

const entrySchema = z.object({
  title: z.string().min(1),
  username: z.string(),
  password: z.string().min(1),
  url: z.string().optional(),
  notes: z.string().optional(),
});

const patchSchema = entrySchema.partial();

export function registerPasswordHandlers(): void {
  defineHandler({
    channel: IPC.passwords.status,
    schema: noPayload,
    handle: (): VaultStatus => vaultStatus(),
  });

  defineHandler({
    channel: IPC.passwords.isUnlocked,
    schema: noPayload,
    handle: (): boolean => isUnlocked(),
  });

  defineHandler({
    channel: IPC.passwords.unlock,
    schema: z.object({ password: z.string().min(1) }),
    handle: async ({ password }): Promise<VaultStatus> => vaultUnlock(password),
  });

  defineHandler({
    channel: IPC.passwords.lock,
    schema: noPayload,
    handle: (): VaultStatus => vaultLock(),
  });

  defineHandler({
    channel: IPC.passwords.list,
    schema: noPayload,
    handle: async (): Promise<PasswordEntry[]> => listEntries(),
  });

  defineHandler({
    channel: IPC.passwords.add,
    schema: z.object({ entry: entrySchema }),
    handle: async ({ entry }): Promise<PasswordEntry> => addEntry(entry as EntryInput),
  });

  defineHandler({
    channel: IPC.passwords.update,
    schema: z.object({ id: z.string().min(1), patch: patchSchema }),
    handle: async ({ id, patch }): Promise<PasswordEntry> => updateEntry(id, patch as EntryPatch),
  });

  defineHandler({
    channel: IPC.passwords.remove,
    schema: z.object({ id: z.string().min(1) }),
    handle: async ({ id }): Promise<boolean> => {
      await removeEntry(id);
      return true;
    },
  });

  defineHandler({
    channel: IPC.passwords.touchIdle,
    schema: noPayload,
    handle: (): boolean => {
      resetVaultIdleTimer();
      return true;
    },
  });
}