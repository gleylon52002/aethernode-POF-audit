import { z } from 'zod';
import { defineHandler, noPayload } from '@main/ipc/router';
import { IPC } from '@shared/constants';
import type { SecureNote } from '@shared/types/notes';
import {
  listNotes,
  addNote,
  updateNote,
  removeNote,
  type NoteInput,
  type NotePatch,
} from '@main/services/notes-service';

// Güvenli notlar handler'ları — Aşama 6.
//
// Vault kilitliyken tüm operasyonlar "kasa kilitli" hatası döner (router
// try/catch içinde Result<Err> yazar). Bu sayede renderer kasa durumunu
// ayrıca kontrol etmeden not sayfasını kullanabilir; hata mesajı yeterli.

export function registerNotesHandlers(): void {
  defineHandler({
    channel: IPC.notes.list,
    schema: noPayload,
    handle: (): SecureNote[] => listNotes(),
  });

  defineHandler({
    channel: IPC.notes.add,
    schema: z.object({ title: z.string().min(1), body: z.string() }),
    handle: ({ title, body }): SecureNote => addNote({ title, body } as NoteInput),
  });

  defineHandler({
    channel: IPC.notes.update,
    schema: z.object({
      id: z.string().min(1),
      title: z.string().min(1).optional(),
      body: z.string().optional(),
    }),
    handle: ({ id, title, body }): SecureNote => {
      const patch: NotePatch = {};
      if (title !== undefined) patch.title = title;
      if (body !== undefined) patch.body = body;
      return updateNote(id, patch);
    },
  });

  defineHandler({
    channel: IPC.notes.remove,
    schema: z.object({ id: z.string().min(1) }),
    handle: ({ id }): boolean => {
      removeNote(id);
      return true;
    },
  });
}