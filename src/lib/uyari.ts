import { Alert } from 'react-native';

// OTONBU temalı uyarı/onay dialogu. Native Alert.alert yerine geçer (aynı imza):
//   uyari('Başlık', 'Mesaj', [{ text, style?, onPress? }])
//
// ÖNEMLİ (iOS donma düzeltmesi): Bu dialog native <Modal> DEĞİL, normal bir
// overlay katmanıdır (UyariKatmani). Çünkü iOS'ta açık bir native Modal (ör.
// bir düzenleme formu) varken ikinci bir native Modal SUNULAMAZ — sessizce
// görünmez ve uygulama kilitlenir. Overlay katmanı hem kök layout'ta hem de her
// native Modal'ın içinde bulunur; böylece hangi katman en üstteyse orada çizilir.
// Birden çok UyariKatmani aynı anda dinleyebilsin diye pub/sub kullanılır.
export type UyariButonStil = 'default' | 'cancel' | 'destructive';
export type UyariButon = {
  text: string;
  style?: UyariButonStil;
  onPress?: () => void;
};
export type UyariConfig = {
  baslik: string;
  mesaj?: string;
  butonlar?: UyariButon[];
};

let mevcut: UyariConfig | null = null;
const dinleyiciler = new Set<(c: UyariConfig | null) => void>();

function yayinla() {
  dinleyiciler.forEach(fn => fn(mevcut));
}

// UyariKatmani mount olunca çağırır; anlık config'i alır, aboneliği geri döner.
export function _uyariDinle(fn: (c: UyariConfig | null) => void) {
  dinleyiciler.add(fn);
  fn(mevcut);
  return () => { dinleyiciler.delete(fn); };
}

export function uyari(baslik: string, mesaj?: string, butonlar?: UyariButon[]) {
  if (dinleyiciler.size === 0) {
    // Katman henüz yok (ör. test ortamı) → native Alert'e düş; çağrı kaybolmaz.
    Alert.alert(baslik, mesaj, butonlar as any);
    return;
  }
  mevcut = { baslik, mesaj, butonlar };
  yayinla();
}

// UyariKatmani buton basınca çağırır (iç kullanım).
export function _uyariKapat() {
  if (!mevcut) return;
  mevcut = null;
  yayinla();
}
