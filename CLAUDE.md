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
  Müşteri, şube yöneticisi (çoklu), çalışan ve admin **aynı uygulamada**; ekranlar
  kullanıcının rolüne göre değişir. Roller: `musteri`, `yonetici` (şube başına
  çoklu, tam panel), `calisan` (yalnız randevu + iş), `admin` (merkez).
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

`IMPLEMENTATION.md` **otomatik yüklenmez** (token tasarrufu). Bir faza/göreve
dokunurken yalnızca ilgili bölümünü Read ile aç (örn. ilgili fazın tablo/RLS/
kabul kriteri kısmı). Hangi bölüme bakacağını bilmiyorsan önce
`graphify query` veya dosyadaki başlıkları tara, sonra o aralığı oku.

## graphify (token tasarrufu — scope-first zorunlu)

Bu projede `graphify-out/` altında bilgi grafiği var: god node'lar, community
yapısı, dosyalar arası ilişkiler. **Amaç: projeyi her seferinde baştan okumak
yerine, eldeki görev için yalnızca bağlantılı dosyaları/satırları açmak.**

### Zorunlu iş akışı (her görevde)
1. **Önce grafikten scope çıkar — kod dosyalarını körlemesine OKUMA.** Bir göreve
   başlarken ilk hamle `graphify query "<görev>"`. Çıktı, ilgili düğümleri
   `src=dosya loc=Lsatır` formatında verir.
2. **Sadece dönen düğümlere git.** O dosyaların ilgili satır aralıklarını Read
   ile aç (gerekirse `offset`/`limit` ile). Tüm dosyayı baştan sona okuma.
3. Geniş tarama (grep, dizin gezme, GRAPH_REPORT.md) yalnızca grafik yetersiz
   kaldığında — son çare.

### Komut rehberi
- `graphify query "<soru>"` — bir görev/soru için bağlantılı alt-grafiği getirir
  (genelde GRAPH_REPORT.md veya ham grep'ten çok daha küçük). **İlk reflex bu.**
- `graphify path "<A>" "<B>"` — iki sembol/dosya arasındaki ilişki zinciri.
- `graphify explain "<kavram>"` — tek bir kavrama odaklı alt-grafik.
- `graphify-out/wiki/index.md` varsa, geniş gezinme için ham kaynak yerine bunu kullan.
- `graphify-out/GRAPH_REPORT.md`'yi yalnızca mimari genel bakış için aç.

### Güncel tutma
- Kod değiştirdikten sonra `graphify update .` çalıştır (AST-only, API maliyeti yok).
  Grafik bayatsa scope yanlış çıkar, tasarruf bozulur.
