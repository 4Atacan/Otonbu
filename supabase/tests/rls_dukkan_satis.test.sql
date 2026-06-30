-- ============================================================
-- Dükkanda satış + şubede ödeme alındı testleri (pgTAP)
-- Kapsam (migration 20260630000004_dukkanda_satis):
--   * calisan/yonetici dukkan_satis ile satış yazar → stok atomik düşer,
--     order kaynak='dukkan'; çalışan kendi şubesinin dükkan satışını GÖRÜR.
--   * randevu_odeme_al → appointments.odeme_alindi true (personel tahsilatı).
--   * stok yetersizse / başka şube / müşteri → yetkisiz/hata (red).
-- Çalıştırma: supabase test db
-- ============================================================
begin;

select plan(10);

-- ------------------------------------------------------------
-- Test verisi (RLS bypass: test runner tablo sahibidir)
-- ------------------------------------------------------------
insert into public.branches (id, ad) values
  ('a0000000-0000-0000-0000-0000000000a1'::uuid, 'Şube A'),
  ('b0000000-0000-0000-0000-0000000000b1'::uuid, 'Şube B');

insert into auth.users (id, email, email_confirmed_at, role, aud) values
  ('c5000000-0000-0000-0000-0000000000a1'::uuid, 'calisan-a@test.local', now(), 'authenticated', 'authenticated'),
  ('c5000000-0000-0000-0000-0000000000b1'::uuid, 'calisan-b@test.local', now(), 'authenticated', 'authenticated'),
  ('c1000000-0000-0000-0000-0000000000a1'::uuid, 'musteri@test.local',   now(), 'authenticated', 'authenticated');

insert into public.users (id, branch_id, email, rol) values
  ('c5000000-0000-0000-0000-0000000000a1'::uuid, 'a0000000-0000-0000-0000-0000000000a1'::uuid, 'calisan-a@test.local', 'calisan'),
  ('c5000000-0000-0000-0000-0000000000b1'::uuid, 'b0000000-0000-0000-0000-0000000000b1'::uuid, 'calisan-b@test.local', 'calisan'),
  ('c1000000-0000-0000-0000-0000000000a1'::uuid, null, 'musteri@test.local', 'musteri')
on conflict (id) do update
  set branch_id = excluded.branch_id, rol = excluded.rol, email = excluded.email;

insert into public.services (id, ad, kategori, taban_fiyat) values
  ('51000000-0000-0000-0000-0000000000a1'::uuid, 'Oto Yıkama', 'yikama', 300);

insert into public.vehicles (id, user_id, plaka, segment) values
  ('e1000000-0000-0000-0000-0000000000a1'::uuid, 'c1000000-0000-0000-0000-0000000000a1'::uuid, 'TEST34', 'kucuk');

-- Müşterinin Şube A randevusu (şubede ödeme — tahsilat testi)
insert into public.appointments (id, branch_id, user_id, vehicle_id, service_id, baslangic, durum, odeme_yontemi) values
  ('90000000-0000-0000-0000-0000000000a1'::uuid,
   'a0000000-0000-0000-0000-0000000000a1'::uuid,
   'c1000000-0000-0000-0000-0000000000a1'::uuid,
   'e1000000-0000-0000-0000-0000000000a1'::uuid,
   '51000000-0000-0000-0000-0000000000a1'::uuid,
   '2026-07-01 09:00+03', 'onayli', 'subede');

-- Şube A ürünü (stok 5)
insert into public.products (id, branch_id, ad, fiyat, stok, aktif) values
  ('d1000000-0000-0000-0000-0000000000a1'::uuid, 'a0000000-0000-0000-0000-0000000000a1'::uuid, 'Cam Suyu', 100, 5, true);

-- ============================================================
-- ÇALIŞAN A: dükkanda satış (randevulu müşteriye) + stok düşüşü
-- ============================================================
set local role authenticated;
set local "request.jwt.claims" to
  '{"sub":"c5000000-0000-0000-0000-0000000000a1","role":"authenticated","aud":"authenticated"}';

select lives_ok(
  $$select public.dukkan_satis(
      'a0000000-0000-0000-0000-0000000000a1'::uuid,
      '[{"product_id":"d1000000-0000-0000-0000-0000000000a1","adet":2}]'::jsonb,
      '90000000-0000-0000-0000-0000000000a1'::uuid)$$,
  'Çalışan dükkanda satış yazar (randevulu müşteriye)');

-- Çalışan kendi şubesinin dükkan satışını görür
select is((select count(*)::int from public.orders where kaynak = 'dukkan'), 1,
  'Çalışan kendi şubesinin dükkan satışını görür');

-- ------------------------------------------------------------
-- Sahibe dön: stok + order doğrulaması (RLS bypass)
-- ------------------------------------------------------------
reset role;

select is(
  (select stok from public.products where id = 'd1000000-0000-0000-0000-0000000000a1'::uuid),
  3, 'Satıştan sonra stok 5 → 3 düştü');

select is(
  (select toplam from public.orders where kaynak = 'dukkan' limit 1),
  200::numeric, 'Dükkan satışı toplamı sunucuda hesaplandı (2 × 100)');

select is(
  (select user_id from public.orders where kaynak = 'dukkan' limit 1),
  'c1000000-0000-0000-0000-0000000000a1'::uuid,
  'Randevulu satış müşterinin hesabına yazıldı');

-- ============================================================
-- ÇALIŞAN A: şubede ödeme tahsilatı
-- ============================================================
set local role authenticated;
set local "request.jwt.claims" to
  '{"sub":"c5000000-0000-0000-0000-0000000000a1","role":"authenticated","aud":"authenticated"}';

select lives_ok(
  $$select public.randevu_odeme_al('90000000-0000-0000-0000-0000000000a1'::uuid)$$,
  'Çalışan şubede ödemeyi tahsil işaretler');

reset role;
select ok(
  (select odeme_alindi from public.appointments where id = '90000000-0000-0000-0000-0000000000a1'::uuid),
  'Randevu odeme_alindi = true');

-- ============================================================
-- Red senaryoları: stok yetersiz / başka şube / müşteri
-- ============================================================
set local role authenticated;
set local "request.jwt.claims" to
  '{"sub":"c5000000-0000-0000-0000-0000000000a1","role":"authenticated","aud":"authenticated"}';
select throws_ok(
  $$select public.dukkan_satis(
      'a0000000-0000-0000-0000-0000000000a1'::uuid,
      '[{"product_id":"d1000000-0000-0000-0000-0000000000a1","adet":999}]'::jsonb, null)$$,
  'P0001', null, 'Stok yetersizse satış reddedilir');

reset role;
set local role authenticated;
set local "request.jwt.claims" to
  '{"sub":"c5000000-0000-0000-0000-0000000000b1","role":"authenticated","aud":"authenticated"}';
select throws_ok(
  $$select public.dukkan_satis(
      'a0000000-0000-0000-0000-0000000000a1'::uuid,
      '[{"product_id":"d1000000-0000-0000-0000-0000000000a1","adet":1}]'::jsonb, null)$$,
  'P0001', null, 'Başka şube çalışanı bu şubede satış yapamaz');

reset role;
set local role authenticated;
set local "request.jwt.claims" to
  '{"sub":"c1000000-0000-0000-0000-0000000000a1","role":"authenticated","aud":"authenticated"}';
select throws_ok(
  $$select public.dukkan_satis(
      'a0000000-0000-0000-0000-0000000000a1'::uuid,
      '[{"product_id":"d1000000-0000-0000-0000-0000000000a1","adet":1}]'::jsonb, null)$$,
  'P0001', null, 'Müşteri dükkan satışı yazamaz');

select * from finish();
rollback;
