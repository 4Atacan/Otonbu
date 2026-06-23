import { supabase } from './supabase';

// ÖDEME ADIMI — TASLAK / GERÇEK geçişi tek noktada.
//
// iyzico entegrasyonu sona bırakıldı. Şimdilik TASLAK_MODU açık: "Abone Ol"
// ödeme adımını atlar, aboneliği DB tarafında doğrudan başlatır (dev simülasyon,
// abonelik_taslak_basla RPC — sunucuda app_ayar bayrağıyla korumalı).
//
// iyzico hazır olunca:
//   1) TASLAK_MODU = false yap,
//   2) sunucuda app_ayar.odeme_taslak_modu = 'kapali',
//   3) abonelik-baslat + iyzico-webhook fonksiyonlarını deploy et.
// Bu dosyanın dışındaki UI (paket seçim, durum, hakla randevu) aynı kalır.
export const TASLAK_MODU = true;

export interface AboneOlSonuc {
  ok: boolean;
  taslak: boolean;
  paymentPageUrl?: string;  // gerçek modda iyzico ödeme sayfası (WebView)
  hata?: string;
}

export async function aboneOl(planId: string, branchId: string): Promise<AboneOlSonuc> {
  if (TASLAK_MODU) {
    const { error } = await supabase.rpc('abonelik_taslak_basla', {
      p_plan_id: planId,
      p_branch_id: branchId,
    });
    if (error) return { ok: false, taslak: true, hata: error.message };
    return { ok: true, taslak: true };
  }

  // GERÇEK: iyzico CheckoutForm oturumu — ödeme sayfası döner (WebView'da açılır),
  // tahsilatı iyzico-webhook sunucu-sunucu doğrular.
  const { data, error } = await supabase.functions.invoke('abonelik-baslat', {
    body: { plan_id: planId, branch_id: branchId },
  });
  const govde = data as { payment_page_url?: string; hata?: string } | null;
  if (error || govde?.hata || !govde?.payment_page_url) {
    return { ok: false, taslak: false, hata: govde?.hata ?? error?.message ?? 'Ödeme başlatılamadı' };
  }
  return { ok: true, taslak: false, paymentPageUrl: govde.payment_page_url };
}
