// R2 storage istemci sarmalayıcısı — tüm yükleme/indirme buradan geçer.
//
// Yükleme: yerel görsel önce SIKIŞTIRILIR (resize + jpeg), sonra r2-imza Edge
// Function'ına FormData ile gönderilir; fonksiyon tip+boyut doğrulayıp R2'ye
// yazar (S3 anahtarı asla istemcide değil — CLAUDE.md kural 1 + 6).
//
// İndirme:
//   - Public bucket (avatar, hizmet/kampanya/ürün görseli): kalıcı public URL
//     (R2 public alan adı üzerinden — imza gerekmez).
//   - Private bucket (ruhsat, iş fotoğrafı): r2-imza'dan kısa ömürlü presigned
//     GET URL (toplu — createSignedUrls'ün karşılığı).
//
// Sıkıştırma, storage ve egress'i ~10x düşürür → Free tier'da çok daha uzun
// kalınır (foto başına ~3MB yerine ~300KB).

import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { supabase } from './supabase';

const FN = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/r2-imza`;
const ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
// Public dosyaların servis edildiği R2 tabanı.
// Dev: r2.dev alt alan adı; prod: cdn.otonbugarage.com (Haldiz alt alan adı açınca).
const PUBLIC_BASE = process.env.EXPO_PUBLIC_R2_PUBLIC_URL ?? '';

const MAKS_GENISLIK = 1280; // büyük kenar; foto detayına yeter, boyutu düşürür
const KALITE = 0.6;

export type PrivateBucket = 'vehicle-docs' | 'job-photos';

// Yerel görsel uri → sıkıştırılmış jpeg uri. Her zaman jpeg üretir (yol .jpg olmalı).
// Eski manipulateAsync API'si — resize'ı kesin uygular ve Expo Go'da güvenilir
// (yeni context API'sinin resize/hang sorunlarından kaçınır).
async function sikistir(uri: string): Promise<string> {
  const sonuc = await manipulateAsync(
    uri,
    [{ resize: { width: MAKS_GENISLIK } }],
    { compress: KALITE, format: SaveFormat.JPEG },
  );
  return sonuc.uri;
}

async function token(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const t = data.session?.access_token;
  if (!t) throw new Error('Oturum bulunamadı');
  return t;
}

// Yükleme: sıkıştır → r2-imza'ya FormData ile gönder (fonksiyon R2'ye yazar).
// Sıkıştırma her zaman jpeg ürettiği için `yol` .jpg uzantılı olmalı.
export async function yukle(bucket: string, yol: string, uri: string): Promise<void> {
  // 1) Sıkıştırma (ImageManipulator)
  let kucukUri: string;
  try {
    kucukUri = await sikistir(uri);
  } catch (e: any) {
    throw new Error(`Sıkıştırma hatası: ${e?.message ?? e}`);
  }

  // 2) FormData hazırla (RN dosya biçimi: { uri, name, type })
  const fd = new FormData();
  fd.append('file', { uri: kucukUri, name: 'f.jpg', type: 'image/jpeg' } as any);
  const t = await token();

  // 3) Yükleme — 30sn zaman aşımı (sonsuz "yükleniyor"u önler)
  const q = `?islem=yukle&bucket=${encodeURIComponent(bucket)}&yol=${encodeURIComponent(yol)}`;
  const kontrol = new AbortController();
  const zaman = setTimeout(() => kontrol.abort(), 30000);
  let r: Response;
  try {
    r = await fetch(`${FN}${q}`, {
      method: 'POST',
      // Content-Type BİLEREK verilmez — RN multipart boundary'yi kendi ekler.
      headers: { Authorization: `Bearer ${t}`, apikey: ANON },
      body: fd,
      signal: kontrol.signal,
    });
  } catch (e: any) {
    throw new Error(
      e?.name === 'AbortError'
        ? 'Yükleme zaman aşımına uğradı (ağ)'
        : `Ağ hatası: ${e?.message ?? e}`,
    );
  } finally {
    clearTimeout(zaman);
  }
  if (!r.ok) {
    const j = await r.json().catch(() => ({} as any));
    throw new Error(j?.hata ? `${j.hata} (${r.status})` : `Yükleme başarısız (HTTP ${r.status})`);
  }
}

// Public bucket dosyası → kalıcı public URL. Yol boşsa null.
export function publicUrl(bucket: string, yol: string | null | undefined): string | null {
  if (!yol) return null;
  return `${PUBLIC_BASE}/${bucket}/${yol}`;
}

// Private bucket → toplu kısa ömürlü indirme URL'leri. yol→url haritası döner.
// Yetkisiz/erişilemeyen yollar haritada yer almaz.
export async function privateUrls(
  bucket: PrivateBucket,
  yollar: string[],
): Promise<Record<string, string>> {
  if (yollar.length === 0) return {};
  const t = await token();
  const r = await fetch(`${FN}?islem=indir`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${t}`,
      apikey: ANON,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ bucket, yollar }),
  });
  if (!r.ok) throw new Error('İmzalı URL alınamadı');
  const j = await r.json();
  const harita: Record<string, string> = {};
  for (const s of j.urls ?? []) if (s?.url) harita[s.yol] = s.url;
  return harita;
}

// Tek dosya kolaylığı — private bucket.
export async function privateUrl(
  bucket: PrivateBucket,
  yol: string,
): Promise<string | null> {
  const h = await privateUrls(bucket, [yol]);
  return h[yol] ?? null;
}
