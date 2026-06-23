// abonelik-baslat — paket satın alma için iyzico CheckoutForm oturumu başlatır.
// (IMPLEMENTATION Faz 3 / CLAUDE.md kural 1,2,5)
//
// AKIŞ:
//   1) İstemci yalnızca { plan_id, branch_id } yollar — TUTAR YOLLAMAZ.
//   2) Fonksiyon plan ücretini DB'den kendisi okur (istemciye güvenilmez).
//   3) 'beklemede' bir abonelik satırı açar (ödeme onaylanınca aktiflenecek).
//   4) iyzico CheckoutForm oturumu başlatır; conversationId = subscription.id.
//   5) Ödeme sayfasını (paymentPageUrl/token) istemciye döner — kart bilgisi
//      yalnızca iyzico'nun sayfasına girilir, bu sisteme HİÇ gelmez.
//
// Abonelik 'aktif' OLMAZ ve hak ÜRETİLMEZ — bunu yalnızca iyzico-webhook,
// tahsilatı sunucu-sunucu doğruladıktan sonra yapar.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";
import { captureEdgeException } from "../_shared/sentry.ts";
import { checkoutBaslat, iyzicoYapilandirildiMi } from "../_shared/iyzico.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const Girdi = z.object({
  plan_id: z.string().uuid(),
  branch_id: z.string().uuid(),
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

function adSoyadAyir(adSoyad: string | null): { ad: string; soyad: string } {
  const parcalar = (adSoyad ?? "").trim().split(/\s+/).filter(Boolean);
  if (parcalar.length === 0) return { ad: "Müşteri", soyad: "Otonbu" };
  if (parcalar.length === 1) return { ad: parcalar[0], soyad: parcalar[0] };
  return { ad: parcalar.slice(0, -1).join(" "), soyad: parcalar[parcalar.length - 1] };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ hata: "Yalnızca POST" }, 405);

  try {
    if (!iyzicoYapilandirildiMi()) {
      return json({ hata: "Ödeme sağlayıcısı yapılandırılmamış" }, 503);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ hata: "Oturum gerekli" }, 401);

    const url = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Çağıranın kimliği — JWT'den (anon client + Authorization).
    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ hata: "Geçersiz oturum" }, 401);
    const uid = userData.user.id;
    const email = userData.user.email ?? "noreply@otonbu.local";

    const parsed = Girdi.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return json({ hata: "Geçersiz girdi", detay: parsed.error.flatten() }, 400);
    }
    const { plan_id, branch_id } = parsed.data;

    // service_role: abonelik yazımı + plan/kullanıcı okuması (RLS dışı, kontrollü).
    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false },
    });

    // Plan ücreti SUNUCUDAN — istemci tutar göndermez (kural 2).
    const { data: plan, error: planErr } = await admin
      .from("plans")
      .select("id, ad, aylik_ucret, aktif")
      .eq("id", plan_id)
      .maybeSingle();
    if (planErr) throw planErr;
    if (!plan || !plan.aktif) return json({ hata: "Paket bulunamadı veya pasif" }, 404);

    // Şube geçerli mi?
    const { data: sube, error: subeErr } = await admin
      .from("branches")
      .select("id")
      .eq("id", branch_id)
      .maybeSingle();
    if (subeErr) throw subeErr;
    if (!sube) return json({ hata: "Şube bulunamadı" }, 404);

    // Alıcı bilgisi (iyzico buyer alanı için).
    const { data: kullanici, error: kErr } = await admin
      .from("users")
      .select("ad_soyad, telefon")
      .eq("id", uid)
      .maybeSingle();
    if (kErr) throw kErr;

    // 'beklemede' abonelik — ödeme onaylanınca webhook 'aktif' yapar.
    const { data: sub, error: subInsErr } = await admin
      .from("subscriptions")
      .insert({ user_id: uid, branch_id, plan_id, durum: "beklemede" })
      .select("id")
      .single();
    if (subInsErr) throw subInsErr;

    const fiyat = Number(plan.aylik_ucret).toFixed(2);
    const { ad, soyad } = adSoyadAyir(kullanici?.ad_soyad ?? null);
    const ip =
      (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() ||
      "85.34.78.112";

    const sonuc = await checkoutBaslat({
      conversationId: sub.id,
      fiyat,
      callbackUrl: `${url}/functions/v1/iyzico-webhook`,
      paketAd: plan.ad,
      paketId: plan.id,
      alici: {
        id: uid,
        ad,
        soyad,
        email,
        telefon: kullanici?.telefon ?? "+905000000000",
        ip,
      },
    });

    if (sonuc.status !== "success") {
      // Oturum açılamadı — beklemede aboneliği temizle (çöp kalmasın).
      await admin.from("subscriptions").delete().eq("id", sub.id);
      return json({ hata: sonuc.errorMessage ?? "Ödeme oturumu açılamadı" }, 502);
    }

    return json({
      subscription_id: sub.id,
      token: sonuc.token,
      payment_page_url: sonuc.paymentPageUrl,
      checkout_form_content: sonuc.checkoutFormContent,
    });
  } catch (e) {
    await captureEdgeException(e, "abonelik-baslat");
    return json({ hata: "Abonelik başlatılamadı" }, 500);
  }
});
