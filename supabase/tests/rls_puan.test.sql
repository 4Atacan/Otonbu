-- ============================================================
-- Faz 4 — Sadakat puanı (loyalty_ledger) testleri (pgTAP)
-- Kapsam (migration 20260629000005_faz4_puan):
--   * İş 'hazir'a geçince hizmet puanı yazılır (abonelikten bağımsız).
--   * Çift tetik idempotent (ref unique) → puan iki kez yazılmaz.
--   * Sipariş 'teslim'e geçince ürün puanı (adet × puan) yazılır.
--   * Kullanıcı kendi puan defterini görür; başkasınınkini görmez.
-- Çalıştırma: supabase test db
-- ============================================================
begin;

select plan(5);

insert into public.branches (id, ad) values
  ('a0000000-0000-0000-0000-0000000000a1'::uuid, 'Şube A');

insert into auth.users (id, email, email_confirmed_at, role, aud) values
  ('c1000000-0000-0000-0000-0000000000a1'::uuid, 'musteri1@test.local', now(), 'authenticated', 'authenticated'),
  ('c2000000-0000-0000-0000-0000000000a1'::uuid, 'musteri2@test.local', now(), 'authenticated', 'authenticated');

insert into public.users (id, branch_id, rol) values
  ('c1000000-0000-0000-0000-0000000000a1'::uuid, null, 'musteri'),
  ('c2000000-0000-0000-0000-0000000000a1'::uuid, null, 'musteri')
on conflict (id) do update set rol = excluded.rol;

-- Hizmet 50 puan; ürün 10 puan
insert into public.services (id, ad, kategori, taban_fiyat, puan) values
  ('51000000-0000-0000-0000-0000000000a1'::uuid, 'Oto Yıkama', 'yikama', 300, 50);

insert into public.products (id, branch_id, ad, fiyat, stok, puan) values
  ('d1000000-0000-0000-0000-0000000000a1'::uuid, 'a0000000-0000-0000-0000-0000000000a1'::uuid, 'Cam Suyu', 100, 5, 10);

insert into public.vehicles (id, user_id, plaka, segment) values
  ('e1000000-0000-0000-0000-0000000000a1'::uuid, 'c1000000-0000-0000-0000-0000000000a1'::uuid, 'TEST34', 'kucuk');

insert into public.appointments (id, branch_id, user_id, vehicle_id, service_id, baslangic, durum) values
  ('90000000-0000-0000-0000-0000000000a1'::uuid,
   'a0000000-0000-0000-0000-0000000000a1'::uuid,
   'c1000000-0000-0000-0000-0000000000a1'::uuid,
   'e1000000-0000-0000-0000-0000000000a1'::uuid,
   '51000000-0000-0000-0000-0000000000a1'::uuid,
   '2026-07-01 09:00+03', 'onayli');

insert into public.jobs (id, appointment_id, durum) values
  ('30000000-0000-0000-0000-0000000000a1'::uuid,
   '90000000-0000-0000-0000-0000000000a1'::uuid, 'basladi');

insert into public.orders (id, branch_id, user_id, durum, toplam) values
  ('05000000-0000-0000-0000-0000000000a1'::uuid,
   'a0000000-0000-0000-0000-0000000000a1'::uuid,
   'c1000000-0000-0000-0000-0000000000a1'::uuid, 'hazirlaniyor', 200);

insert into public.order_items (order_id, product_id, ad, adet, birim_fiyat) values
  ('05000000-0000-0000-0000-0000000000a1'::uuid,
   'd1000000-0000-0000-0000-0000000000a1'::uuid, 'Cam Suyu', 2, 100);

-- ============================================================
-- Tetikleyiciler (RLS bypass: owner). İş tamamlanınca hizmet puanı.
-- ============================================================
update public.jobs set durum = 'hazir'
  where id = '30000000-0000-0000-0000-0000000000a1'::uuid;

select is(
  (select coalesce(sum(puan_degisim), 0)::int from public.loyalty_ledger
   where user_id = 'c1000000-0000-0000-0000-0000000000a1'::uuid),
  50, 'İş hazır olunca hizmet puanı yazıldı (+50)');

-- Çift tetik: terminal durumdan tekrar güncelleme yeni puan yazmaz (ref unique)
update public.jobs set durum = 'tamamlandi'
  where id = '30000000-0000-0000-0000-0000000000a1'::uuid;

select is(
  (select count(*)::int from public.loyalty_ledger
   where ref = 'job:30000000-0000-0000-0000-0000000000a1'),
  1, 'Çift tetik idempotent (tek puan kaydı)');

-- Sipariş teslim olunca ürün puanı (2 × 10)
update public.orders set durum = 'teslim'
  where id = '05000000-0000-0000-0000-0000000000a1'::uuid;

select is(
  (select coalesce(sum(puan_degisim), 0)::int from public.loyalty_ledger
   where ref = 'order:05000000-0000-0000-0000-0000000000a1'),
  20, 'Sipariş teslim olunca ürün puanı yazıldı (2 × 10)');

-- ============================================================
-- RLS: kullanıcı kendi defterini görür
-- ============================================================
set local role authenticated;
set local "request.jwt.claims" to
  '{"sub":"c1000000-0000-0000-0000-0000000000a1","role":"authenticated","aud":"authenticated"}';

select is((select count(*)::int from public.loyalty_ledger), 2,
  'Müşteri kendi puan kayıtlarını görür (hizmet + sipariş)');

reset role;
set local role authenticated;
set local "request.jwt.claims" to
  '{"sub":"c2000000-0000-0000-0000-0000000000a1","role":"authenticated","aud":"authenticated"}';

select is((select count(*)::int from public.loyalty_ledger), 0,
  'Başka müşteri puan defterini görmez');

select * from finish();
rollback;
