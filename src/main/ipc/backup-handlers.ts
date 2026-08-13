import { dialog } from 'electron';
import { readFileSync, writeFileSync } from 'node:fs';
import { z } from 'zod';
import { defineHandler } from '@main/ipc/router';
import { IPC } from '@shared/constants';
import { settingsRepo } from '@main/store';
import { historyRepo } from '@main/store/history-store';
import { exportSealedVault, importSealedVault } from '@main/services/vault';
import { exportSealedNotes, importSealedNotes } from '@main/services/notes-service';
import { sealWithPasswordAsync, openWithPasswordAsync, openWithPassword, type SealedPayload } from '@main/services/crypto';
import { appSettingsSchema } from '@shared/schemas/settings';
import { getMainWindow } from '@main/windows';
import { logger } from '@main/utils/logger';
import type { HistoryEntry } from '@shared/types/history';

// Şifreli yedekleme / geri yükleme.
//
// Yedek dosyası (.anb): dıştaki zarf düz JSON, içerik AES-256-GCM +
// PBKDF2-SHA512 ile kullanıcının seçtiği parolayla mühürlenir. Parola
// olmadan dosya içeriği okunamaz; yanlış parola GCM auth tag doğrulamasında
// patlar (sessiz bozulma imkânsız). Şifre kasası ve notlar zaten master
// parola ile mühürlü blob'lardır — yedekte İKİNCİ bir katman daha kazanır.

const FILE_KIND = 'aethernode-backup';

const sealedSchema = z.object({
  v: z.union([z.literal(1), z.literal(2)]),
  alg: z.literal('aes-256-gcm'),
  kdf: z.union([z.literal('pbkdf2-sha512'), z.literal('argon2id')]),
  iter: z.number().int().positive().optional(),
  salt: z.string(),
  iv: z.string(),
  ct: z.string(),
  mCost: z.number().int().optional(),
  tCost: z.number().int().optional(),
  p: z.number().int().optional(),
});

const bundleSchema = z.object({
  v: z.literal(1),
  createdAt: z.number(),
  settings: z.unknown().optional(),
  history: z.array(z.unknown()).optional(),
  vaultSealed: sealedSchema.nullable().optional(),
  notesSealed: sealedSchema.nullable().optional(),
  bookmarks: z.array(z.unknown()).optional(),
});

export interface BackupResult {
  path: string;
  items: string[];
}

export interface RestoreResult {
  items: string[];
  bookmarks: unknown[] | null;
}

function stamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

export function registerBackupHandlers(): void {
  defineHandler({
    channel: IPC.backup.export,
    schema: z.object({
      password: z.string().min(6, 'Parola en az 6 karakter olmalı'),
      bookmarks: z.array(z.unknown()).optional(),
    }),
    handle: async ({ password, bookmarks }): Promise<BackupResult | null> => {
      const win = getMainWindow();
      const res = win
        ? await dialog.showSaveDialog(win, {
            title: 'Şifreli yedek kaydet',
            defaultPath: `aethernode-yedek-${stamp()}.anb`,
            filters: [{ name: 'AetherNode Yedek', extensions: ['anb'] }],
          })
        : await dialog.showSaveDialog({
            title: 'Şifreli yedek kaydet',
            defaultPath: `aethernode-yedek-${stamp()}.anb`,
            filters: [{ name: 'AetherNode Yedek', extensions: ['anb'] }],
          });
      if (res.canceled || !res.filePath) return null;

      const items: string[] = ['Ayarlar', 'Geçmiş'];
      const vaultSealed = exportSealedVault();
      const notesSealed = exportSealedNotes();
      if (vaultSealed) items.push('Şifre kasası');
      if (notesSealed) items.push('Güvenli notlar');
      if (bookmarks && bookmarks.length > 0) items.push(`Yer imleri (${bookmarks.length})`);

      const bundle = {
        v: 1 as const,
        createdAt: Date.now(),
        settings: settingsRepo.get(),
        history: historyRepo.exportAll(),
        vaultSealed,
        notesSealed,
        bookmarks: bookmarks ?? [],
      };

      const sealed = await sealWithPasswordAsync(JSON.stringify(bundle), password);
      const envelope = { format: FILE_KIND, v: 1, createdAt: bundle.createdAt, sealed };
      writeFileSync(res.filePath, JSON.stringify(envelope), 'utf8');
      logger.info('Şifreli yedek oluşturuldu', { path: res.filePath, items });
      return { path: res.filePath, items };
    },
  });

  defineHandler({
    channel: IPC.backup.import,
    schema: z.object({
      password: z.string().min(1),
    }),
    handle: async ({ password }): Promise<RestoreResult | null> => {
      const win = getMainWindow();
      const opts: Electron.OpenDialogOptions = {
        title: 'Yedekten geri yükle',
        filters: [{ name: 'AetherNode Yedek', extensions: ['anb'] }],
        properties: ['openFile'],
      };
      const res = win ? await dialog.showOpenDialog(win, opts) : await dialog.showOpenDialog(opts);
      const file = res.filePaths[0];
      if (res.canceled || !file) return null;

      const raw = JSON.parse(readFileSync(file, 'utf8')) as {
        format?: string;
        sealed?: SealedPayload;
      };
      if (raw.format !== FILE_KIND || !raw.sealed) {
        throw new Error('Bu dosya bir AetherNode yedeği değil');
      }

      let plain: string;
      try {
        try {
          plain = await openWithPasswordAsync(raw.sealed, password);
        } catch {
          plain = openWithPassword(raw.sealed, password);
        }
      } catch {
        throw new Error('Parola yanlış veya dosya bozulmuş');
      }

      const parsed = bundleSchema.safeParse(JSON.parse(plain));
      if (!parsed.success) {
        throw new Error('Yedek içeriği geçersiz veya uyumsuz sürüm');
      }
      const bundle = parsed.data;
      const items: string[] = [];

      if (bundle.settings) {
        const s = appSettingsSchema.safeParse(bundle.settings);
        if (s.success) {
          settingsRepo.set(s.data);
          items.push('Ayarlar');
        } else if (bundle.settings && typeof bundle.settings === 'object') {
          // Eski şemaRevision'lı yedek — deepMerge ile migrasyon dene
          try {
            const raw = bundle.settings as Record<string, unknown>;
            const rev = (raw.schemaRevision as number) ?? 0;
            if (rev < 5) {
              // settingsRepo.get() migrasyonu tetikler; set ile ham veriyi yaz, get migrasyon yapar
              settingsRepo.set(bundle.settings as unknown as import('@shared/types/settings').AppSettings);
              // Migrasyonun çalıştığını doğrula
              const after = settingsRepo.get();
              if (after.schemaRevision === 5) items.push('Ayarlar (migrate edildi)');
              else throw new Error('Migrasyon başarısız');
            } else {
              throw new Error(s.error.message);
            }
          } catch (e) {
            throw new Error(`Yedek ayarları uyumsuz — import edilemedi: ${String(e).slice(0, 120)}`);
          }
        }
      }
      if (bundle.history) {
        historyRepo.importAll(bundle.history as HistoryEntry[]);
        items.push(`Geçmiş (${bundle.history.length})`);
      }
      if (bundle.vaultSealed !== undefined && bundle.vaultSealed !== null) {
        importSealedVault(bundle.vaultSealed);
        items.push('Şifre kasası');
      }
      if (bundle.notesSealed !== undefined && bundle.notesSealed !== null) {
        importSealedNotes(bundle.notesSealed);
        items.push('Güvenli notlar');
      }
      const bookmarks =
        bundle.bookmarks && bundle.bookmarks.length > 0 ? bundle.bookmarks : null;
      if (bookmarks) items.push(`Yer imleri (${bookmarks.length})`);

      logger.info('Yedekten geri yükleme tamamlandı', { items });
      return { items, bookmarks };
    },
  });
}
