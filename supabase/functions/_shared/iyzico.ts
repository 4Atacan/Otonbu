// iyzico'ya özgü TÜM kod burada toplanır — sağlayıcı-bağımsız soyutlama.
// Ödeme sağlayıcısını değiştirirsek (banka sanal POS, PayTR, vb.) yalnızca bu
// dosyayı ve onu çağıran 2 fonksiyonu (abonelik-baslat, iyzico-webhook)
// değiştiririz; veri motoru ve istemci aynı kalır.
//
// GÜVENLİK (CLAUDE.md kural 1 & 5):
//   * IYZICO_API_KEY / IYZICO_SECRET YALNIZCA Edge ortam değişkeninde; istemciye
//     asla gitmez, repoya commit edilmez.
//   * Kart bilgisi sisteme HİÇ girmez — iyzico hosted CheckoutForm kullanılır.
//   * Ödeme sonucu istemcinin sözüyle değil, iyzico'dan sunucu-sunucu yeniden
//     sorgulanan (secret ile imzalı) sonuçla doğrulanır.

const API_KEY = Deno.env.get("IYZICO_API_KEY") ?? "";
const SECRET = Deno.env.get("IYZICO_SECRET") ?? "";
// Sandbox: https://sandbox-api.iyzipay.com — Canlı: https://api.iyzipay.com
const BASE_URL = Deno.env.get("IYZICO_BASE_URL") ?? "https://sandbox-api.iyzipay.com";

export function iyzicoYapilandirildiMi(): boolean {
  return API_KEY.length > 0 && SECRET.length > 0;
}

// ------------------------------------------------------------
// IYZWSv2 kimlik doğrulama (HmacSHA256)
//   signature = HMAC_SHA256( randomKey + uriPath + requestBody , secret )  [hex]
//   Authorization: "IYZWSv2 " + base64("apiKey:..&randomKey:..&signature:..")
//   x-iyzi-rnd: randomKey
// ------------------------------------------------------------
function randomKey(): string {
  return Date.now().toString() + Math.random().toString(36).slice(2, 12);
}

async function hmacHex(key: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message));
  return [...new Uint8Array(sig)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function authHeader(uriPath: string, body: string, rnd: string): Promise<string> {
  const signature = await hmacHex(SECRET, rnd + uriPath + body);
  const authStr = `apiKey:${API_KEY}&randomKey:${rnd}&signature:${signature}`;
  return `IYZWSv2 ${btoa(authStr)}`;
}

async function iyziPost(uriPath: string, payload: unknown): Promise<any> {
  if (!iyzicoYapilandirildiMi()) {
    throw new Error("iyzico anahtarları yapılandırılmamış (IYZICO_API_KEY/SECRET)");
  }
  const body = JSON.stringify(payload);
  const rnd = randomKey();
  const res = await fetch(BASE_URL + uriPath, {
    method: "POST",
    headers: {
      Authorization: await authHeader(uriPath, body, rnd),
      "x-iyzi-rnd": rnd,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body,
  });
  return await res.json();
}

// ------------------------------------------------------------
// CheckoutForm — ödeme oturumu başlat
// ------------------------------------------------------------
export interface CheckoutBaslatGirdi {
  conversationId: string;      // bizim subscription.id — webhook'ta geri gelir
  fiyat: string;               // "299.00" — iki ondalık
  callbackUrl: string;         // iyzico ödeme bitince buraya POST eder
  paketAd: string;
  paketId: string;
  alici: {
    id: string;
    ad: string;
    soyad: string;
    email: string;
    telefon: string;
    ip: string;
  };
}

export interface CheckoutBaslatSonuc {
  status: string;              // "success" | "failure"
  errorMessage?: string;
  token?: string;
  checkoutFormContent?: string; // gömülebilir HTML/script
  paymentPageUrl?: string;      // hosted ödeme sayfası (WebView'da açılır)
}

export async function checkoutBaslat(g: CheckoutBaslatGirdi): Promise<CheckoutBaslatSonuc> {
  const payload = {
    locale: "tr",
    conversationId: g.conversationId,
    price: g.fiyat,
    paidPrice: g.fiyat,
    currency: "TRY",
    basketId: g.conversationId,
    paymentGroup: "SUBSCRIPTION",
    callbackUrl: g.callbackUrl,
    enabledInstallments: [1],
    buyer: {
      id: g.alici.id,
      name: g.alici.ad,
      surname: g.alici.soyad,
      gsmNumber: g.alici.telefon,
      email: g.alici.email,
      // Sandbox için yer tutucu — KVKK: gerçek kimlik no toplanmaz.
      identityNumber: "11111111111",
      registrationAddress: "Sakarya",
      ip: g.alici.ip,
      city: "Sakarya",
      country: "Turkey",
    },
    billingAddress: {
      contactName: `${g.alici.ad} ${g.alici.soyad}`.trim() || "Müşteri",
      city: "Sakarya",
      country: "Turkey",
      address: "Sakarya",
    },
    basketItems: [
      {
        id: g.paketId,
        name: g.paketAd,
        category1: "Abonelik",
        itemType: "VIRTUAL",
        price: g.fiyat,
      },
    ],
  };
  return await iyziPost("/payment/iyzipos/checkoutform/initialize/auth/ecom", payload);
}

// ------------------------------------------------------------
// CheckoutForm — ödeme sonucunu SUNUCU-SUNUCU sorgula (doğrulama).
// Bu çağrı secret ile imzalandığı için sonucu yalnız biz alabiliriz; sahte bir
// webhook bu sorguyu geçemez → ödeme onayının tek güvenilir kaynağı budur.
// ------------------------------------------------------------
export interface CheckoutSonucResult {
  status: string;          // "success" | "failure"
  paymentStatus?: string;  // "SUCCESS" | "FAILURE" | ...
  conversationId?: string; // bizim subscription.id
  paidPrice?: string;
  paymentId?: string;
  errorMessage?: string;
}

export async function checkoutSonuc(token: string): Promise<CheckoutSonucResult> {
  return await iyziPost("/payment/iyzipos/checkoutform/auth/ecom/detail", {
    locale: "tr",
    token,
  });
}
