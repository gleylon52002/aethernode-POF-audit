import type { Input, WebContents } from 'electron';
import { app } from 'electron';
import { IPC } from '@shared/constants';
import { getMainWindow } from '@main/windows';

// Klavye kısayolu yakalayıcı.
//
// Kısayollar main tarafında before-input-event ile yakalanır; böylece odak
// ister uygulama kabuğunda (React) ister bir sekmenin <webview> içeriğinde
// olsun aynı şekilde çalışır. Eşleşen kombinasyon preventDefault edilir ve
// aksiyon adı renderer'a itilir — sekme/adres çubuğu durumu renderer'da
// yaşadığı için asıl işlem orada yapılır.

export type ShortcutAction =
  | 'newTab'
  | 'closeTab'
  | 'closeWindow'
  | 'reopenTab'
  | 'incognitoTab'
  | 'nextTab'
  | 'prevTab'
  | 'tabIndex' // arg: 1-8
  | 'lastTab'
  | 'focusAddress'
  | 'reload'
  | 'hardReload'
  | 'stop'
  | 'zoomIn'
  | 'zoomOut'
  | 'zoomReset'
  | 'openHistory'
  | 'openDownloads'
  | 'openBookmarks'
  | 'bookmarkPage'
  | 'devtools'
  | 'fullscreen'
  | 'panic'
  | 'camouflage'
  | 'findInPage'
  | 'print'
  | 'screenshot'
  | 'viewSource'
  | 'savePage'
  | 'readerMode'
  | 'splitView'
  | 'muteTab'
  | 'tabSearch'
  | 'tabLayoutToggle' // Ctrl+Shift+V — yatay/dikey sekme çubuğu
  | 'tabGroup' // Ctrl+Shift+G — hızlı gruplama menüsü
  | 'autofillFill' // Ctrl+Shift+F — aktif formu doldur
  | 'tempLink' // Ctrl+Shift+K — geçici bağlantı oluştur
  | 'commandPalette' // Ctrl+K
  | 'translatePage'
  | 'shieldPanel'
  | 'toggleBookmarksBar';

export interface ShortcutEvent {
  action: ShortcutAction;
  arg?: number;
}

function match(input: Input): ShortcutEvent | null {
  if (input.type !== 'keyDown') return null;
  const mod = input.control || input.meta;
  const shift = input.shift;
  const alt = input.alt;
  const key = input.key.length === 1 ? input.key.toLowerCase() : input.key;

  // Fonksiyon tuşları (modifier'sız)
  if (key === 'F5') return { action: mod ? 'hardReload' : 'reload' };
  if (key === 'F6') return { action: 'focusAddress' };
  if (key === 'F11') return { action: 'fullscreen' };
  if (key === 'F12') {
    if (!app.isPackaged) return { action: 'devtools' };
    return null;
  }
  if (key === 'Escape' && !mod && !shift && !alt) return { action: 'stop' };
  if (key === 'Escape' && shift && !mod && !alt) return { action: 'camouflage' };

  if (alt && !mod && key === 'd') return { action: 'focusAddress' };
  if (!mod) return null;

  if (key === 'Tab') return { action: shift ? 'prevTab' : 'nextTab' };

  if (shift) {
    switch (key) {
      case 't':
        return { action: 'reopenTab' };
      case 'w':
        return { action: 'closeWindow' };
      case 'n':
        return { action: 'incognitoTab' };
      case 'o':
        return { action: 'openBookmarks' };
      case 'b':
        return { action: 'toggleBookmarksBar' };
      case 'r':
        return { action: 'hardReload' };
      case 'i':
        // Prod'da DevTools kapalı
        return app.isPackaged ? null : { action: 'devtools' };
      case 'x':
        return { action: 'panic' };
      case 'p':
        return { action: 'screenshot' };
      case '\\':
        return { action: 'splitView' };
      case 'l':
        return { action: 'splitView' };
      case 'm':
        return { action: 'muteTab' };
      case 'a':
        return { action: 'tabSearch' };
      case 'v':
        return { action: 'tabLayoutToggle' };
      case 'g':
        return { action: 'tabGroup' };
      case 'f':
        return { action: 'autofillFill' };
      case 'k':
        return { action: 'tempLink' };
      case 's':
        return { action: 'shieldPanel' };
      case 'y':
        return { action: 'translatePage' };
      case '+':
        return { action: 'zoomIn' };
      default:
        return null;
    }
  }

  switch (key) {
    case 't':
      return { action: 'newTab' };
    case 'w':
      return { action: 'closeTab' };
    case 'l':
      return { action: 'focusAddress' };
    case 'r':
      return { action: 'reload' };
    case 'h':
      return { action: 'openHistory' };
    case 'j':
      return { action: 'openDownloads' };
    case 'd':
      return { action: 'bookmarkPage' };
    case 'f':
      return { action: 'findInPage' };
    case 'p':
      return { action: 'print' };
    case 's':
      return { action: 'savePage' };
    case 'u':
      return { action: 'viewSource' };
    case 'k':
      return { action: 'commandPalette' };
    case '+':
    case '=':
      return { action: 'zoomIn' };
    case '-':
      return { action: 'zoomOut' };
    case '0':
      return { action: 'zoomReset' };
    case '9':
      return { action: 'lastTab' };
    default: {
      const digit = Number(key);
      if (digit >= 1 && digit <= 8) return { action: 'tabIndex', arg: digit };
      return null;
    }
  }
}

// Bir webContents'e (kabuk penceresi veya sekme webview'ı) kısayol
// yakalayıcıyı bağlar. Escape hariç eşleşen tüm kombinasyonlar sayfaya
// gitmeden tüketilir.
export function attachShortcuts(contents: WebContents): void {
  contents.on('before-input-event', (event, input) => {
    const hit = match(input);
    if (!hit) return;
    // Escape sayfa içi kullanım (modal kapatma vb.) için serbest bırakılır;
    // yükleme durdurmayı renderer yalnızca sekme yüklenirken uygular.
    if (hit.action !== 'stop') event.preventDefault();
    getMainWindow()?.webContents.send(IPC.shortcuts.event, hit);
  });
}
