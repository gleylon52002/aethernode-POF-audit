import { defineHandler, noPayload } from '@main/ipc/router';
import { IPC } from '@shared/constants';
import { networkGuard } from '@main/network';
import { getMainWindow } from '@main/windows';

// Network handler'ları.
//
// Guard artık her zaman aktiftir (engelleme modu); inspector yalnızca
// captured akışını açar/kapar. Engellenen istekler her durumda
// IPC.network.blocked ile renderer'a itilir (durum çubuğu rozeti).
export function registerNetworkHandlers(): void {
  networkGuard.on('captured', (captured) => {
    getMainWindow()?.webContents.send(IPC.network.captured, captured);
  });

  networkGuard.on('blocked', (blocked) => {
    getMainWindow()?.webContents.send(IPC.network.blocked, blocked);
  });

  defineHandler({
    channel: IPC.network.enableInspector,
    schema: noPayload,
    handle: () => {
      networkGuard.setInspector(true);
      return true;
    },
  });

  defineHandler({
    channel: IPC.network.disableInspector,
    schema: noPayload,
    handle: () => {
      networkGuard.setInspector(false);
      return true;
    },
  });
}
