// Güvenli not tipleri — Aşama 6.
//
// Notlar şifre kasanın açılmasıyla aynı master anahtarla şifrelenir. Vault
// kilitliyken notlar erişilemez. Renderer düz metin notları düzenler
// (markdown render edilmez).

export type NoteColor = 'default' | 'purple' | 'blue' | 'emerald' | 'amber' | 'rose';

export interface SecureNote {
  id: string;
  title: string;
  body: string;
  createdAt: number; // epoch ms
  updatedAt: number; // epoch ms
  pinned?: boolean;
  color?: NoteColor;
  tags?: string[];
}