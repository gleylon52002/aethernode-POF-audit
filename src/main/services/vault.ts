import { SecureStore } from '@main/store/secure-store';
import {
  sealWithPassword,
  openWithPassword,
  randomId,
  type SealedPayload,
} from '@main/services/crypto';
import type { PasswordEntry, VaultStatus } from '@shared/types/passwords';

// Vault — şifre kasa servisi (Aşama 6).
//
// Katmanlı koruma:
//   1. SecureStore dosyayı cihaz anahtarıyla (AETHER_KEY) AES ile şifreler.
//   2. Entry listesi JSON'a serileştirilip master-password ile ayrıca
//      AES-256-GCM (PBKDF2 anahtar türetimi) mühürlenir.
//
// Master-password oturum boyunca main belleğinde tutulur; diske asla yazılmaz.
// unlock, mevcut kasa yoksa boş bir kasa mühürler, varsa openWithPassword ile
// parolayı doğrular (yanlış parola auth-tag hatası fırlatır). lock parolayı
// bellekten siler; sonraki tüm erişim "kasa kilitli" hatası döner.
//
// Güvenli notlar (notes-service) aynı master-password'u paylaşır — buradan
// getMasterPassword ile alır.

const KEY = process.env.AETHER_KEY ?? 'aethernode-device-key';

interface VaultRecord {
  entries: PasswordEntry[];
}

const store = new SecureStore<{ sealed: SealedPayload | null }>({
  name: 'password-vault',
  encryptionKey: KEY,
  defaults: { sealed: null },
});

let masterPassword: string | null = null;

export function isInitialized(): boolean {
  return store.get('sealed') !== null;
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

export function unlock(password: string): VaultStatus {
  const sealed = store.get('sealed');
  if (sealed === null) {
    // İlk kurulum: boş kasa bu parolayla mühürlenir.
    store.set('sealed', sealWithPassword(JSON.stringify({ entries: [] }), password));
  } else {
    // Mevcut kasa — parola doğrulanır (hatalıysa fırlatır).
    openWithPassword(sealed, password);
  }
  masterPassword = password;
  return status();
}

export function lock(): VaultStatus {
  masterPassword = null;
  return status();
}

function read(): VaultRecord {
  if (!masterPassword) throw new Error('Kasa kilitli');
  const sealed = store.get('sealed');
  if (sealed === null) return { entries: [] };
  return JSON.parse(openWithPassword(sealed, masterPassword)) as VaultRecord;
}

function write(rec: VaultRecord): void {
  if (!masterPassword) throw new Error('Kasa kilitli');
  store.set('sealed', sealWithPassword(JSON.stringify(rec), masterPassword));
}

export function listEntries(): PasswordEntry[] {
  return read().entries;
}

export type EntryInput = Omit<PasswordEntry, 'id' | 'createdAt' | 'updatedAt'>;

export function addEntry(input: EntryInput): PasswordEntry {
  const rec = read();
  const now = Date.now();
  const entry: PasswordEntry = { ...input, id: randomId(), createdAt: now, updatedAt: now };
  rec.entries.push(entry);
  write(rec);
  return entry;
}

export type EntryPatch = Partial<Omit<PasswordEntry, 'id' | 'createdAt'>>;

export function updateEntry(id: string, patch: EntryPatch): PasswordEntry {
  const rec = read();
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
  write(rec);
  return entry;
}

export function removeEntry(id: string): void {
  const rec = read();
  rec.entries = rec.entries.filter((e) => e.id !== id);
  write(rec);
}