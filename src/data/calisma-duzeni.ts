// OTONBU çalışma düzeni — slot üretim şablonu (kullanıcı kararı, 2026-06-12):
// İlk randevu 09:00, 40 dakika aralık. Sabah son randevu 12:20;
// 12:20 randevusundan sonra 13:40'a kadar mola (randevu alınmaz).
// Öğleden sonra 13:40'ta devam, son randevu 17:00.
// Günlük slotlar: 09:00 09:40 10:20 11:00 11:40 12:20 | 13:40 14:20 15:00 15:40 16:20 17:00

export const SLOT_ARALIK_DK = 40;

const SABAH = { bas: [9, 0], son: [12, 20] } as const;
const OGLEDEN_SONRA = { bas: [13, 40], son: [17, 0] } as const;

export function gunlukSlotSaatleri(gun: Date): Date[] {
  const slotlar: Date[] = [];
  for (const blok of [SABAH, OGLEDEN_SONRA]) {
    const t = new Date(gun);
    t.setHours(blok.bas[0], blok.bas[1], 0, 0);
    const son = new Date(gun);
    son.setHours(blok.son[0], blok.son[1], 0, 0);
    while (t <= son) {
      slotlar.push(new Date(t));
      t.setMinutes(t.getMinutes() + SLOT_ARALIK_DK);
    }
  }
  return slotlar;
}
