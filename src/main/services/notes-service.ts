import { SecureStore } from '@main/store/secure-store';
import {
  sealWithPassword,
  openWithPassword,
  randomId,
  type SealedPayload,
} from '@main/services/crypto';
import { getMasterPassword } from '@main/services/vault';
import type { SecureNote } from '@shared/types/notes';

// Güvenli notlar servisi (Aşama 6).
//
// Notlar, şifre kasanın açılmasıyla elde edilen master-password ile mühürlenir.
// Kasa kilitliyken (getMasterPassword() null) hiçbir işlem yapılamaz. Vault
// açıldığında ilk not eklenince kasa mühürlenir; parola her seferinde aynı
// olduğundan tutarlıdır.

const KEY = process.env.AETHER_KEY ?? 'aethernode-device-key';

interface NotesRecord {
  notes: SecureNote[];
}

const store = new SecureStore<{ sealed: SealedPayload | null }>({
  name: 'secure-notes',
  encryptionKey: KEY,
  defaults: { sealed: null },
});

function requirePassword(): string {
  const pw = getMasterPassword();
  if (!pw) throw new Error('Kasa kilitli — önce şifre yöneticisini açın');
  return pw;
}

function read(): NotesRecord {
  const pw = requirePassword();
  const sealed = store.get('sealed');
  if (sealed === null) return { notes: [] };
  return JSON.parse(openWithPassword(sealed, pw)) as NotesRecord;
}

function write(rec: NotesRecord): void {
  const pw = requirePassword();
  store.set('sealed', sealWithPassword(JSON.stringify(rec), pw));
}

export function listNotes(): SecureNote[] {
  return read().notes;
}

export type NoteInput = Pick<SecureNote, 'title' | 'body'>;

export function addNote(input: NoteInput): SecureNote {
  const rec = read();
  const now = Date.now();
  const note: SecureNote = { ...input, id: randomId(), createdAt: now, updatedAt: now };
  rec.notes.push(note);
  write(rec);
  return note;
}

export type NotePatch = Partial<Pick<SecureNote, 'title' | 'body'>>;

export function updateNote(id: string, patch: NotePatch): SecureNote {
  const rec = read();
  const idx = rec.notes.findIndex((n) => n.id === id);
  if (idx < 0) throw new Error('Not bulunamadı');
  const note: SecureNote = {
    ...rec.notes[idx],
    ...patch,
    id,
    createdAt: rec.notes[idx].createdAt,
    updatedAt: Date.now(),
  };
  rec.notes[idx] = note;
  write(rec);
  return note;
}

export function removeNote(id: string): void {
  const rec = read();
  rec.notes = rec.notes.filter((n) => n.id !== id);
  write(rec);
}