// r2-imza — Cloudflare R2 için yükleme proxy'si + private indirme imzası.
//
// NEDEN: R2'ye erişim bir S3 anahtar çiftiyle olur; bu SIR, istemciye asla
// girmez (CLAUDE.md kural 1). Ayrıca R2 presigned POST'u desteklemez ve
// presigned PUT tip/boyut sınırı zorlayamaz — bu yüzden yükleme bu fonksiyon
// üzerinden proxy'lenir (tip+boyut sunucuda doğrulanır, kural 6).
//
// YETKİ: Supabase Storage'ın "storage üstünde RLS"i R2'de yok. Karar
// public.r2_yetki() SQL fonksiyonuna devredilir — eski storage.objects
// politikalarının birebir aynısı, kullanıcı JWT'siyle çalışır. Franchise
// izolasyonu (kural 3) tek yerde, SQL'de, test edilebilir kalır.
//
// İSTEKLER (hepsi POST):
//   YÜKLE : ?islem=yukle&bucket=<b>&yol=<y>  + multipart FormData (file) → {ok,key}
//           (RN'de en güvenilir yükleme yolu FormData'dır)
//   İNDİR : ?islem=indir   JSON gövde { bucket, yollar:[...] } (private, toplu)
//           → { urls: [{yol, url|null}] }  (kısa ömürlü presigned GET)
//
// Env (Supabase secrets): R2_ACCOUNT_ID, R2_ACCESS_KEY, R2_SECRET_KEY.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";
import { captureEdgeException } from "../_shared/sentry.ts";
import { putObject, presignGet } from "../_shared/r2.ts";

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

// Mantıksal bucket → fiziksel R2 bucket. Public'ler tek bucket'ta (r2.dev açık),
// private'lar ayrı bucket'ta (r2.dev kapalı). Aynı fiziksel bucket içinde
// çakışmayı önlemek için R2 anahtarı "<mantıksal>/<yol>" ile öneklenir.
const PUBLIC_BUCKETS = new Set([
  "avatars", "service-images", "campaign-images", "product-images",
]);
const R2_PUBLIC = "otonbu";
const R2_PRIVATE = "otonbu-gizli";
const MAKS_BOYUT = 5 * 1024 * 1024; // 5 MB (kural 6)
const INDIR_TTL = 3600;             // 1 saat (eski SIGNED_TTL)

const TumBucket = z.enum([
  "avatars", "service-images", "campaign-images", "product-images",
  "vehicle-docs", "job-photos",
]);
const PrivateBucket = z.enum(["vehicle-docs", "job-photos"]);
const IndirGovde = z.object({
  bucket: PrivateBucket,
  yollar: z.array(z.string().min(1).max(300)).min(1).max(50),
});

function yolGuvenli(yol: string): boolean {
  return !yol.includes("..") && !yol.startsWith("/");
}

// Sihirli baytlarla gerçek görsel tipi tespiti — istemcinin beyanına güvenme.
function gorselTipi(b: Uint8Array): "image/jpeg" | "image/png" | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e &&
    b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a
  ) {
    return "image/png";
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ hata: "Yalnızca POST" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ hata: "Oturum gerekli" }, 401);

    const url = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ hata: "Geçersiz oturum" }, 401);

    const yetki = (bucket: string, yol: string, islem: string) =>
      userClient.rpc("r2_yetki", { p_bucket: bucket, p_yol: yol, p_islem: islem });

    const islem = new URL(req.url).searchParams.get("islem");

    // ---- İNDİR: toplu private presigned GET ----
    if (islem === "indir") {
      const parsed = IndirGovde.safeParse(await req.json().catch(() => null));
      if (!parsed.success) return json({ hata: "Geçersiz istek" }, 400);
      const { bucket, yollar } = parsed.data;

      const urls = await Promise.all(yollar.map(async (yol) => {
        if (!yolGuvenli(yol)) return { yol, url: null };
        const { data: ok, error } = await yetki(bucket, yol, "indir");
        if (error || ok !== true) return { yol, url: null };
        const key = `${bucket}/${yol}`;
        return { yol, url: await presignGet(R2_PRIVATE, key, INDIR_TTL) };
      }));
      return json({ urls });
    }

    // ---- YÜKLE: tip + boyut doğrula, sonra R2'ye yaz (kural 6) ----
    if (islem === "yukle") {
      const q = new URL(req.url).searchParams;
      const bParsed = TumBucket.safeParse(q.get("bucket"));
      const yol = q.get("yol") ?? "";
      if (!bParsed.success || yol.length < 1 || yol.length > 300 || !yolGuvenli(yol)) {
        return json({ hata: "Geçersiz istek" }, 400);
      }
      const bucket = bParsed.data;

      // Yetki — body okumadan ÖNCE.
      const { data: ok, error: yErr } = await yetki(bucket, yol, "yukle");
      if (yErr) throw yErr;
      if (ok !== true) return json({ hata: "Yetkiniz yok" }, 403);

      const form = await req.formData().catch(() => null);
      const file = form?.get("file");
      if (!(file instanceof File)) return json({ hata: "Dosya yok" }, 400);
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (bytes.byteLength < 1) return json({ hata: "Boş dosya" }, 400);
      if (bytes.byteLength > MAKS_BOYUT) return json({ hata: "Dosya 5MB'tan büyük" }, 413);
      const tip = gorselTipi(bytes); // sihirli bayt — beyana güvenme
      if (!tip) return json({ hata: "Yalnızca JPG/PNG" }, 415);

      const fiziksel = PUBLIC_BUCKETS.has(bucket) ? R2_PUBLIC : R2_PRIVATE;
      const key = `${bucket}/${yol}`;
      const put = await putObject(fiziksel, key, bytes, tip);
      if (!put.ok) {
        await captureEdgeException(
          new Error(`R2 PUT ${put.status}: ${await put.text()}`), "r2-imza",
        );
        return json({ hata: "Yükleme başarısız" }, 502);
      }
      return json({ ok: true, key });
    }

    return json({ hata: "Geçersiz işlem" }, 400);
  } catch (e) {
    await captureEdgeException(e, "r2-imza");
    return json({ hata: "Sunucu hatası" }, 500);
  }
});
