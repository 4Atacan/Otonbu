# OTONBU GARAGE — Uygulama Planı

> Bu dosya, projenin faz faz nasıl inşa edileceğini tanımlar. Her görev
> kontrol edilebilir bir kabul kriteriyle gelir. Kurallar için `@CLAUDE.md`.
> Fazlar sırayla yapılır; bir faz bitmeden sonrakine geçme.

## Çalışma sırası (özet)

| Faz | Kapsam | Sonuç |
|-----|--------|-------|
| 0 | Proje kurulumu | Boş ama çalışan iskelet |
| 1 | Temel iskelet + RLS | Giriş, araç, katalog görülür |
| 2 | Randevu akışı | Slot seç, randevu al, durum takip — **yayınlanabilir MVP** |
| 3 | Abonelik + ödeme | Paket al, hak ile randevu, tahsilat |
| 4 | Zenginleştirme + KVKK tamamlama | Puan, stok, rıza, soft delete |

Faz 2 sonunu gerçek bir pilot sürüm olarak hedefle.

---

## Faz 0 — Proje kurulumu

### Görevler

- [ ] Expo uygulaması oluştur (TypeScript şablonu).
- [ ] Supabase projesi kur — **bölge: AB (Frankfurt)**. (KVKK kararı, sonradan değişmez.)
- [ ] `supabase` CLI'yi projeye bağla, `supabase/migrations/` dizinini oluştur.
- [ ] `.env` dosyasını `.gitignore`'a ekle. İstemciye yalnızca `SUPABASE_URL` ve
      `SUPABASE_ANON_KEY` konur. Gizli anahtarlar buraya GİRMEZ.
- [ ] `expo-secure-store` ekle; oturum token'ı burada saklanacak (AsyncStorage'da değil).
- [ ] Sentry'yi hem uygulamaya hem Edge Functions'a bağla.

### Ortam değişkenleri yerleşimi (kritik)

| Anahtar | Nerede | Not |
|---------|--------|-----|
| `SUPABASE_ANON_KEY` | İstemci | Açık anahtar, RLS arkasında güvenli |
| `IYZICO_SECRET` | Edge Function env | Asla istemcide |
| `SMS_API_KEY` | Edge Function env | Asla istemcide |
| `SUPABASE_SERVICE_ROLE` | Edge Function env | RLS'i atlar, sadece gereken yerde |

### Kabul kriteri
Uygulama açılıyor, Supabase'e bağlanıyor, Sentry test hatası panelde görünüyor.
`git grep` ile repoda hiçbir gizli anahtar bulunmuyor.

---

## Faz 1 — Temel iskelet

Diğer her şey bu tablolara bağlanır. RLS bu fazda kurulur; ertelenmez.

### Ortak yardımcılar (önce bunlar)

```sql
-- Giriş yapan kullanıcının rolünü döndürür
create or replace function auth_role()
returns text language sql stable as $$
  select rol from public.users where id = auth.uid()
$$;

-- Giriş yapan kullanıcının şube kimliğini döndürür
create or replace function auth_branch()
returns uuid language sql stable as $$
  select branch_id from public.users where id = auth.uid()
$$;
```

### Tablolar

```sql
create table branches (
  id      uuid primary key default gen_random_uuid(),
  ad      text not null,
  adres   text,
  aktif   boolean not null default true,
  created_at timestamptz not null default now()
);

create table users (
  id         uuid primary key references auth.users(id),
  branch_id  uuid references branches(id),
  telefon    text unique not null,            -- KİŞİSEL VERİ
  rol        text not null default 'musteri'
             check (rol in ('musteri','sube_sahibi','kasa','usta','admin')),
  ad_soyad   text,                            -- KİŞİSEL VERİ
  silindi_mi boolean not null default false,  -- KVKK soft delete
  created_at timestamptz not null default now()
);

create table services (
  id            uuid primary key default gen_random_uuid(),
  ad            text not null,
  kategori      text not null,
  taban_fiyat   numeric(10,2) not null,
  oynama_orani  numeric(4,3) not null default 0.05,  -- ±%5 yerel sapma sınırı
  aktif         boolean not null default true
);

create table vehicles (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references users(id) on delete cascade,
  plaka        text not null,                  -- KİŞİSEL VERİ
  marka_model  text,
  segment      text not null default 'standart'
);
create index on vehicles (user_id);
```

### RLS politikaları

```sql
alter table branches enable row level security;
alter table users    enable row level security;
alter table services enable row level security;
alter table vehicles enable row level security;

-- Şubeler: herkes okur (katalog/fiyat için), sadece admin yazar
create policy branches_select on branches for select using (true);
create policy branches_admin  on branches for all    using (auth_role() = 'admin');

-- Kullanıcılar: kendini görür; personel kendi şubesini; admin hepsini
create policy users_self on users for select using (
  id = auth.uid()
  or auth_role() = 'admin'
  or (auth_role() in ('sube_sahibi','kasa') and branch_id = auth_branch())
);
create policy users_update_self on users for update using (id = auth.uid());

-- Hizmet kataloğu: herkes okur, sadece admin değiştirir
create policy services_select on services for select using (true);
create policy services_admin  on services for all    using (auth_role() = 'admin');

-- Araçlar: sadece sahibi (ve admin)
create policy vehicles_owner on vehicles for all
  using (user_id = auth.uid() or auth_role() = 'admin');
```

### Auth görevleri (SMS suistimaline karşı)

- [ ] Supabase Auth'u telefon + SMS OTP olarak yapılandır, SMS sağlayıcıyı bağla.
- [ ] Rate limiting: aynı numara/IP için OTP isteme sıklığını sınırla (örn. dakikada 1).
- [ ] CAPTCHA (hCaptcha/Turnstile) OTP isteğinin önüne konur.
- [ ] SMS sağlayıcı panelinde günlük harcama limiti tanımla.
- [ ] OTP kısa ömürlü (60–120 sn), birkaç yanlış denemede geçersizleşir.
- [ ] Oturum: kısa ömürlü access token + refresh; token `expo-secure-store`'da.

### Kabul kriteri
Telefonla giriş yapılıyor, araç ekleniyor, katalog fiyatlarıyla görülüyor.
**RLS testi:** Şube A kullanıcısı, Şube B'nin kullanıcı/araç verisini sorgulayınca
boş döner. Admin tümünü görür. Bu test otomatik script olarak yazılır.

---

## Faz 2 — Randevu akışı (yayınlanabilir MVP)

### Tablolar

```sql
create table time_slots (
  id         uuid primary key default gen_random_uuid(),
  branch_id  uuid not null references branches(id) on delete cascade,
  baslangic  timestamptz not null,
  kapasite   int not null default 1
);
create index on time_slots (branch_id, baslangic);

create table branch_prices (
  id          uuid primary key default gen_random_uuid(),
  branch_id   uuid not null references branches(id) on delete cascade,
  service_id  uuid not null references services(id) on delete cascade,
  segment     text not null,
  fiyat       numeric(10,2) not null,
  unique (branch_id, service_id, segment)
);

create table appointments (
  id          uuid primary key default gen_random_uuid(),
  branch_id   uuid not null references branches(id),
  user_id     uuid not null references users(id),
  vehicle_id  uuid not null references vehicles(id),
  service_id  uuid not null references services(id),
  slot_id     uuid references time_slots(id),
  durum       text not null default 'onayli'
              check (durum in ('beklemede','onayli','iptal')),
  created_at  timestamptz not null default now()
);
create index on appointments (branch_id, created_at);

create table jobs (
  id              uuid primary key default gen_random_uuid(),
  appointment_id  uuid not null references appointments(id) on delete cascade,
  assigned_to     uuid references users(id),
  durum           text not null default 'basladi'
                  check (durum in ('basladi','tamamlandi','hazir'))
);

create table job_photos (
  id      uuid primary key default gen_random_uuid(),
  job_id  uuid not null references jobs(id) on delete cascade,
  tip     text not null check (tip in ('once','sonra')),
  url     text not null
);
```

### RLS politikaları

```sql
alter table time_slots    enable row level security;
alter table branch_prices enable row level security;
alter table appointments  enable row level security;
alter table jobs          enable row level security;
alter table job_photos    enable row level security;

create policy slots_select on time_slots for select using (true);
create policy slots_manage on time_slots for all using (
  auth_role() = 'admin'
  or (auth_role() = 'sube_sahibi' and branch_id = auth_branch())
);

create policy prices_select on branch_prices for select using (true);
create policy prices_manage on branch_prices for all using (
  auth_role() = 'admin'
  or (auth_role() = 'sube_sahibi' and branch_id = auth_branch())
);

create policy appt_customer on appointments for select using (
  user_id = auth.uid() or auth_role() = 'admin' or branch_id = auth_branch()
);
create policy appt_create on appointments for insert with check (user_id = auth.uid());
create policy appt_branch_manage on appointments for update using (
  auth_role() = 'admin' or branch_id = auth_branch()
);

create policy jobs_branch on jobs for all using (
  auth_role() = 'admin'
  or assigned_to = auth.uid()
  or exists (
    select 1 from appointments a
    where a.id = jobs.appointment_id and a.branch_id = auth_branch()
  )
);

create policy job_photos_access on job_photos for all using (
  auth_role() = 'admin'
  or exists (
    select 1 from jobs j join appointments a on a.id = j.appointment_id
    where j.id = job_photos.job_id
      and (a.user_id = auth.uid() or a.branch_id = auth_branch())
  )
);
```

### Storage görevleri (önce/sonra foto)

- [ ] `job-photos` adında **private** bucket oluştur (public DEĞİL).
- [ ] Bucket'ta sunucu tarafı sınır: `allowed_mime_types = image/jpeg,image/png`,
      `file_size_limit = 5MB`.
- [ ] Bucket RLS: bir fotoğrafa yalnızca ilgili işin müşterisi ve o şubenin
      personeli erişebilir.
- [ ] Görüntüleme her zaman kısa ömürlü **signed URL** ile yapılır.

### Fiyat hesabı (Edge Function — `fiyat-hesapla`)

- [ ] Girdi: service_id, vehicle_id (segment buradan), branch_id. Zod ile doğrula.
- [ ] Sunucu, `branch_prices`'tan yerel fiyatı okur; yoksa `services.taban_fiyat`.
- [ ] Yerel fiyatın `taban_fiyat ± oynama_orani` aralığında olduğunu doğrula.
- [ ] İstemciye sadece hesaplanmış fiyatı döndür. İstemci fiyat göndermez.

### Kabul kriteri
Müşteri slot seçip randevu alıyor (otomatik onaylı — sadece tanımlı slotlar görünür).
Usta işi alıyor, durumu `basladi → tamamlandi → hazir` güncelliyor, foto yüklüyor.
Müşteri durumu ve fotoğrafı görüyor. Fotoğraf linkleri signed URL, süre dolunca ölüyor.
**RLS testi** yeni tabloların hepsinde tekrarlanır.

---

## Faz 3 — Abonelik + ödeme

En karmaşık faz. Edge Functions ağırlıklı. Faz 2 sağlam çalışmadan başlama.

### Tablolar

```sql
create table plans (
  id           uuid primary key default gen_random_uuid(),
  ad           text not null,
  kademe       text not null check (kademe in ('temel','orta','ust')),
  aylik_ucret  numeric(10,2) not null,
  aktif        boolean not null default true
);

create table subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id),
  branch_id   uuid not null references branches(id),  -- hak sadece bu şubede
  plan_id     uuid not null references plans(id),
  durum       text not null default 'aktif'
              check (durum in ('aktif','yenilenen','iptal')),
  baslangic   date not null default current_date,
  silindi_mi  boolean not null default false,
  created_at  timestamptz not null default now()
);
create index on subscriptions (user_id);

create table entitlements (
  id               uuid primary key default gen_random_uuid(),
  subscription_id  uuid not null references subscriptions(id) on delete cascade,
  hak_tipi         text not null,
  kalan_adet       int not null,
  donem            date not null,                      -- aylık; devir yok
  unique (subscription_id, hak_tipi, donem)
);
create index on entitlements (subscription_id, donem);

create table payments (
  id               uuid primary key default gen_random_uuid(),
  subscription_id  uuid references subscriptions(id),
  user_id          uuid not null references users(id),
  tutar            numeric(10,2) not null,
  saglayici_ref    text,                                -- iyzico referansı
  silindi_mi       boolean not null default false,
  created_at       timestamptz not null default now()
);
```

### RLS politikaları

```sql
alter table plans         enable row level security;
alter table subscriptions enable row level security;
alter table entitlements  enable row level security;
alter table payments      enable row level security;

create policy plans_select on plans for select using (true);
create policy plans_admin  on plans for all    using (auth_role() = 'admin');

create policy subs_access on subscriptions for select using (
  user_id = auth.uid() or auth_role() = 'admin' or branch_id = auth_branch()
);

create policy ent_access on entitlements for select using (
  auth_role() = 'admin'
  or exists (
    select 1 from subscriptions s
    where s.id = entitlements.subscription_id
      and (s.user_id = auth.uid() or s.branch_id = auth_branch())
  )
);

create policy pay_access on payments for select using (
  user_id = auth.uid() or auth_role() = 'admin'
);
```

> `entitlements` ve `payments` için **yalnızca okuma** politikası var. Yazma
> işlemleri (hak düşürme, tahsilat kaydı) Edge Functions'tan `service_role` ile
> yapılır — istemci bunlara yazamaz.

### iyzico ödeme akışı (Edge Functions)

- [ ] `abonelik-baslat`: istemci paket id'si yollar. Fonksiyon `IYZICO_SECRET` ile
      iyzico CheckoutForm oturumu başlatır, ödeme sayfası/token'ı istemciye döner.
      Kart bilgisi istemcide TOPLANMAZ — müşteri iyzico'nun sayfasına girer.
- [ ] `iyzico-webhook`: iyzico'dan gelen tahsilat sonucunu alır.
      **Önce imzayı doğrula** (gizli anahtarla hesaplanan imza eşleşmiyorsa reddet).
      Ancak doğrulandıktan sonra `payments` yaz ve `subscriptions.durum` güncelle.
      Ödeme başarısına istemcinin sözüne göre ASLA karar verme.

### Abonelik mantığı (Edge Functions)

- [ ] `donem-yenile` (zamanlanmış, ay başı): aktif aboneliklere yeni dönemin
      `entitlements` satırlarını üretir. Önceki dönem hakkı **devretmez**.
- [ ] `hak-ile-randevu`: randevu alınırken ilgili `entitlements.kalan_adet`
      kontrol edilir ve **atomik** olarak düşürülür (yarış koşulu olmadan).
      Hak hesaba bağlı: çoklu araçta kullanılabilir, ama sadece aboneliğin şubesinde.

### Kabul kriteri
Müşteri paket alıyor; kart bilgisi yalnızca iyzico sayfasına giriliyor.
Tahsilat sonucu webhook ile geliyor, imza doğrulanıyor, sahte webhook reddediliyor.
Hak ile randevu alınınca sayaç düşüyor; ay başında yeni haklar üretiliyor, eski
haklar sıfırlanıyor. Hak yalnızca satın alınan şubede kullanılabiliyor.

---

## Faz 4 — Zenginleştirme + KVKK tamamlama

### Tablolar

```sql
create table loyalty_ledger (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references users(id),
  puan_degisim  int not null,                 -- kazanım (+) / harcama (-)
  sebep         text not null,
  created_at    timestamptz not null default now()
);
create index on loyalty_ledger (user_id);

create table stock_items (
  id         uuid primary key default gen_random_uuid(),
  branch_id  uuid not null references branches(id) on delete cascade,
  ad         text not null,
  tip        text not null check (tip in ('perakende','sarf')),
  miktar     int not null default 0,
  min_esik   int not null default 0
);
create index on stock_items (branch_id);

-- KVKK rıza kaydı
create table consents (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references users(id),
  tip           text not null,        -- aydinlatma / acik_riza / ticari_ileti
  metin_versiyon text not null,       -- hangi metne rıza verildi
  verildi_mi    boolean not null,
  created_at    timestamptz not null default now()
);
create index on consents (user_id);
```

### RLS politikaları

```sql
alter table loyalty_ledger enable row level security;
alter table stock_items    enable row level security;
alter table consents       enable row level security;

create policy loyalty_self on loyalty_ledger for select
  using (user_id = auth.uid() or auth_role() = 'admin');

create policy stock_branch on stock_items for all using (
  auth_role() = 'admin'
  or (auth_role() in ('sube_sahibi','kasa') and branch_id = auth_branch())
);

create policy consents_self on consents for all
  using (user_id = auth.uid() or auth_role() = 'admin');
```

### KVKK görevleri

- [ ] Kayıt akışında rıza alınır; `consents`'a satır yazılır. Ticari ileti izni
      **ayrı** onay kutusu (uygulama kullanımıyla birleştirilmez).
- [ ] "Verilerimi sil" akışı: hard delete YOK. Kişisel alanları (ad, telefon, plaka)
      anonimleştir, `silindi_mi = true` yap. Ödeme/abonelik kaydı kişiye bağlanamaz
      halde kalır (muhasebe zorunluluğu).
- [ ] Düşük stok: `miktar < min_esik` olduğunda yönetici paneline uyarı.
- [ ] Puan: abonelik dışı tamamlanan işlemde `loyalty_ledger`'a kazanım satırı
      (Edge Function ile, service_role).

### Kabul kriteri
Kayıtta rıza kaydı oluşuyor, ticari ileti izni ayrı. Silme talebi kişisel veriyi
anonimleştiriyor ama muhasebe kaydını koruyor. Puan ve stok uyarısı çalışıyor.

---

## Operasyon (tüm fazlar boyunca)

- [ ] Migration'lar her zaman `supabase/migrations/` altında; panelden elle değişiklik yok.
- [ ] Build/dağıtım: `eas build` (iOS+Android), `eas submit` (mağaza),
      `eas update` (OTA küçük güncellemeler). Edge Functions: `supabase functions deploy`.
- [ ] Sentry hataları düzenli kontrol edilir.
- [ ] Yedek: Supabase otomatik yedek sıklığı/saklama süresi kontrol edilir; gerçek
      müşteri verisiyle ücretli plana geçilir. Geri dönme arada bir test edilir.

## Tekrarlayan kontrol — her yeni tablo için

1. `enable row level security` yapıldı mı?
2. Politika yazıldı ve "yanlış şube yanlış veriyi görebiliyor mu?" testi geçti mi?
3. Kişisel veri içeren alan varsa işaretlendi ve soft delete mantığına dahil mi?
4. Yazma işlemi `service_role` gerektiriyorsa Edge Function'da mı, istemcide değil mi?
