// Gezinme geçmişi kayıt tipi. Incognito sekmeler asla kaydedilmez.
export interface HistoryEntry {
  id: string;
  url: string;
  title: string;
  visitedAt: number;
  visitCount: number;
}
