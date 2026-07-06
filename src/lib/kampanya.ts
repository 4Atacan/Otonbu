// Kampanya katalogu için paylaşılan yardımcılar: banner görsel URL'i ve
// mekanik rozeti. Ana sayfa banner'ı, Kampanyalar sekmesi ve admin formu kullanır.
import { supabase } from './supabase';
import { publicUrl } from './storage';
import { Campaign } from '../types';

export const CAMPAIGN_BUCKET = 'campaign-images';

// Public bucket → obje yolundan kalıcı public URL. Yol boşsa null.
export function kampanyaGorselUrl(yol: string | null | undefined): string | null {
  return publicUrl(CAMPAIGN_BUCKET, yol);
}

// Kampanya mekaniğini kısa rozet metni + ikona çevirir. 'duyuru' → null (rozet yok).
export function kampanyaRozet(
  k: Pick<Campaign, 'tip' | 'indirim_yuzde' | 'bonus_puan' | 'hediye'>,
): { metin: string; ikon: 'pricetag' | 'star' | 'gift' } | null {
  switch (k.tip) {
    case 'indirim':
      return k.indirim_yuzde ? { metin: `%${k.indirim_yuzde} indirim`, ikon: 'pricetag' } : null;
    case 'puan':
      return k.bonus_puan ? { metin: `+${k.bonus_puan} puan`, ikon: 'star' } : null;
    case 'hediye':
      return k.hediye ? { metin: k.hediye, ikon: 'gift' } : null;
    default:
      return null;
  }
}

// Tarih aralığını okunur metne çevirir (null = süresiz).
export function kampanyaTarih(k: Pick<Campaign, 'baslangic' | 'bitis'>): string | null {
  const fmt = (d: string) => new Date(d).toLocaleDateString('tr-TR');
  if (k.baslangic && k.bitis) return `${fmt(k.baslangic)} – ${fmt(k.bitis)}`;
  if (k.bitis) return `Son gün: ${fmt(k.bitis)}`;
  return null;
}

// İndirimli fiyat (kuruş yuvarlama). Yüzde 0 ise fiyat aynen döner.
export function indirimliFiyat(fiyat: number, yuzde: number): number {
  if (!yuzde || yuzde <= 0) return fiyat;
  return Math.round(fiyat * (1 - yuzde / 100) * 100) / 100;
}

export interface IndirimHaritasi {
  hizmet: Record<string, number>;  // service_id → en yüksek aktif indirim %
  urun: Record<string, number>;    // product_id → en yüksek aktif indirim %
}

// Aktif 'indirim' kampanyalarını çekip hizmet/ürün indirim haritası kurar.
// SADECE gösterim içindir; ödeme/sipariş fiyatı sunucuda (kampanya_indirim) zorlanır.
// Tarih sınırı istemcide süzülür (null = süresiz).
export async function kampanyaIndirimHaritasi(): Promise<IndirimHaritasi> {
  const bugun = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from('campaigns')
    .select('hizmet_id, urun_id, indirim_yuzde, baslangic, bitis')
    .eq('tip', 'indirim')
    .eq('aktif', true)
    .not('indirim_yuzde', 'is', null);

  const harita: IndirimHaritasi = { hizmet: {}, urun: {} };
  ((data as Pick<Campaign, 'hizmet_id' | 'urun_id' | 'indirim_yuzde' | 'baslangic' | 'bitis'>[]) ?? [])
    .forEach(k => {
      if (k.baslangic && k.baslangic > bugun) return;
      if (k.bitis && k.bitis < bugun) return;
      const y = k.indirim_yuzde ?? 0;
      if (k.hizmet_id) harita.hizmet[k.hizmet_id] = Math.max(harita.hizmet[k.hizmet_id] ?? 0, y);
      if (k.urun_id) harita.urun[k.urun_id] = Math.max(harita.urun[k.urun_id] ?? 0, y);
    });
  return harita;
}

// Aktif 'puan' kampanyalarının hizmet başına EKSTRA bonus puanı (yalnız gösterim).
// service_id → en yüksek aktif bonus_puan. Müşteri, hizmetin kazandıracağı toplam
// puanı (services.puan + bonus) görsün diye kullanılır. Tarih sınırı istemcide süzülür.
export async function kampanyaPuanHaritasi(): Promise<Record<string, number>> {
  const bugun = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from('campaigns')
    .select('hizmet_id, bonus_puan, baslangic, bitis')
    .eq('tip', 'puan')
    .eq('aktif', true)
    .not('bonus_puan', 'is', null)
    .not('hizmet_id', 'is', null);

  const harita: Record<string, number> = {};
  ((data as Pick<Campaign, 'hizmet_id' | 'bonus_puan' | 'baslangic' | 'bitis'>[]) ?? [])
    .forEach(k => {
      if (k.baslangic && k.baslangic > bugun) return;
      if (k.bitis && k.bitis < bugun) return;
      if (!k.hizmet_id) return;
      harita[k.hizmet_id] = Math.max(harita[k.hizmet_id] ?? 0, k.bonus_puan ?? 0);
    });
  return harita;
}
