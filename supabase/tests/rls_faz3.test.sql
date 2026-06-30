-- ============================================================
-- Faz 3 RLS + işlev testleri (pgTAP) — abonelik veri motoru
-- Kapsam: plans, subscriptions, entitlements, entitlement_usage, payments
--         + hak_ile_randevu (atomik tüketim), hak_iade (iptal iadesi),
--           donem_yenile_tum (dönem üretimi)
-- Çalıştırma: supabase test db
-- ============================================================
begin;

select plan(23);

-- ------------------------------------------------------------
-- Test verisi (RLS bypass: test runner tablo sahibidir)
-- ------------------------------------------------------------
insert into public.branches (id, ad) values
  ('a0000000-0000-0000-0000-000000000001'::uuid, 'Şube A'),
  ('b0000000-0000-0000-0000-000000000002'::uuid, 'Şube B');

insert into auth.users (id, email, email_confirmed_at, role, aud) values
  ('a1000000-0000-0000-0000-000000000001'::uuid, 'sahibi-a@test.local', now(), 'authenticated', 'authenticated'),
  ('c1000000-0000-0000-0000-000000000003'::uuid, 'musteri@test.local',  now(), 'authenticated', 'authenticated'),
  ('c2000000-0000-0000-0000-000000000004'::uuid, 'musteri2@test.local', now(), 'authenticated', 'authenticated'),
  ('ad000000-0000-0000-0000-000000000099'::uuid, 'admin@test.local',    now(), 'authenticated', 'authenticated');

insert into public.users (id, branch_id, email, rol) values
  ('a1000000-0000-0000-0000-000000000001'::uuid, 'a0000000-0000-0000-0000-000000000001'::uuid, 'sahibi-a@test.local', 'yonetici'),
  ('c1000000-0000-0000-0000-000000000003'::uuid, null, 'musteri@test.local',  'musteri'),
  ('c2000000-0000-0000-0000-000000000004'::uuid, null, 'musteri2@test.local', 'musteri'),
  ('ad000000-0000-0000-0000-000000000099'::uuid, null, 'admin@test.local',    'admin')
on conflict (id) do update
  set branch_id = excluded.branch_id, rol = excluded.rol, email = excluded.email;

insert into public.services (id, ad, kategori, taban_fiyat) values
  ('51000000-0000-0000-0000-000000000001'::uuid, 'Oto Yıkama', 'yikama', 300);

insert into public.vehicles (id, user_id, plaka, segment) values
  ('e1000000-0000-0000-0000-000000000001'::uuid, 'c1000000-0000-0000-0000-000000000003'::uuid, 'TEST34', 'kucuk');

-- Plan + hak şablonu: plan ayda 2 oto yıkama hakkı verir
insert into public.plans (id, ad, kademe, aylik_ucret) values
  ('d1000000-0000-0000-0000-000000000001'::uuid, 'Test Paket', 'temel', 299);
insert into public.plan_haklari (plan_id, service_id, aylik_adet) values
  ('d1000000-0000-0000-0000-000000000001'::uuid, '51000000-0000-0000-0000-000000000001'::uuid, 2);

-- Müşterinin Şube A'da aktif aboneliği (varsayılan 'beklemede' — açıkça aktif)
insert into public.subscriptions (id, user_id, branch_id, plan_id, durum) values
  ('5b000000-0000-0000-0000-000000000001'::uuid,
   'c1000000-0000-0000-0000-000000000003'::uuid,
   'a0000000-0000-0000-0000-000000000001'::uuid,
   'd1000000-0000-0000-0000-000000000001'::uuid,
   'aktif');

-- 2027-01 dönemi haklarını üret (booking bu dönemde yapılacak)
select public.donem_haklari_uret(
  '5b000000-0000-0000-0000-000000000001'::uuid, '2027-01-01'::date);

-- Bir ödeme kaydı (görünürlük testi için)
insert into public.payments (id, subscription_id, user_id, tutar, saglayici_ref) values
  ('9a000000-0000-0000-0000-000000000001'::uuid,
   '5b000000-0000-0000-0000-000000000001'::uuid,
   'c1000000-0000-0000-0000-000000000003'::uuid, 299, 'iyz-test-1');

-- ============================================================
-- Müşteri: kendi verisini görür, yazamaz, hakkıyla randevu alır
-- ============================================================
set local role authenticated;
set local "request.jwt.claims" to
  '{"sub":"c1000000-0000-0000-0000-000000000003","role":"authenticated","aud":"authenticated"}';

select ok((select count(*) from public.plans) >= 1, 'Müşteri paketleri görür');

select is((select count(*)::int from public.subscriptions), 1,
  'Müşteri kendi aboneliğini görür');
select is((select count(*)::int from public.entitlements), 1,
  'Müşteri kendi hakkını görür');
select is((select count(*)::int from public.payments), 1,
  'Müşteri kendi ödemesini görür');

select throws_ok(
  $$insert into public.subscriptions (user_id, branch_id, plan_id)
    values ('c1000000-0000-0000-0000-000000000003'::uuid,
            'a0000000-0000-0000-0000-000000000001'::uuid,
            'd1000000-0000-0000-0000-000000000001'::uuid)$$,
  '42501', null, 'Müşteri abonelik yazamaz');
select throws_ok(
  $$insert into public.entitlements (subscription_id, service_id, kalan_adet, donem)
    values ('5b000000-0000-0000-0000-000000000001'::uuid,
            '51000000-0000-0000-0000-000000000001'::uuid, 5, '2099-01-01')$$,
  '42501', null, 'Müşteri hak yazamaz');
select throws_ok(
  $$insert into public.payments (user_id, tutar)
    values ('c1000000-0000-0000-0000-000000000003'::uuid, 1)$$,
  '42501', null, 'Müşteri ödeme yazamaz');

-- Hak başka şubede geçerli değil (Şube B'de abonelik yok)
select throws_ok(
  $$select public.hak_ile_randevu(
      'b0000000-0000-0000-0000-000000000002'::uuid,
      '51000000-0000-0000-0000-000000000001'::uuid,
      'e1000000-0000-0000-0000-000000000001'::uuid,
      '2027-01-04 09:00+03'::timestamptz)$$,
  'P0001', null, 'Abonelik olmayan şubede hakla randevu alınamaz');

-- Hakla randevu (Şube A) — atomik tüketim
select lives_ok(
  $$select public.hak_ile_randevu(
      'a0000000-0000-0000-0000-000000000001'::uuid,
      '51000000-0000-0000-0000-000000000001'::uuid,
      'e1000000-0000-0000-0000-000000000001'::uuid,
      '2027-01-04 09:00+03'::timestamptz)$$,
  'Müşteri hakkıyla randevu alır');

select is(
  (select kalan_adet from public.entitlements
   where subscription_id = '5b000000-0000-0000-0000-000000000001'::uuid
     and service_id = '51000000-0000-0000-0000-000000000001'::uuid
     and donem = '2027-01-01'::date),
  1, 'Hak tüketildi (2 → 1)');

select is((select count(*)::int from public.entitlement_usage), 1,
  'Hak kullanım kaydı oluştu');

select is(
  (select count(*)::int from public.appointments where durum = 'beklemede'),
  1, 'Hakla alınan randevu onay bekler (beklemede)');

-- İptal → hak iadesi (trigger)
select lives_ok(
  $$update public.appointments set durum = 'iptal'
    where user_id = 'c1000000-0000-0000-0000-000000000003'::uuid
      and durum = 'beklemede'$$,
  'Müşteri hakla aldığı randevuyu iptal eder');

select is(
  (select kalan_adet from public.entitlements
   where subscription_id = '5b000000-0000-0000-0000-000000000001'::uuid
     and service_id = '51000000-0000-0000-0000-000000000001'::uuid
     and donem = '2027-01-01'::date),
  2, 'İptal hakkı iade etti (1 → 2)');

select is(
  (select count(*)::int from public.entitlement_usage where iade_edildi = true),
  1, 'Hak kullanımı iade edildi olarak işaretlendi');

-- ============================================================
-- Şube A sahibi: aboneliği/hakkı görür, ödeme detayını görmez
-- ============================================================
reset role;
set local role authenticated;
set local "request.jwt.claims" to
  '{"sub":"a1000000-0000-0000-0000-000000000001","role":"authenticated","aud":"authenticated"}';

select is((select count(*)::int from public.subscriptions), 1,
  'Şube A sahibi şubesinin aboneliğini görür');
select is((select count(*)::int from public.entitlements), 1,
  'Şube A sahibi şubesinin hakkını görür');
select is((select count(*)::int from public.payments), 0,
  'Şube A sahibi ödeme detayını görmez');

-- ============================================================
-- Başka müşteri: hiçbir şey görmez (izolasyon)
-- ============================================================
reset role;
set local role authenticated;
set local "request.jwt.claims" to
  '{"sub":"c2000000-0000-0000-0000-000000000004","role":"authenticated","aud":"authenticated"}';

select is((select count(*)::int from public.subscriptions), 0,
  'Başka müşteri aboneliği görmez');
select is((select count(*)::int from public.entitlements), 0,
  'Başka müşteri hakkı görmez');
select is((select count(*)::int from public.payments), 0,
  'Başka müşteri ödemeyi görmez');

-- ============================================================
-- Admin: her şeyi görür
-- ============================================================
reset role;
set local role authenticated;
set local "request.jwt.claims" to
  '{"sub":"ad000000-0000-0000-0000-000000000099","role":"authenticated","aud":"authenticated"}';

select is((select count(*)::int from public.subscriptions), 1,
  'Admin aboneliği görür');
select is((select count(*)::int from public.payments), 1,
  'Admin ödemeyi görür');

select * from finish();
rollback;
