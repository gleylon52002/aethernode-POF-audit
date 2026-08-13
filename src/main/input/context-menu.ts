import { Menu, clipboard, type WebContents, type ContextMenuParams } from 'electron';
import { getMainWindow } from '@main/windows';

// Webview sağ tık menüsü — gezinme, kopyala, çevir, yeni sekmede aç.
export function attachWebviewContextMenu(contents: WebContents): void {
  contents.on('context-menu', (_e, params: ContextMenuParams) => {
    const win = getMainWindow();
    const template: Electron.MenuItemConstructorOptions[] = [];

    const canBack = typeof contents.canGoBack === 'function' ? contents.canGoBack() : false;
    const canForward = typeof contents.canGoForward === 'function' ? contents.canGoForward() : false;

    template.push({
      label: 'Geri',
      enabled: canBack,
      click: () => contents.goBack(),
    });
    template.push({
      label: 'İleri',
      enabled: canForward,
      click: () => contents.goForward(),
    });
    template.push({
      label: 'Yenile',
      click: () => contents.reload(),
    });
    template.push({ type: 'separator' });

    if (params.linkURL) {
      template.push({
        label: 'Bağlantıyı yeni sekmede aç',
        click: () => {
          win?.webContents.send('aethernode/guest/openUrl', params.linkURL);
        },
      });
      template.push({
        label: 'Bağlantı adresini kopyala',
        click: () => clipboard.writeText(params.linkURL),
      });
      template.push({ type: 'separator' });
    }

    if (params.mediaType === 'image') {
      template.push({
        label: 'Resmi yeni sekmede aç',
        click: () => win?.webContents.send('aethernode/guest/openUrl', params.srcURL),
      });
      template.push({
        label: 'Resmi farklı kaydet...',
        click: () => contents.downloadURL(params.srcURL),
      });
      template.push({
        label: 'Resim adresini kopyala',
        click: () => clipboard.writeText(params.srcURL),
      });
      template.push({ type: 'separator' });
    } else if (params.mediaType === 'video' || params.mediaType === 'audio') {
      template.push({
        label: 'Medyayı yeni sekmede aç',
        click: () => win?.webContents.send('aethernode/guest/openUrl', params.srcURL),
      });
      template.push({
        label: 'Medyayı farklı kaydet...',
        click: () => contents.downloadURL(params.srcURL),
      });
      template.push({
        label: 'Medya adresini kopyala',
        click: () => clipboard.writeText(params.srcURL),
      });
      template.push({ type: 'separator' });
    }

    if (params.selectionText?.trim()) {
      const text = params.selectionText.trim();
      template.push({ label: 'Kopyala', role: 'copy' });
      template.push({
        label: `"${text.slice(0, 28)}${text.length > 28 ? '…' : ''}" için ara`,
        click: () => {
          const q = `https://duckduckgo.com/?q=${encodeURIComponent(text)}`;
          win?.webContents.send('aethernode/guest/openUrl', q);
        },
      });
      template.push({
        label: 'Seçimi çevir (TR)',
        click: () => {
          const q = `https://translate.google.com/?sl=auto&tl=tr&text=${encodeURIComponent(text)}`;
          win?.webContents.send('aethernode/guest/openUrl', q);
        },
      });
      template.push({ type: 'separator' });
    }

    if (params.isEditable) {
      template.push({ label: 'Kes', role: 'cut' });
      template.push({ label: 'Kopyala', role: 'copy' });
      template.push({ label: 'Yapıştır', role: 'paste' });
      template.push({ label: 'Tümünü seç', role: 'selectAll' });
      template.push({ type: 'separator' });
    }

    const pageUrl = params.pageURL || contents.getURL();
    if (pageUrl && /^https?:\/\//i.test(pageUrl)) {
      template.push({
        label: 'Sayfayı çevir (TR)',
        click: () => {
          const q = `https://translate.google.com/translate?sl=auto&tl=tr&u=${encodeURIComponent(pageUrl)}`;
          win?.webContents.send('aethernode/guest/openUrl', q);
        },
      });
      template.push({
        label: 'Sayfa adresini kopyala',
        click: () => clipboard.writeText(pageUrl),
      });
      template.push({ type: 'separator' });
    }

    template.push({
      label: 'Sessiz Mod (Deep Focus)',
      click: () => {
        win?.webContents.send('aethernode/guest/contextDeepFocus');
      },
    });

    template.push({ type: 'separator' });

    template.push({
      label: 'İncele',
      click: () => {
        contents.inspectElement(params.x, params.y);
        if (!contents.isDevToolsOpened()) contents.openDevTools({ mode: 'detach' });
      },
    });

    Menu.buildFromTemplate(template).popup({ window: win ?? undefined });
  });
}
