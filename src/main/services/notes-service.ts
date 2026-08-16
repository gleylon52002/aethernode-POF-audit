import { SecureStore } from '@main/store/secure-store';
import {
  sealWithPasswordAsync,
  openWithPasswordAsync,
  openWithPassword,
  randomId,
  type SealedPayload,
} from '@main/services/crypto';
import { getMasterPassword } from '@main/services/vault';
import { getDeviceEncryptionKey } from '@main/services/device-key';
import type { SecureNote } from '@shared/types/notes';

interface NotesRecord {
  notes: SecureNote[];
}

let storeRef: SecureStore<{ sealed: SealedPayload | null }> | null = null;

function store(): SecureStore<{ sealed: SealedPayload | null }> {
  if (!storeRef) {
    storeRef = new SecureStore<{ sealed: SealedPayload | null }>({
      name: 'secure-notes',
      encryptionKey: getDeviceEncryptionKey(),
      defaults: { sealed: null },
    });
  }
  return storeRef;
}

function requirePassword(): string {
  const pw = getMasterPassword();
  if (!pw) throw new Error('Kasa kilitli — önce şifre yöneticisini açın');
  return pw;
}

async function read(): Promise<NotesRecord> {
  const pw = requirePassword();
  const sealed = store().get('sealed');
  if (sealed === null) return { notes: [] };
  try {
    return JSON.parse(await openWithPasswordAsync(sealed, pw)) as NotesRecord;
  } catch {
    return JSON.parse(openWithPassword(sealed, pw)) as NotesRecord;
  }
}

async function write(rec: NotesRecord): Promise<void> {
  const pw = requirePassword();
  store().set('sealed', await sealWithPasswordAsync(JSON.stringify(rec), pw));
}

export async function listNotes(): Promise<SecureNote[]> {
  return (await read()).notes;
}

export type NoteInput = Partial<SecureNote> & Pick<SecureNote, 'title' | 'body'>;

export async function addNote(input: NoteInput): Promise<SecureNote> {
  const rec = await read();
  const now = Date.now();
  const note: SecureNote = {
    id: randomId(),
    createdAt: now,
    updatedAt: now,
    pinned: false,
    color: 'default',
    tags: [],
    links: [],
    ...input,
  };
  rec.notes.push(note);
  await write(rec);
  return note;
}

export type NotePatch = Partial<Pick<SecureNote, 'title' | 'body' | 'pinned' | 'color' | 'tags' | 'links' | 'sourceUrl' | 'sourceTitle'>>;

export async function updateNote(id: string, patch: NotePatch): Promise<SecureNote> {
  const rec = await read();
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
  await write(rec);
  return note;
}

export async function removeNote(id: string): Promise<void> {
  const rec = await read();
  rec.notes = rec.notes.filter((n) => n.id !== id);
  await write(rec);
}

/** Yedekleme: notlar master-password ile mühürlü blob olarak dışa verilir. */
export function exportSealedNotes(): SealedPayload | null {
  return store().get('sealed');
}

export function importSealedNotes(payload: SealedPayload | null): void {
  store().set('sealed', payload);
}
