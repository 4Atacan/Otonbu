-- ============================================================
-- Faz 1 RLS Testleri (pgTAP)
-- Çalıştırma: supabase test db
-- ============================================================
begin;

select plan(10);

-- ------------------------------------------------------------
-- Test verisi
-- ------------------------------------------------------------
insert into public.branches (id, ad) values
  ('a0000000-0000-0000-0000-000000000001'::uuid, 'Test Şube A'),
  ('b0000000-0000-0000-0000-000000000002'::uuid, 'Test Şube B');

-- Sahte auth.users kayıtları
insert into auth.users (id, phone, phone_confirmed_at, role, aud)
values
  ('a1000000-0000-0000-0000-000000000001'::uuid, '+900000000001', now(), 'authenticated', 'authenticated'),
  ('b1000000-0000-0000-0000-000000000002'::uuid, '+900000000002', now(), 'authenticated', 'authenticated'),
  ('ad000000-0000-0000-0000-000000000099'::uuid, '+900000000099', now(), 'authenticated', 'authenticated');

-- public.users (trigger çalışmıyor test ortamında — manuel ekle)
insert into public.users (id, branch_id, telefon, rol) values
  ('a1000000-0000-0000-0000-000000000001'::uuid, 'a0000000-0000-0000-0000-000000000001'::uuid, '+900000000001', 'musteri'),
  ('b1000000-0000-0000-0000-000000000002'::uuid, 'b0000000-0000-0000-0000-000000000002'::uuid, '+900000000002', 'musteri'),
  ('ad000000-0000-0000-0000-000000000099'::uuid, 'a0000000-0000-0000-0000-000000000001'::uuid, '+900000000099', 'admin');

-- Araçlar
insert into public.vehicles (id, user_id, plaka, segment) values
  ('v1000000-0000-0000-0000-000000000001'::uuid, 'a1000000-0000-0000-0000-000000000001'::uuid, 'TEST01', 'standart'),
  ('v2000000-0000-0000-0000-000000000002'::uuid, 'b1000000-0000-0000-0000-000000000002'::uuid, 'TEST02', 'standart');

-- ============================================================
-- TEST 1-2: Kullanıcı A kendi aracını görür, B'yi göremez
-- ============================================================
set local role authenticated;
set local "request.jwt.claims" to
  '{"sub":"a1000000-0000-0000-0000-000000000001","role":"authenticated","aud":"authenticated"}';

select is(
  (select count(*)::int from public.vehicles),
  1,
  'Kullanıcı A yalnızca 1 araç görür'
);

select is(
  (select count(*)::int from public.vehicles where plaka = 'TEST01'),
  1,
  'Kullanıcı A kendi aracı TEST01''i görür'
);

-- ============================================================
-- TEST 3-4: Kullanıcı A başka kullanıcının aracını/profilini göremez
-- ============================================================
select is(
  (select count(*)::int from public.vehicles where plaka = 'TEST02'),
  0,
  'Kullanıcı A TEST02''yi göremez (Şube B izolasyonu)'
);

select is(
  (select count(*)::int from public.users where id = 'b1000000-0000-0000-0000-000000000002'::uuid),
  0,
  'Kullanıcı A, Kullanıcı B profilini göremez'
);

-- ============================================================
-- TEST 5-6: Kullanıcı B kendi aracını görür, A'yı göremez
-- ============================================================
reset role;
set local role authenticated;
set local "request.jwt.claims" to
  '{"sub":"b1000000-0000-0000-0000-000000000002","role":"authenticated","aud":"authenticated"}';

select is(
  (select count(*)::int from public.vehicles where plaka = 'TEST02'),
  1,
  'Kullanıcı B kendi aracı TEST02''yi görür'
);

select is(
  (select count(*)::int from public.vehicles where plaka = 'TEST01'),
  0,
  'Kullanıcı B TEST01''i göremez (Şube A izolasyonu)'
);

-- ============================================================
-- TEST 7-8: Admin tüm şubeleri görür
-- ============================================================
reset role;
set local role authenticated;
set local "request.jwt.claims" to
  '{"sub":"ad000000-0000-0000-0000-000000000099","role":"authenticated","aud":"authenticated"}';

select is(
  (select count(*)::int from public.vehicles),
  2,
  'Admin tüm araçları (2) görür'
);

select is(
  (select count(*)::int from public.users),
  3,
  'Admin tüm kullanıcıları (3) görür'
);

-- ============================================================
-- TEST 9-10: Branches ve services herkese açık
-- ============================================================
reset role;
set local role anon;

select is(
  (select count(*)::int from public.branches),
  2,
  'Anonim kullanıcı şubeleri görür (public)'
);

select is(
  (select count(*)::int from public.services),
  0,
  'Services tablosu boş ama erişilebilir (RLS hata vermiyor)'
);

select * from finish();
rollback;
