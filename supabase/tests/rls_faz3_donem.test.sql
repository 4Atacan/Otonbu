-- ============================================================
-- Faz 3 — Adım 3: Dönem yenileme testi (pgTAP)
-- Kapsam: donem_yenile_tum toplu üretim (idempotent, iptal aboneliği atlar) +
--         hak_ile_randevu TEMBEL üretim (cron tetiklenmeden / gelecek aya booking).
-- Çalıştırma: supabase test db
-- ============================================================
begin;

select plan(8);

-- ------------------------------------------------------------
-- Test verisi (RLS bypass: test runner tablo sahibidir)
-- ------------------------------------------------------------
insert into public.branches (id, ad) values
  ('a0000000-0000-0000-0000-0000000000d1'::uuid, 'Şube D');

insert into auth.users (id, email, email_confirmed_at, role, aud) values
  ('c1000000-0000-0000-0000-0000000000d1'::uuid, 'donem-musteri@test.local', now(), 'authenticated', 'authenticated');

insert into public.users (id, branch_id, telefon, rol, ad_soyad) values
  ('c1000000-0000-0000-0000-0000000000d1'::uuid, null, '+905550000088', 'musteri', 'Dönem Müşteri')
on conflict (id) do update set rol = excluded.rol;

insert into public.services (id, ad, kategori, taban_fiyat) values
  ('51000000-0000-0000-0000-0000000000d1'::uuid, 'Dönem Yıkama', 'yikama', 300);

insert into public.vehicles (id, user_id, plaka, segment) values
  ('e1000000-0000-0000-0000-0000000000d1'::uuid, 'c1000000-0000-0000-0000-0000000000d1'::uuid, 'DNM34', 'kucuk');

-- Plan ayda 2 hak verir
insert into public.plans (id, ad, kademe, aylik_ucret) values
  ('d1000000-0000-0000-0000-0000000000d1'::uuid, 'Dönem Paket', 'temel', 299);
insert into public.plan_haklari (plan_id, service_id, aylik_adet) values
  ('d1000000-0000-0000-0000-0000000000d1'::uuid, '51000000-0000-0000-0000-0000000000d1'::uuid, 2);

-- Aktif abonelik
insert into public.subscriptions (id, user_id, branch_id, plan_id, durum) values
  ('5b000000-0000-0000-0000-0000000000d1'::uuid,
   'c1000000-0000-0000-0000-0000000000d1'::uuid,
   'a0000000-0000-0000-0000-0000000000d1'::uuid,
   'd1000000-0000-0000-0000-0000000000d1'::uuid,
   'aktif');

-- ============================================================
-- A) donem_yenile_tum — toplu üretim (owner rolü; istemciye kapalı)
-- ============================================================
select is(
  (select public.donem_yenile_tum('2027-05-01'::date)),
  1, 'donem_yenile_tum aktif abonelik için 1 hak satırı üretir');

select is(
  (select kalan_adet from public.entitlements
   where subscription_id = '5b000000-0000-0000-0000-0000000000d1'::uuid
     and donem = '2027-05-01'::date),
  2, 'Üretilen hak plan şablonundaki adet (2)');

-- İkinci çağrı: devir yok, dokunmaz
select is(
  (select public.donem_yenile_tum('2027-05-01'::date)),
  0, 'donem_yenile_tum idempotent (ikinci çağrı 0 üretir)');

-- ============================================================
-- B) İptal abonelik atlanır
-- ============================================================
update public.subscriptions set durum = 'iptal'
  where id = '5b000000-0000-0000-0000-0000000000d1'::uuid;

select is(
  (select public.donem_yenile_tum('2027-08-01'::date)),
  0, 'İptal abonelik için hak üretilmez');

select is(
  (select count(*)::int from public.entitlements
   where subscription_id = '5b000000-0000-0000-0000-0000000000d1'::uuid
     and donem = '2027-08-01'::date),
  0, 'İptal aboneliğin 2027-08 hakkı yok');

-- Booking testi için aboneliği geri aktifleştir
update public.subscriptions set durum = 'aktif'
  where id = '5b000000-0000-0000-0000-0000000000d1'::uuid;

-- ============================================================
-- C) hak_ile_randevu TEMBEL üretim — dönem önceden üretilmemiş (2027-02)
-- ============================================================
set local role authenticated;
set local "request.jwt.claims" to
  '{"sub":"c1000000-0000-0000-0000-0000000000d1","role":"authenticated","aud":"authenticated"}';

select lives_ok(
  $$select public.hak_ile_randevu(
      'a0000000-0000-0000-0000-0000000000d1'::uuid,
      '51000000-0000-0000-0000-0000000000d1'::uuid,
      'e1000000-0000-0000-0000-0000000000d1'::uuid,
      '2027-02-01 09:00+03'::timestamptz)$$,
  'Hak önceden üretilmemiş döneme randevu (tembel üretim)');

select is(
  (select kalan_adet from public.entitlements
   where subscription_id = '5b000000-0000-0000-0000-0000000000d1'::uuid
     and donem = '2027-02-01'::date),
  1, 'Tembel üretilen hak (2) düşüldü → 1');

select is(
  (select count(*)::int from public.appointments
   where user_id = 'c1000000-0000-0000-0000-0000000000d1'::uuid
     and durum = 'beklemede'),
  1, 'Tembel hakla randevu onay bekler (beklemede)');

select * from finish();
rollback;
