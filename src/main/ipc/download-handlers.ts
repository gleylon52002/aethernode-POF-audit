import { z } from 'zod';
import { defineHandler, noPayload } from '@main/ipc/router';
import { IPC } from '@shared/constants';
import {
  listDownloads,
  pauseDownload,
  resumeDownload,
  cancelDownload,
  openDownload,
  openDownloadFolder,
  removeDownloadRecord,
  clearCompletedDownloads,
} from '@main/services/download-manager';

export function registerDownloadHandlers(): void {
  defineHandler({
    channel: IPC.downloads.list,
    schema: noPayload,
    handle: () => listDownloads(),
  });

  defineHandler({
    channel: IPC.downloads.pause,
    schema: z.object({ id: z.string().min(1) }),
    handle: ({ id }) => pauseDownload(id),
  });

  defineHandler({
    channel: IPC.downloads.resume,
    schema: z.object({ id: z.string().min(1) }),
    handle: ({ id }) => resumeDownload(id),
  });

  defineHandler({
    channel: IPC.downloads.cancel,
    schema: z.object({ id: z.string().min(1) }),
    handle: ({ id }) => cancelDownload(id),
  });

  defineHandler({
    channel: IPC.downloads.open,
    schema: z.object({ id: z.string().min(1) }),
    handle: ({ id }) => openDownload(id),
  });

  defineHandler({
    channel: IPC.downloads.openFolder,
    schema: z.object({ id: z.string().optional() }).optional(),
    handle: (payload) => openDownloadFolder(payload?.id),
  });

  defineHandler({
    channel: IPC.downloads.remove,
    schema: z.object({ id: z.string().min(1) }),
    handle: ({ id }) => removeDownloadRecord(id),
  });

  defineHandler({
    channel: IPC.downloads.clearCompleted,
    schema: noPayload,
    handle: () => clearCompletedDownloads(),
  });
}
