// hesap-sil — KVKK silme hakkının TAM hali: public şema + auth.users temizliği.
// (IMPLEMENTATION Faz 4 KVKK görevleri / CLAUDE.md kural 4 + KVKK kararları)
//
// hesabimi_sil RPC'si yalnızca public şemayı anonimleştirir; auth.users'ta
// e-posta ve raw_user_meta_data (ad_soyad, telefon) kalır ve kullanıcı giriş
// yapmaya devam edebilir. Bu ikisini yalnızca service_role (Admin API)
// temizleyebilir — bu yüzden Edge Function.
//
// AKIŞ:
//   1) Çağıranın kimliği JWT'den alınır — girdi YOK, yalnız kendi hesabı.
//   2) hesabimi_sil RPC'si kullanıcının OTURUMUYLA çağrılır (auth.uid() çalışır;
//      public.users, vehicles, teklifler anonimleşir, abonelik/randevu iptal).
//   3) Admin API ile auth.users temizlenir: e-posta anonim takma adrese çevrilir
//      (kişisel veri), metadata boşaltılır, hesap kalıcı BAN'lanır (anonim hesaba
//      bir daha giriş yapılamaz; refresh token'lar da reddedilir).
//   4) İstemci dönüşte kendi oturumunu kapatır (signOut).
//
// Hard delete YOK: auth.users satırı silinirse public.users'a cascade eder ve
// muhasebe için tutulan anonim kayıtlar da giderdi (KVKK kararı: soft delete).
// İki adım da idempotent — yarıda kalırsa tekrar çağrılabilir.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { captureEdgeException } from "../_shared/sentry.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ hata: "Yalnızca POST" }, 405);

  try {
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

    // 1) Public şema anonimleştirme — kullanıcının oturumuyla (auth.uid() = uid).
    const { error: rpcErr } = await userClient.rpc("hesabimi_sil");
    if (rpcErr) throw rpcErr;

    // 2) auth.users temizliği — yalnızca Admin API yapabilir.
    //    E-posta kişiye bağlanamayan takma adrese döner (uid'e bağlı, benzersiz);
    //    metadata'daki ad_soyad/telefon silinir; kalıcı ban girişi kapatır.
    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false },
    });
    // NOT: Admin API user_metadata'yı MERGE eder — kişisel alanlar ancak
    // açıkça null gönderilerek silinir.
    const { error: authErr } = await admin.auth.admin.updateUserById(uid, {
      email: `silindi-${uid}@anonim.otonbu.app`,
      user_metadata: { silindi: true, ad_soyad: null, telefon: null },
      ban_duration: "876000h", // ~100 yıl = kalıcı
    });
    if (authErr) throw authErr;

    return json({ ok: true });
  } catch (e) {
    await captureEdgeException(e, "hesap-sil");
    return json({ hata: "Hesap silinemedi, lütfen tekrar dene" }, 500);
  }
});
