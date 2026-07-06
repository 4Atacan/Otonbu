// Hizmet (servis) katalogu için paylaşılan yardımcılar: kapak görseli URL'i
// ve segment bazlı fiyat aralığı. Anasayfa, hizmet detayı ve admin formu kullanır.
import { publicUrl } from './storage';
import { Service } from '../types';

export const SERVICE_BUCKET = 'service-images';

// Public bucket → obje yolundan kalıcı public URL. Yol boşsa null.
export function gorselUrl(yol: string | null | undefined): string | null {
  return publicUrl(SERVICE_BUCKET, yol);
}

const tl = (n: number) =>
  n.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 });

// Segment fiyatlarından küçük–büyük aralığı (tekil = iki segment eşit).
export function fiyatAraligi(h: Pick<Service, 'taban_fiyat' | 'segment_fiyatlari'>) {
  const sf = h.segment_fiyatlari ?? {};
  const k = sf.kucuk ?? h.taban_fiyat;
  const b = sf.buyuk ?? h.taban_fiyat;
  return { min: Math.min(k, b), max: Math.max(k, b), tekil: k === b };
}

// "600 ₺" (tekil) veya "600 – 700 ₺" (aralık)
export function fiyatMetni(h: Pick<Service, 'taban_fiyat' | 'segment_fiyatlari'>): string {
  const { min, max, tekil } = fiyatAraligi(h);
  return tekil ? tl(min) : `${tl(min)} – ${tl(max)}`;
}

type KampanyaPick = Pick<
  Service, 'taban_fiyat' | 'segment_fiyatlari' | 'kampanya_tip' | 'kampanya_indirim_yuzde'
>;

// 'fiyat' kampanyasında indirim uygulanmış fiyat metni; kampanya yoksa null.
export function indirimliMetni(h: KampanyaPick): string | null {
  if (h.kampanya_tip !== 'fiyat' || !h.kampanya_indirim_yuzde) return null;
  const { min, max, tekil } = fiyatAraligi(h);
  const oran = 1 - h.kampanya_indirim_yuzde / 100;
  const km = Math.round(min * oran);
  const bm = Math.round(max * oran);
  return tekil ? tl(km) : `${tl(km)} – ${tl(bm)}`;
}

// "40 dk" / "1 sa 30 dk" / "2 saat"
export function sureMetni(dk: number): string {
  if (!dk || dk < 60) return `${dk || 0} dk`;
  const saat = Math.floor(dk / 60);
  const kalan = dk % 60;
  return kalan === 0 ? `${saat} saat` : `${saat} sa ${kalan} dk`;
}
