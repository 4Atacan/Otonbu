// iyzico-webhook — tahsilat sonucunu alır ve aboneliği aktifler.
// (IMPLEMENTATION Faz 3 / CLAUDE.md kural 2,5)
//
// DOĞRULAMA İLKESİ (sahte webhook reddi):
//   İstemcinin ya da gelen isteğin gövdesindeki "ödendi" bilgisine ASLA güvenme.
//   Gelen token ile iyzico'ya SUNUCU-SUNUCU yeniden sorgu atılır (checkoutSonuc);
//   bu çağrı IYZICO_SECRET ile imzalandığı için sonucu yalnız biz alabiliriz.
//   Sahte bir webhook uydurma token'la bu sorguyu geçemez → reddedilir.
//
// AKIŞ (yalnız paymentStatus=SUCCESS ise):
//   1) conversationId = subscription.id ile aboneliği bul.
//   2) Ödenen tutar plan ücretiyle eşleşiyor mu doğrula.
//   3) payments yaz (saglayici_ref unique → çift webhook idempotent).
//   4) subscription.durum = 'aktif' yap.
//   5) donem_haklari_uret ile bu dönemin haklarını üret.
//
// config.toml: verify_jwt = false (iyzico'da kullanıcı JWT'si yoktur).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { captureEdgeException } from "../_shared/sentry.ts";
import { checkoutSonuc } from "../_shared/iyzico.ts";

// iyzico callback'i kullanıcıyı bu sayfaya yönlendirir — WebView burada kapanır.
function htmlKapat(mesaj: string): Response {
  return new Response(
    `<!doctype html><html lang="tr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Otonbu</title></head>
<body style="font-family:system-ui;text-align:center;padding:40px">
<h2>${mesaj}</h2>
<p>Uygulamaya dönebilirsiniz.</p>
<script>window.location.href="otonbu://abonelik/sonuc";</script>
</body></html>`,
    { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

async function tokenAyikla(req: Request): Promise<string | null> {
  const ct = req.headers.get("content-type") ?? "";
  try {
    if (ct.includes("application/json")) {
      const b = await req.json().catch(() => null);
      return b?.token ?? b?.iyziReferenceCode ?? null;
    }
    // CheckoutForm callback'i x-www-form-urlencoded gövdede token yollar.
    const form = await req.formData();
    const t = form.get("token");
    return typeof t === "string" ? t : null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Yalnızca POST", { status: 405 });
  }

  try {
    const token = await tokenAyikla(req);
    if (!token) return htmlKapat("Ödeme doğrulanamadı");

    // SUNUCU-SUNUCU doğrulama — tek güvenilir kaynak.
    const sonuc = await checkoutSonuc(token);
    if (sonuc.status !== "success" || sonuc.paymentStatus !== "SUCCESS") {
      // Başarısız/sahte — hiçbir şey yazma.
      return htmlKapat("Ödeme tamamlanamadı");
    }

    const subId = sonuc.conversationId;
    if (!subId) return htmlKapat("Ödeme eşleştirilemedi");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    // Aboneliği + plan ücretini bul.
    const { data: sub, error: subErr } = await admin
      .from("subscriptions")
      .select("id, user_id, durum, plans(aylik_ucret)")
      .eq("id", subId)
      .maybeSingle();
    if (subErr) throw subErr;
    if (!sub) return htmlKapat("Abonelik bulunamadı");

    // Ödenen tutar plan ücretiyle eşleşmeli (manipülasyon kontrolü).
    const beklenen = Number((sub as any).plans?.aylik_ucret ?? NaN);
    const odenen = Number(sonuc.paidPrice ?? NaN);
    if (!Number.isFinite(beklenen) || Math.abs(beklenen - odenen) > 0.01) {
      await captureEdgeException(
        new Error(`Tutar uyuşmazlığı sub=${subId} beklenen=${beklenen} odenen=${odenen}`),
        "iyzico-webhook",
      );
      return htmlKapat("Ödeme tutarı doğrulanamadı");
    }

    // Aktivasyon = payment yaz + abonelik 'aktif' + dönem haklarını üret.
    // Tek doğruluk kaynağı: abonelik_aktiflestir (taslak akışı da bunu kullanır).
    // saglayici_ref unique olduğu için çift webhook idempotent (false döner).
    const { data: aktif, error: aktifErr } = await admin.rpc("abonelik_aktiflestir", {
      p_subscription_id: sub.id,
      p_tutar: odenen,
      p_ref: sonuc.paymentId ?? token,
    });
    if (aktifErr) throw aktifErr;

    return htmlKapat(aktif ? "Aboneliğiniz başladı 🎉" : "Ödeme zaten işlenmiş");
  } catch (e) {
    await captureEdgeException(e, "iyzico-webhook");
    // iyzico'ya 200 dönmek tekrar denemesini durdurur; biz Sentry'ye düştük.
    return htmlKapat("Bir hata oluştu");
  }
});
