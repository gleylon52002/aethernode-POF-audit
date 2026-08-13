import { registerIpcHandlers } from './router';
import { registerAppHandlers } from './app-handlers';
import { registerWindowHandlers } from './window-handlers';
import { registerTabHandlers } from './tab-handlers';
import { registerSettingsHandlers } from './settings-handlers';
import { registerNetworkHandlers } from './network-handlers';
import { registerPasswordHandlers } from './password-handlers';
import { registerNotesHandlers } from './notes-handlers';
import { registerPrivacyHandlers } from './privacy-handlers';
import { registerSecurityHandlers } from './security-handlers';
import { registerHistoryHandlers } from './history-handlers';
import { registerDownloadHandlers } from './download-handlers';
import { registerMediaHandlers } from './media-handlers';
import { registerBackupHandlers } from './backup-handlers';
import { registerGuestHandlers } from './guest-handlers';
import { registerAutofillHandlers } from './autofill-handlers';
import { registerRelayHandlers } from './relay-handlers';
import { registerPwaHandlers } from './pwa-handlers';
import { registerPerformanceHandlers } from './performance-handlers';

export { registerIpcHandlers };

export function registerAllHandlers(): void {
  registerAppHandlers();
  registerWindowHandlers();
  registerTabHandlers();
  registerSettingsHandlers();
  registerNetworkHandlers();
  registerPasswordHandlers();
  registerNotesHandlers();
  registerPrivacyHandlers();
  registerSecurityHandlers();
  registerHistoryHandlers();
  registerDownloadHandlers();
  registerMediaHandlers();
  registerBackupHandlers();
  registerGuestHandlers();
  registerAutofillHandlers();
  registerRelayHandlers();
  registerPwaHandlers();
  registerPerformanceHandlers();
  registerIpcHandlers();
}
