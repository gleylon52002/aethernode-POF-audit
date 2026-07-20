// Minimal class-name joiner. clsx/twMerge ağır — burada sadece boş elemanları
// atıp kalanları boşlukla birleştiriyoruz; Tailwind atom sınıfları için yeterli.
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}