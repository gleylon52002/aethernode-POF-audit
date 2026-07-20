// Şifre kasa tipleri — Aşama 6.
//
// Entry'ler main process'te AES-256-GCM ile şifrelenir; anahtar master-password'tan
// PBKDF2 ile türetilir ve oturum boyunca main belleğinde tutulur. Diske yalnızca
// şifrelenmiş sealed payload yazılır. Renderer yalnızca deşifreli entry'leri,
// kilit açıksa görür.

export interface PasswordEntry {
  id: string;
  title: string;
  username: string;
  password: string;
  url?: string;
  notes?: string;
  createdAt: number; // epoch ms
  updatedAt: number; // epoch ms
}

// IPC yanıtı: şifre her zaman string olarak gelir (UI'da kopyala/göster).
export type PasswordEntryDto = PasswordEntry;

export interface VaultStatus {
  unlocked: boolean;
  /** Kasa ilk kez mi oluşturuluyor (ilk kurulum parolası beklenir). */
  initialized: boolean;
}