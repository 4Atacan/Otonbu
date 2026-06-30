-- ============================================================
-- Mağaza + Sigorta testleri (pgTAP)
-- Kapsam: products RLS (müşteri görünürlüğü + şube izolasyonu),
--         siparis_olustur (sunucu fiyat + atomik stok + satış sayacı),
--         orders/order_items RLS, insurance_requests RLS.
-- Çalıştırma: supabase test db
-- ============================================================
begin;

select plan(16);

-- ------------------------------------------------------------
-- Test verisi (RLS bypass: test runner tablo sahibidir)
-- ------------------------------------------------------------
insert into public.branches (id, ad) values
  ('a0000000-0000-0000-0000-0000000000a1'::uuid, 'Şube A'),
  ('b0000000-0000-0000-0000-0000000000b1'::uuid, 'Şube B');

insert into auth.users (id, email, email_confirmed_at, role, aud) values
  ('a1000000-0000-0000-0000-0000000000a1'::uuid, 'sahip-a@test.local', now(), 'authenticated', 'authenticated'),
  ('c1000000-0000-0000-0000-0000000000a1'::uuid, 'must1@test.local',   now(), 'authenticated', 'authenticated'),
  ('c2000000-0000-0000-0000-0000000000a1'::uuid, 'must2@test.local',   now(), 'authenticated', 'authenticated');

insert into public.users (id, branch_id, telefon, rol, ad_soyad) values
  ('a1000000-0000-0000-0000-0000000000a1'::uuid, 'a0000000-0000-0000-0000-0000000000a1'::uuid, '+905550000010', 'yonetici', 'Sahip A'),
  ('c1000000-0000-0000-0000-0000000000a1'::uuid, null, '+905550000011', 'musteri', 'Müşteri 1'),
  ('c2000000-0000-0000-0000-0000000000a1'::uuid, null, '+905550000012', 'musteri', 'Müşteri 2')
on conflict (id) do update set rol = excluded.rol, branch_id = excluded.branch_id;

-- P1: Şube A, aktif, stok 5, 100₺ · P2: Şube A, PASİF · P3: Şube B, aktif
insert into public.products (id, branch_id, ad, fiyat, stok, aktif) values
  ('d1000000-0000-0000-0000-0000000000a1'::uuid, 'a0000000-0000-0000-0000-0000000000a1'::uuid, 'Cam Suyu', 100, 5, true),
  ('d2000000-0000-0000-0000-0000000000a1'::uuid, 'a0000000-0000-0000-0000-0000000000a1'::uuid, 'Pasif Ürün', 50, 3, false),
  ('d3000000-0000-0000-0000-0000000000a1'::uuid, 'b0000000-0000-0000-0000-0000000000b1'::uuid, 'Koku', 80, 4, true);

-- ============================================================
-- Müşteri 1: ürün görünürlüğü + sipariş
-- ============================================================
set local role authenticated;
set local "request.jwt.claims" to
  '{"sub":"c1000000-0000-0000-0000-0000000000a1","role":"authenticated","aud":"authenticated"}';

select is(
  (select count(*)::int from public.products),
  2, 'Müşteri yalnızca aktif ürünleri görür (P1 + P3)');

select is(
  (select count(*)::int from public.products
   where id = 'd2000000-0000-0000-0000-0000000000a1'::uuid),
  0, 'Müşteri pasif ürünü görmez');

select lives_ok(
  $$select public.siparis_olustur(
      'a0000000-0000-0000-0000-0000000000a1'::uuid,
      '[{"product_id":"d1000000-0000-0000-0000-0000000000a1","adet":2}]'::jsonb)$$,
  'Müşteri sipariş talebi oluşturur');

select is(
  (select stok from public.products where id = 'd1000000-0000-0000-0000-0000000000a1'::uuid),
  3, 'Stok atomik düştü (5 → 3)');

select is(
  (select satis_adedi from public.products where id = 'd1000000-0000-0000-0000-0000000000a1'::uuid),
  2, 'Satış sayacı arttı (çok satan sıralama için)');

select is(
  (select toplam from public.orders limit 1),
  200::numeric, 'Sipariş toplamı sunucuda hesaplandı (2 × 100)');

select is(
  (select count(*)::int from public.order_items),
  1, 'Sipariş kalemi oluştu');

select is(
  (select count(*)::int from public.orders),
  1, 'Müşteri kendi siparişini görür');

select throws_ok(
  $$select public.siparis_olustur(
      'a0000000-0000-0000-0000-0000000000a1'::uuid,
      '[{"product_id":"d1000000-0000-0000-0000-0000000000a1","adet":99}]'::jsonb)$$,
  'P0001', null, 'Stok yetersizse sipariş reddedilir');

select throws_ok(
  $$insert into public.orders (branch_id, user_id)
    values ('a0000000-0000-0000-0000-0000000000a1'::uuid,
            'c1000000-0000-0000-0000-0000000000a1'::uuid)$$,
  '42501', null, 'Müşteri doğrudan sipariş satırı yazamaz (yalnızca RPC)');

-- Sigorta teklif talebi (kendi adına)
select lives_ok(
  $$insert into public.insurance_requests
      (user_id, branch_id, tip, ad_soyad, telefon, kvkk_riza_at)
    values ('c1000000-0000-0000-0000-0000000000a1'::uuid,
            'a0000000-0000-0000-0000-0000000000a1'::uuid,
            'kasko', 'Müşteri 1', '+905550000011', now())$$,
  'Müşteri sigorta teklif talebi bırakır');

select is(
  (select count(*)::int from public.insurance_requests),
  1, 'Müşteri kendi teklif talebini görür');

-- ============================================================
-- Müşteri 2: izolasyon
-- ============================================================
reset role;
set local role authenticated;
set local "request.jwt.claims" to
  '{"sub":"c2000000-0000-0000-0000-0000000000a1","role":"authenticated","aud":"authenticated"}';

select is(
  (select count(*)::int from public.insurance_requests),
  0, 'Başka müşteri teklif talebini görmez');

-- ============================================================
-- Şube A sahibi: şubesinin teklifini görür, ürün izolasyonu
-- ============================================================
reset role;
set local role authenticated;
set local "request.jwt.claims" to
  '{"sub":"a1000000-0000-0000-0000-0000000000a1","role":"authenticated","aud":"authenticated"}';

select is(
  (select count(*)::int from public.insurance_requests),
  1, 'Şube sahibi kendi şubesinin teklif talebini görür');

select lives_ok(
  $$insert into public.products (branch_id, ad, fiyat, stok)
    values ('a0000000-0000-0000-0000-0000000000a1'::uuid, 'Mikrofiber Bez', 60, 10)$$,
  'Şube sahibi kendi şubesine ürün ekler');

select throws_ok(
  $$insert into public.products (branch_id, ad, fiyat, stok)
    values ('b0000000-0000-0000-0000-0000000000b1'::uuid, 'Kaçak Ürün', 60, 10)$$,
  '42501', null, 'Şube sahibi başka şubeye ürün ekleyemez (franchise izolasyonu)');

select * from finish();
rollback;
