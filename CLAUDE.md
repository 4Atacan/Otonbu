# OTONBU GARAGE — Proje Talimatları

> Bu dosya Claude Code tarafından her oturum başında okunur. Projenin değişmez
> kurallarını ve mimari kararlarını içerir. Adım adım uygulama planı için
> `@IMPLEMENTATION.md` dosyasına bak.

## Ürün özeti

OTONBU GARAGE, Sakarya genelinde **franchise** modeliyle çalışan araç koruma ve
bakım hizmetleri için bir mobil uygulamadır. Birbirinden bağımsız şubeler vardır:
her şube kendi cirosu, personeli, stoğu ve müşteri ilişkisiyle ayrı bir işletme
gibi yönetilir. OTONBU merkezi (admin) katalog, fiyat politikası ve teknik bakım
üzerinden marka bütünlüğünü korur.

Tek geliştirici tarafından geliştirilmektedir. Öncelik: **hız ve düşük maliyetle
çalışan bir MVP.**

## Teknoloji yığını

- **Mobil:** React Native + Expo (TypeScript). Tek kod tabanı, iOS + Android.
  Müşteri, şube yöneticisi, kasa/usta ve admin **aynı uygulamada**; ekranlar
  kullanıcının rolüne göre değişir.
- **Backend:** Supabase — PostgreSQL, Auth (e-posta + şifre, e-posta doğrulama
  linkli), Storage, Realtime, Edge Functions. Ayrı bir sunucu kodu yazılmaz;
  sunucu mantığı Edge Functions'ta.
- **Ödeme:** iyzico — hosted CheckoutForm + webhook. Tekrarlayan abonelik tahsilatı.
- **E-posta:** Supabase Auth SMTP üzerinden Resend/Brevo (ücretsiz tier).
  Doğrulama linki, şifre sıfırlama, bildirim ve ticari iletide aynı kanal.
- **Telefon login:** Telefon doğrulamadan kayıt — `telefon_to_email` RPC ile
  login formunda telefon → email lookup → şifre ile giriş.
- **CAPTCHA:** Cloudflare Turnstile — OTP isteğinin önüne konur (suistimal engeli).
- **Push:** Expo Notifications.
- **Hata izleme:** Sentry (hem uygulama hem Edge Functions).
- **Dil:** Her yerde TypeScript. SQL Supabase migration dosyalarında.

## Mutlak kurallar (asla ihlal etme)

1. **Gizli anahtar asla istemcide olmaz.** Mobil uygulama derlenince içi okunabilir.
   Uygulamaya yalnızca Supabase `anon key`, Turnstile **site key**'i ve
   kullanıcının kendi oturum token'ı konur. iyzico gizli anahtarı, SMTP şifresi,
   Turnstile **secret**'i ve Supabase `service_role` anahtarı YALNIZCA Edge
   Functions / Supabase paneli ortam değişkenlerinde durur. Bunları koda gömme,
   repoya commit etme, `.env` dosyasını `.gitignore`'a ekle.

2. **İstemciden gelen veriye güvenme.** Fiyat, abonelik hakkı ve ödeme tutarı
   istemcide hesaplanmaz; sunucu (Edge Function) veritabanından kendisi hesaplar.
   İstemci yalnızca "şu hizmeti, şu araca, şu slotta istiyorum" der.

3. **Franchise izolasyonu RLS ile zorlanır.** Her operasyonel tablo `branch_id`
   taşır. Row Level Security politikası, kullanıcıyı kendi şubesine kilitler;
   yalnızca admin tüm şubeleri görür. Yeni eklenen her tabloda RLS aktif edilir
   ve politika yazılır — RLS'siz tablo canlıya çıkmaz.

4. **`service_role` anahtarı RLS'i atlar.** Yalnızca Edge Functions içinde,
   yalnızca gerçekten gereken yerde (hak düşürme, ödeme/abonelik yazımı) kullan.
   Genel sorgularda asla kullanma.

5. **Ödemede kart verisi sisteme hiç girmez.** iyzico hosted CheckoutForm kullan.
   Kart bilgisini kendi formunda toplama (PCI-DSS yükünden kaçınmak için).
   Ödeme başarısına **istemcinin "oldu" demesiyle değil**, iyzico'dan gelen
   **webhook'un imzasını doğrulayarak** karar ver.

6. **Storage private kalır.** Önce/sonra fotoğrafları public bucket'ta tutulmaz.
   Erişim gerektiğinde kısa ömürlü **signed URL** üret. Bucket'a RLS politikası,
   yükleme için sunucu tarafı tip (jpg/png) ve boyut (max 5MB) sınırı koy.

## KVKK kararları (şemaya gömülü, baştan uygulanır)

- **Rıza kaydı:** `consents` tablosu tut. Kim, neye (aydınlatma metni versiyonu,
  açık rıza, ticari ileti izni), ne zaman rıza verdi. Ticari ileti (kampanya)
  izni, uygulama kullanım rızasından **ayrı** tutulur.
- **Silme hakkı = soft delete + anonimleştirme.** Kullanıcı/ödeme/abonelik
  kayıtlarında hard delete YAPMA. `silindi_mi boolean` kullan. Kullanıcı silme
  talep edince kişisel alanları (ad, e-posta, telefon, plaka) anonimleştir;
  ödeme kaydının kişiye bağlanamayan hali muhasebe için kalır.
- **Veri yeri:** Supabase projesi AB bölgesinde (örn. Frankfurt) kurulur.
  Bölge sonradan değiştirilemez — baştan doğru seç.
- Kişisel veri içeren alanlar (e-posta, telefon, plaka, ad) kod içinde yorumla
  işaretlenir.

## Kod ve çalışma konvansiyonları

- Veritabanı değişiklikleri her zaman Supabase migration dosyası olarak yazılır
  (`supabase/migrations/`), doğrudan panelden elle değil.
- Tablo ve kolon adları Türkçe-snake_case (şemada tanımlandığı gibi): `branches`,
  `branch_id`, `kalan_adet`. Mevcut şemaya sadık kal.
- Edge Function girdileri şema doğrulamasından geçer (Zod). Beklenmeyen/eksik
  alanı reddet.
- Bir özelliği tamamlamadan önce `IMPLEMENTATION.md`'deki ilgili görevin
  **kabul kriterlerini** kontrol et.
- Faz sırasını atlama: `IMPLEMENTATION.md`'deki Faz 1 → 4 sırasını izle.

## Yapı

- `@IMPLEMENTATION.md` — faz faz görevler, SQL şemaları, RLS politikaları,
  güvenlik ve KVKK görevleri, kabul kriterleri.

## Bağlam dosyaları

@IMPLEMENTATION.md

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
