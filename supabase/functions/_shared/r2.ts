// Cloudflare R2 (S3-uyumlu) erişim yardımcısı.
//
// Neden Edge Function? R2'ye erişim bir S3 anahtar çiftiyle olur (access key +
// secret). Bu SIR — CLAUDE.md kural 1 gereği istemciye asla girmez.
//
// YÜKLEME: R2 presigned POST'u DESTEKLEMEZ ve presigned PUT tip/boyut sınırı
// zorlayamaz (deneyle doğrulandı). Bu yüzden yükleme Edge Function üzerinden
// proxy'lenir: fonksiyon tip+boyutu doğrular (kural 6) ve R2'ye KENDİSİ yazar
// (putObject — S3 anahtarıyla imzalı PUT).
//
// İNDİRME (private): kısa ömürlü presigned GET URL üretilir; istemci dosyayı
// doğrudan R2'den çeker (okuma trafiği Supabase'i by-pass eder → egress ucuz).
//
// Public ve private dosyalar AYRI R2 bucket'larında: private'ta r2.dev kapalı,
// erişim yalnız presigned GET ile (kural 6). İmza/erişim fonksiyonları fiziksel
// bucket adını parametre alır; hangisi olduğuna üst katman (r2-imza) karar verir.
//
// Env (yalnız Edge Function ortamında; Supabase secrets):
//   R2_ACCOUNT_ID, R2_ACCESS_KEY, R2_SECRET_KEY

import { AwsClient } from "https://esm.sh/aws4fetch@1.0.20";

const ACCOUNT = Deno.env.get("R2_ACCOUNT_ID")!;

// R2'nin S3 API uç noktası. Bölge her zaman "auto".
const ENDPOINT = `https://${ACCOUNT}.r2.cloudflarestorage.com`;

const r2 = new AwsClient({
  accessKeyId: Deno.env.get("R2_ACCESS_KEY")!,
  secretAccessKey: Deno.env.get("R2_SECRET_KEY")!,
  service: "s3",
  region: "auto",
});

// Sunucu tarafı yükleme: fonksiyon (S3 anahtarıyla) objeyi R2'ye yazar.
// Çağıran, yazmadan ÖNCE tip/boyut/yetki doğrulamasını yapmış olmalı.
export async function putObject(
  bucket: string,
  key: string,
  body: Uint8Array,
  contentType: string,
): Promise<Response> {
  return await r2.fetch(`${ENDPOINT}/${bucket}/${key}`, {
    method: "PUT",
    headers: { "content-type": contentType },
    body,
  });
}

// Private indirme için kısa ömürlü presigned GET URL (Supabase createSignedUrl'ün
// R2 karşılığı). İstemci bu URL ile dosyayı doğrudan R2'den çeker.
export async function presignGet(
  bucket: string,
  key: string,
  ttlSaniye = 60,
): Promise<string> {
  const url = new URL(`${ENDPOINT}/${bucket}/${key}`);
  url.searchParams.set("X-Amz-Expires", String(ttlSaniye));
  const signed = await r2.sign(new Request(url, { method: "GET" }), {
    aws: { signQuery: true },
  });
  return signed.url;
}

// Silme (yanlış yükleme düzeltmesi / yedek rotasyonu için ileride).
export async function deleteObject(bucket: string, key: string): Promise<Response> {
  return await r2.fetch(`${ENDPOINT}/${bucket}/${key}`, { method: "DELETE" });
}
