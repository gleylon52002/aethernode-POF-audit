import { app, BrowserWindow, ipcMain, type WebContents } from 'electron';
import { join } from 'node:path';
import { defineHandler, noPayload } from '@main/ipc/router';
import { IPC } from '@shared/constants';
import { settingsRepo } from '@main/store';
import { BANK_DOMAINS } from '@shared/utils/bank-mode';
import { USER_AGENTS } from '@shared/constants/app';
import { networkGuard } from '@main/network';
import { attachCookieGuardPartition } from '@main/security/cookie-guard';
import { attachSecurityDefaultsPartition } from '@main/security/session-defaults';
import { attachDownloadPartition } from '@main/services/download-manager';
import { z } from 'zod';

/** Webview guest → ana pencere renderer (ipcRenderer.send main'e düşer). */
function hostWindowFromGuest(sender: WebContents): BrowserWindow | null {
  const direct = BrowserWindow.fromWebContents(sender);
  if (direct) return direct;
  const host = sender.hostWebContents;
  if (host) {
    const win = BrowserWindow.fromWebContents(host);
    if (win) return win;
  }
  return BrowserWindow.getAllWindows()[0] ?? null;
}

function forwardGuestToRenderer(sender: WebContents, channel: string, payload?: unknown): void {
  const win = hostWindowFromGuest(sender);
  if (!win || win.isDestroyed()) return;
  if (payload === undefined) win.webContents.send(channel);
  else win.webContents.send(channel, payload);
}

function isHttpUrl(url: unknown): url is string {
  return typeof url === 'string' && /^https?:\/\//i.test(url);
}

// Guest webview köprüsü — senkron config + preload yolu + partition bağlama.
export function registerGuestHandlers(): void {
  // Guest preload ipcRenderer.send → renderer (Ctrl+tık, jestler, vb.)
  ipcMain.on('aethernode/guest/openBackground', (event, url: unknown) => {
    if (!isHttpUrl(url)) return;
    forwardGuestToRenderer(event.sender, 'aethernode/guest/openBackground', url);
  });
  ipcMain.on('aethernode/guest/openUrl', (event, url: unknown) => {
    if (!isHttpUrl(url)) return;
    forwardGuestToRenderer(event.sender, 'aethernode/guest/openUrl', url);
  });
  ipcMain.on('aethernode/guest/gestureClose', (event) => {
    forwardGuestToRenderer(event.sender, 'aethernode/guest/gestureClose');
  });

  ipcMain.on(IPC.guest.config, (event) => {
    const s = settingsRepo.get();
    const fp = s.privacy.fingerprint;
    const uaId = s.general.userAgent;
    event.returnValue = {
      fingerprint: {
        enabled: fp.enabled,
        mode: fp.mode ?? 'uniformity',
        spoofCanvas: fp.spoofCanvas,
        spoofWebGL: fp.spoofWebGL,
        spoofAudio: fp.spoofAudio,
        spoofFonts: fp.spoofFonts,
        spoofNavigator: fp.spoofNavigator,
        spoofTimezone: fp.spoofTimezone,
        spoofLanguage: fp.spoofLanguage,
        spoofPlugins: fp.spoofPlugins,
        spoofHardware: fp.spoofHardware,
        spoofScreen: fp.spoofScreen,
        spoofUserAgent: fp.spoofUserAgent,
        randomProfilePerSession: fp.randomProfilePerSession,
        userAgentString: USER_AGENTS[uaId] || '',
      },
      cookieBannerAutoReject: s.privacy.cookieBanner.autoReject,
      scriptBlocker: !!s.privacy.scriptBlocker?.enabled,
      bankMode: s.privacy.bankMode?.enabled !== false,
      bankDomains: [...BANK_DOMAINS],
      webrtcBlock: s.privacy.webrtc.enabled,
      webrtcPolicy: s.privacy.webrtc.policy,
      webrtcAllowedHosts: [...(s.privacy.webrtc.allowedHosts ?? [])],
      forceDarkMode: !!s.general.forceDarkMode,
      mouseGestures: s.general.mouseGestures !== false,
      selectionTranslate: s.general.selectionTranslate !== false,
      translateTarget: s.general.translateTarget || 'tr',
    };
  });

  // Async path for invoke (new guest.ts) — same payload, Result-wrapped via router
  defineHandler({
    channel: IPC.guest.config,
    schema: noPayload,
    handle: () => {
      const s = settingsRepo.get();
      const fp = s.privacy.fingerprint;
      const uaId = s.general.userAgent;
      return {
        fingerprint: {
          enabled: fp.enabled,
          mode: fp.mode ?? 'uniformity',
          spoofCanvas: fp.spoofCanvas,
          spoofWebGL: fp.spoofWebGL,
          spoofAudio: fp.spoofAudio,
          spoofFonts: fp.spoofFonts,
          spoofNavigator: fp.spoofNavigator,
          spoofTimezone: fp.spoofTimezone,
          spoofLanguage: fp.spoofLanguage,
          spoofPlugins: fp.spoofPlugins,
          spoofHardware: fp.spoofHardware,
          spoofScreen: fp.spoofScreen,
          spoofUserAgent: fp.spoofUserAgent,
          randomProfilePerSession: fp.randomProfilePerSession,
          userAgentString: USER_AGENTS[uaId] || '',
        },
        cookieBannerAutoReject: s.privacy.cookieBanner.autoReject,
        scriptBlocker: !!s.privacy.scriptBlocker?.enabled,
        bankMode: s.privacy.bankMode?.enabled !== false,
        bankDomains: [...BANK_DOMAINS],
        webrtcBlock: s.privacy.webrtc.enabled,
        webrtcPolicy: s.privacy.webrtc.policy,
        webrtcAllowedHosts: [...(s.privacy.webrtc.allowedHosts ?? [])],
        forceDarkMode: !!s.general.forceDarkMode,
        mouseGestures: s.general.mouseGestures !== false,
        selectionTranslate: s.general.selectionTranslate !== false,
        translateTarget: s.general.translateTarget || 'tr',
      };
    },
  });

  defineHandler({
    channel: IPC.guest.preloadPath,
    schema: noPayload,
    handle: () => {
      const path = join(app.getAppPath(), 'dist-electron', 'preload', 'guest.js');
      return `file://${path.replace(/\\/g, '/')}`;
    },
  });

  defineHandler({
    channel: IPC.guest.attachPartition,
    schema: z.object({ partition: z.string().min(1) }),
    handle: ({ partition }) => {
      networkGuard.attachPartition(partition);
      attachCookieGuardPartition(partition);
      attachSecurityDefaultsPartition(partition);
      attachDownloadPartition(partition);
      return true;
    },
  });
}
