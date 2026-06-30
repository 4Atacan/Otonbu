-- ============================================================
-- Faz 4 — Sarf stoğu (stock_items) RLS testleri (pgTAP)
-- Kapsam (migration 20260629000004_faz4_stok):
--   * Yönetici kendi şubesinin sarf stoğunu ekler/görür/yönetir.
--   * Başka şube yöneticisi göremez/yazamaz (franchise izolasyonu).
--   * Çalışan erişemez (operasyonel iç envanter).
-- Çalıştırma: supabase test db
-- ============================================================
begin;

select plan(5);

insert into public.branches (id, ad) values
  ('a0000000-0000-0000-0000-0000000000a1'::uuid, 'Şube A'),
  ('b0000000-0000-0000-0000-0000000000b1'::uuid, 'Şube B');

insert into auth.users (id, email, email_confirmed_at, role, aud) values
  ('a1000000-0000-0000-0000-0000000000a1'::uuid, 'yonetici-a@test.local', now(), 'authenticated', 'authenticated'),
  ('b1000000-0000-0000-0000-0000000000b1'::uuid, 'yonetici-b@test.local', now(), 'authenticated', 'authenticated'),
  ('c5000000-0000-0000-0000-0000000000a1'::uuid, 'calisan-a@test.local',  now(), 'authenticated', 'authenticated');

insert into public.users (id, branch_id, rol) values
  ('a1000000-0000-0000-0000-0000000000a1'::uuid, 'a0000000-0000-0000-0000-0000000000a1'::uuid, 'yonetici'),
  ('b1000000-0000-0000-0000-0000000000b1'::uuid, 'b0000000-0000-0000-0000-0000000000b1'::uuid, 'yonetici'),
  ('c5000000-0000-0000-0000-0000000000a1'::uuid, 'a0000000-0000-0000-0000-0000000000a1'::uuid, 'calisan')
on conflict (id) do update set branch_id = excluded.branch_id, rol = excluded.rol;

-- ============================================================
-- Yönetici A: kendi şubesine sarf ekler + görür
-- ============================================================
set local role authenticated;
set local "request.jwt.claims" to
  '{"sub":"a1000000-0000-0000-0000-0000000000a1","role":"authenticated","aud":"authenticated"}';

select lives_ok(
  $$insert into public.stock_items (branch_id, ad, tip, miktar, min_esik)
    values ('a0000000-0000-0000-0000-0000000000a1'::uuid, 'Oto Şampuanı', 'sarf', 10, 2)$$,
  'Yönetici kendi şubesine sarf malzemesi ekler');

select is((select count(*)::int from public.stock_items), 1,
  'Yönetici kendi şubesinin sarf stoğunu görür');

-- ============================================================
-- Yönetici B: Şube A stoğunu görmez + yazamaz
-- ============================================================
reset role;
set local role authenticated;
set local "request.jwt.claims" to
  '{"sub":"b1000000-0000-0000-0000-0000000000b1","role":"authenticated","aud":"authenticated"}';

select is((select count(*)::int from public.stock_items), 0,
  'Başka şube yöneticisi sarf stoğunu görmez');

select throws_ok(
  $$insert into public.stock_items (branch_id, ad, miktar)
    values ('a0000000-0000-0000-0000-0000000000a1'::uuid, 'Kaçak', 1)$$,
  '42501', null, 'Yönetici başka şubeye sarf yazamaz');

-- ============================================================
-- Çalışan A: sarf stoğuna erişemez
-- ============================================================
reset role;
set local role authenticated;
set local "request.jwt.claims" to
  '{"sub":"c5000000-0000-0000-0000-0000000000a1","role":"authenticated","aud":"authenticated"}';

select is((select count(*)::int from public.stock_items), 0,
  'Çalışan sarf stoğunu görmez');

select * from finish();
rollback;
