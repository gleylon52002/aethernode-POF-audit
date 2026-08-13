import { SecureStore } from '@main/store/secure-store';
import {
  sealWithPasswordAsync,
  openWithPassword,
  openWithPasswordAsync,
  randomId,
  type SealedPayload,
} from '@main/services/crypto';
import { getDeviceEncryptionKey } from '@main/services/device-key';
import type { PasswordEntry, VaultStatus } from '@shared/types/passwords';

// Vault — şifre kasa servisi.
// Katman 1: cihaz anahtarı (safeStorage). Katman 2: master-password AES-GCM.

interface VaultRecord {
  entries: PasswordEntry[];
}

let storeRef: SecureStore<{ sealed: SealedPayload | null }> | null = null;

function store(): SecureStore<{ sealed: SealedPayload | null }> {
  if (!storeRef) {
    storeRef = new SecureStore<{ sealed: SealedPayload | null }>({
      name: 'password-vault',
      encryptionKey: getDeviceEncryptionKey(),
      defaults: { sealed: null },
    });
  }
  return storeRef;
}

let masterPassword: string | null = null;
let idleTimer: ReturnType<typeof setTimeout> | null = null;
let autoLockMinutes = 5;

function clearIdleTimer(): void {
  if (idleTimer) {
    clearTimeout(idleTimer);
    idleTimer = null;
  }
}

function scheduleIdleLock(): void {
  clearIdleTimer();
  if (autoLockMinutes <= 0 || masterPassword === null) return;
  idleTimer = setTimeout(() => {
    masterPassword = null;
    clearIdleTimer();
  }, autoLockMinutes * 60 * 1000);
  idleTimer.unref?.();
}

export function setVaultAutoLockMinutes(minutes: number): void {
  autoLockMinutes = Math.max(0, Math.floor(minutes));
  if (masterPassword !== null) scheduleIdleLock();
  else clearIdleTimer();
}

export function resetVaultIdleTimer(): void {
  if (masterPassword !== null) scheduleIdleLock();
}

export function isInitialized(): boolean {
  return store().get('sealed') !== null;
}

export function isUnlocked(): boolean {
  return masterPassword !== null;
}

export function status(): VaultStatus {
  return { unlocked: isUnlocked(), initialized: isInitialized() };
}

export function getMasterPassword(): string | null {
  return masterPassword;
}

export async function unlock(password: string): Promise<VaultStatus> {
  const sealed = store().get('sealed');
  if (sealed === null) {
    store().set('sealed', await sealWithPasswordAsync(JSON.stringify({ entries: [] }), password));
  } else {
    await openWithPasswordAsync(sealed, password);
  }
  masterPassword = password;
  scheduleIdleLock();
  return status();
}

export function lock(): VaultStatus {
  masterPassword = null;
  clearIdleTimer();
  return status();
}

async function read(): Promise<VaultRecord> {
  if (!masterPassword) throw new Error('Kasa kilitli');
  const sealed = store().get('sealed');
  if (sealed === null) return { entries: [] };
  // v1 legacy sync payload'ları da desteklenir — async açar, gerekirse sync fallback
  try {
    return JSON.parse(await openWithPasswordAsync(sealed, masterPassword)) as VaultRecord;
  } catch {
    return JSON.parse(openWithPassword(sealed, masterPassword)) as VaultRecord;
  }
}

async function write(rec: VaultRecord): Promise<void> {
  if (!masterPassword) throw new Error('Kasa kilitli');
  store().set('sealed', await sealWithPasswordAsync(JSON.stringify(rec), masterPassword));
}

export async function listEntries(): Promise<PasswordEntry[]> {
  return (await read()).entries;
}

export type EntryInput = Omit<PasswordEntry, 'id' | 'createdAt' | 'updatedAt'>;

export async function addEntry(input: EntryInput): Promise<PasswordEntry> {
  const rec = await read();
  const now = Date.now();
  const entry: PasswordEntry = { ...input, id: randomId(), createdAt: now, updatedAt: now };
  rec.entries.push(entry);
  await write(rec);
  return entry;
}

export type EntryPatch = Partial<Omit<PasswordEntry, 'id' | 'createdAt'>>;

export async function updateEntry(id: string, patch: EntryPatch): Promise<PasswordEntry> {
  const rec = await read();
  const idx = rec.entries.findIndex((e) => e.id === id);
  if (idx < 0) throw new Error('Kayıt bulunamadı');
  const entry: PasswordEntry = {
    ...rec.entries[idx],
    ...patch,
    id,
    createdAt: rec.entries[idx].createdAt,
    updatedAt: Date.now(),
  };
  rec.entries[idx] = entry;
  await write(rec);
  return entry;
}

export async function removeEntry(id: string): Promise<void> {
  const rec = await read();
  rec.entries = rec.entries.filter((e) => e.id !== id);
  await write(rec);
}

/** Yedekleme: kasa blob'u zaten master-password ile mühürlü — olduğu gibi dışa verilir. */
export function exportSealedVault(): SealedPayload | null {
  return store().get('sealed');
}

/** Yedekten geri yükleme: kasa kilitlenir, kullanıcı master şifresiyle tekrar açar. */
export function importSealedVault(payload: SealedPayload | null): void {
  store().set('sealed', payload);
  masterPassword = null;
}
