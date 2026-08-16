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
    handle: async (): Promise<SecureNote[]> => listNotes(),
  });

  defineHandler({
    channel: IPC.notes.add,
    schema: z.object({
      title: z.string().min(1),
      body: z.string(),
      sourceUrl: z.string().optional(),
      sourceTitle: z.string().optional(),
      links: z.array(z.string()).optional(),
    }),
    handle: async (input): Promise<SecureNote> => addNote(input as NoteInput),
  });

  defineHandler({
    channel: IPC.notes.update,
    schema: z.object({
      id: z.string().min(1),
      title: z.string().min(1).optional(),
      body: z.string().optional(),
      pinned: z.boolean().optional(),
      color: z.enum(['default', 'purple', 'blue', 'emerald', 'amber', 'rose']).optional(),
      tags: z.array(z.string().max(24)).max(10).optional(),
      links: z.array(z.string()).optional(),
      sourceUrl: z.string().optional(),
      sourceTitle: z.string().optional(),
    }),
    handle: async ({ id, title, body, pinned, color, tags, links, sourceUrl, sourceTitle }): Promise<SecureNote> => {
      const patch: NotePatch = {};
      if (title !== undefined) patch.title = title;
      if (body !== undefined) patch.body = body;
      if (pinned !== undefined) patch.pinned = pinned;
      if (color !== undefined) patch.color = color as NotePatch['color'];
      if (tags !== undefined) patch.tags = tags;
      if (links !== undefined) patch.links = links;
      if (sourceUrl !== undefined) patch.sourceUrl = sourceUrl;
      if (sourceTitle !== undefined) patch.sourceTitle = sourceTitle;
      return updateNote(id, patch);
    },
  });

  defineHandler({
    channel: IPC.notes.remove,
    schema: z.object({ id: z.string().min(1) }),
    handle: async ({ id }): Promise<boolean> => {
      await removeNote(id);
      return true;
    },
  });
}