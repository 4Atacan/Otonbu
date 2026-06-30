// Mağaza (perakende ürün) için paylaşılan yardımcılar: kapak görseli URL'i.
// product-images PUBLIC bucket — service-images ile aynı mantık (katalog görseli,
// kişisel veri değil; herkes görür, yalnızca admin/şube sahibi yükler).
import { supabase } from './supabase';

export const PRODUCT_BUCKET = 'product-images';

// Public bucket → obje yolundan kalıcı public URL. Yol boşsa null.
export function urunGorselUrl(yol: string | null | undefined): string | null {
  if (!yol) return null;
  return supabase.storage.from(PRODUCT_BUCKET).getPublicUrl(yol).data.publicUrl;
}

export const tl = (n: number) =>
  n.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });
