// Mağaza (perakende ürün) için paylaşılan yardımcılar: kapak görseli URL'i.
// product-images PUBLIC bucket — service-images ile aynı mantık (katalog görseli,
// kişisel veri değil; herkes görür, yalnızca admin/şube sahibi yükler).
import { publicUrl } from './storage';

export const PRODUCT_BUCKET = 'product-images';

// Public bucket → obje yolundan kalıcı public URL. Yol boşsa null.
export function urunGorselUrl(yol: string | null | undefined): string | null {
  return publicUrl(PRODUCT_BUCKET, yol);
}

export const tl = (n: number) =>
  n.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });
