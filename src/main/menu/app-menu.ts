import { BrowserWindow, Menu, shell } from 'electron';
import { is } from '@main/utils/env';
import { APP } from '@shared/constants/app';

// Uygulama menüsü. Klavye hızlandırıcıları standart masaüstü uygulama
// gelenekleriyle uyumludur. Menü, renderer'a IPC göndermeden doğrudan
// pencere yönetimini çağırır; uzun vadeli işlemler (ayarlar) için
// ayrı IPC handler'ları kullanılabilir.
export function buildAppMenu(_win: BrowserWindow): Menu {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: APP.shortName,
      submenu: [
        is.mac ? { role: 'about', label: 'Hakkında' } : { type: 'separator' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide', label: 'Gizle' },
        { role: 'hideOthers', label: 'Diğerlerini Gizle' },
        { role: 'unhide', label: 'Göster' },
        { type: 'separator' },
        { role: 'quit', label: 'Çık', accelerator: 'CmdOrCtrl+Q' },
      ],
    },
    {
      label: 'Düzen',
      submenu: [
        { role: 'undo', label: 'Geri Al' },
        { role: 'redo', label: 'Yinele' },
        { type: 'separator' },
        { role: 'cut', label: 'Kes' },
        { role: 'copy', label: 'Kopyala' },
        { role: 'paste', label: 'Yapıştır' },
        { role: 'selectAll', label: 'Tümünü Seç' },
      ],
    },
    {
      label: 'Görünüm',
      submenu: [
        { role: 'reload', label: 'Yeniden Yükle' },
        { role: 'forceReload', label: 'Zorla Yeniden Yükle' },
        { role: 'toggleDevTools', label: 'Geliştirici Araçları' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Yakınlaştırmayı Sıfırla' },
        { role: 'zoomIn', label: 'Yakınlaştır' },
        { role: 'zoomOut', label: 'Uzaklaştır' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Tam Ekran' },
      ],
    },
    {
      label: 'Pencere',
      submenu: [
        { role: 'minimize', label: 'Küçült' },
        { role: 'zoom', label: 'Büyüt' },
        { type: 'separator' },
        { role: 'front', label: 'Öne Getir' },
        { role: 'close', label: 'Kapat', accelerator: 'CmdOrCtrl+W' },
      ],
    },
    {
      label: 'Yardım',
      submenu: [
        {
          label: 'AetherNode Web Sitesi',
          click: () => void shell.openExternal('https://aethernode.com'),
        },
        { type: 'separator' },
        { role: 'about', label: 'Hakkında' },
      ],
    },
  ];

  return Menu.buildFromTemplate(template);
}