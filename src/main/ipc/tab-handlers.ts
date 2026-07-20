import { defineHandler, noPayload } from '@main/ipc/router';
import { IPC } from '@shared/constants';
import type { TabSnapshot } from '@shared/types/tabs';

// Sekme handler'ları — Aşama 4'teki tab yöneticisi tarafından doldurulacak.
// Aşama 1: kanal sözleşmesini kararlı tutmak için boş sağlıklı cevap.
export function registerTabHandlers(): void {
  defineHandler({
    channel: IPC.tabs.list,
    schema: noPayload,
    handle: (): TabSnapshot[] => [],
  });
}