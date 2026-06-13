// fiyat-hesapla — sunucu tarafı fiyat hesabı (CLAUDE.md kural 2, IMPLEMENTATION Faz 2).
// İstemci yalnızca "şu hizmeti, şu araca, şu şubede istiyorum" der; fiyatı
// göndermez. Fonksiyon segment + branch_prices üzerinden fiyatı kendisi hesaplar
// ve taban_fiyat ± oynama_orani bandı dışına çıkmasına izin vermez.
//
// Salt-okunur: çağıranın JWT'siyle (anon key + Authorization başlığı) çalışır,
// service_role kullanmaz — araç segmenti RLS sayesinde yalnızca sahibine görünür.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";
import { captureEdgeException } from "../_shared/sentry.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const Girdi = z.object({
  service_id: z.string().uuid(),
  vehicle_id: z.string().uuid(),
  branch_id: z.string().uuid(),
});

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
    // Çağıranın oturumu — RLS bu token üzerinden uygulanır.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ hata: "Oturum gerekli" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const parsed = Girdi.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return json({ hata: "Geçersiz girdi", detay: parsed.error.flatten() }, 400);
    }
    const { service_id, vehicle_id, branch_id } = parsed.data;

    // Araç segmenti — RLS yalnızca sahibinin (ya da admin'in) görmesine izin verir.
    // İstemciden segment ALMA; veritabanından oku.
    const { data: arac, error: aracHata } = await supabase
      .from("vehicles")
      .select("segment")
      .eq("id", vehicle_id)
      .maybeSingle();
    if (aracHata) throw aracHata;
    if (!arac) return json({ hata: "Araç bulunamadı veya erişim yok" }, 404);
    const segment = arac.segment ?? "standart";

    // Hizmet tabanı + yerel sapma sınırı.
    const { data: hizmet, error: hizmetHata } = await supabase
      .from("services")
      .select("taban_fiyat, oynama_orani, aktif")
      .eq("id", service_id)
      .maybeSingle();
    if (hizmetHata) throw hizmetHata;
    if (!hizmet || !hizmet.aktif) {
      return json({ hata: "Hizmet bulunamadı veya pasif" }, 404);
    }

    const taban = Number(hizmet.taban_fiyat);
    const oran = Number(hizmet.oynama_orani);
    const altSinir = taban * (1 - oran);
    const ustSinir = taban * (1 + oran);

    // Şubeye özel fiyat (varsa). Yoksa taban fiyat geçerli.
    const { data: yerel, error: yerelHata } = await supabase
      .from("branch_prices")
      .select("fiyat")
      .eq("branch_id", branch_id)
      .eq("service_id", service_id)
      .eq("segment", segment)
      .maybeSingle();
    if (yerelHata) throw yerelHata;

    let fiyat = taban;
    let kaynak: "taban" | "sube" = "taban";
    if (yerel) {
      // Yerel fiyat banda kıstırılır — şube ± oynama_orani dışına çıkamaz.
      const ham = Number(yerel.fiyat);
      fiyat = Math.min(Math.max(ham, altSinir), ustSinir);
      kaynak = "sube";
    }

    // Kuruş hassasiyetinde yuvarla.
    fiyat = Math.round(fiyat * 100) / 100;

    return json({ fiyat, segment, kaynak });
  } catch (e) {
    await captureEdgeException(e, "fiyat-hesapla");
    return json({ hata: "Fiyat hesaplanamadı" }, 500);
  }
});
