// OTONBU çalışma programı yardımcıları. Slotlar artık branch geneli elle
// üretilmez; her şube her hizmet için kendi programını (service_schedules)
// belirler. Burada yalnızca makul varsayılan + editör yardımcıları durur.
// Varsayılan: ilk randevu 09:00, 40 dk aralık, sabah son 12:20; öğle molası
// (12:20 sonrası 13:40'a kadar boş); öğleden sonra 13:40–17:00.

import { CalismaPenceresi } from '../types';

export const SLOT_ARALIK_DK = 40;

export const VARSAYILAN_PENCERELER: CalismaPenceresi[] = [
  { bas: '09:00', son: '12:20' },
  { bas: '13:40', son: '17:00' },
];

// ISO haftanın günü (1=Pzt .. 7=Paz) → kısa etiket
export const GUNLER: { dow: number; label: string }[] = [
  { dow: 1, label: 'Pzt' },
  { dow: 2, label: 'Sal' },
  { dow: 3, label: 'Çar' },
  { dow: 4, label: 'Per' },
  { dow: 5, label: 'Cum' },
  { dow: 6, label: 'Cmt' },
  { dow: 7, label: 'Paz' },
];

export const TUM_GUNLER = [1, 2, 3, 4, 5, 6, 7];

// "09:00" gibi geçerli bir HH:MM mi?
export function saatGecerli(s: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(s.trim());
}

// "09:00" → dakika (sıralama/karşılaştırma için)
export function saatDk(s: string): number {
  const [h, m] = s.split(':').map(Number);
  return h * 60 + m;
}
