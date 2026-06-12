-- ============================================================
-- Faz 2 RLS Testleri (pgTAP)
-- Çalıştırma: supabase test db
-- ============================================================
begin;

select plan(12);

-- ------------------------------------------------------------
-- Test verisi
-- ------------------------------------------------------------
insert into public.branches (id, ad) values
  ('a0000000-0000-0000-0000-000000000001'::uuid, 'Şube A'),
  ('b0000000-0000-0000-0000-000000000002'::uuid, 'Şube B');

insert into auth.users (id, email, email_confirmed_at, role, aud) values
  ('a1000000-0000-0000-0000-000000000001'::uuid, 'sahibi-a@test.local', now(), 'authenticated', 'authenticated'),
  ('b1000000-0000-0000-0000-000000000002'::uuid, 'sahibi-b@test.local', now(), 'authenticated', 'authenticated'),
  ('c1000000-0000-0000-0000-000000000003'::uuid, 'musteri@test.local', now(), 'authenticated', 'authenticated'),
  ('ad000000-0000-0000-0000-000000000099'::uuid, 'admin@test.local', now(), 'authenticated', 'authenticated');

insert into public.users (id, branch_id, email, rol) values
  ('a1000000-0000-0000-0000-000000000001'::uuid, 'a0000000-0000-0000-0000-000000000001'::uuid, 'sahibi-a@test.local', 'sube_sahibi'),
  ('b1000000-0000-0000-0000-000000000002'::uuid, 'b0000000-0000-0000-0000-000000000002'::uuid, 'sahibi-b@test.local', 'sube_sahibi'),
  ('c1000000-0000-0000-0000-000000000003'::uuid, null, 'musteri@test.local', 'musteri'),
  ('ad000000-0000-0000-0000-000000000099'::uuid, null, 'admin@test.local', 'admin');

insert into public.services (id, ad, kategori, taban_fiyat) values
  ('51000000-0000-0000-0000-000000000001'::uuid, 'Oto Yıkama', 'yikama', 300);

insert into public.vehicles (id, user_id, plaka, segment) values
  ('e1000000-0000-0000-0000-000000000001'::uuid, 'c1000000-0000-0000-0000-000000000003'::uuid, 'TEST34', 'standart');

insert into public.time_slots (id, branch_id, baslangic) values
  ('70000000-0000-0000-0000-000000000001'::uuid, 'a0000000-0000-0000-0000-000000000001'::uuid, '2026-07-01 09:00+03'),
  ('70000000-0000-0000-0000-000000000002'::uuid, 'b0000000-0000-0000-0000-000000000002'::uuid, '2026-07-01 09:00+03');

-- Müşterinin Şube A'da randevusu
insert into public.appointments (id, branch_id, user_id, vehicle_id, service_id, slot_id) values
  ('90000000-0000-0000-0000-000000000001'::uuid,
   'a0000000-0000-0000-0000-000000000001'::uuid,
   'c1000000-0000-0000-0000-000000000003'::uuid,
   'e1000000-0000-0000-0000-000000000001'::uuid,
   '51000000-0000-0000-0000-000000000001'::uuid,
   '70000000-0000-0000-0000-000000000001'::uuid);

-- ============================================================
-- Müşteri: kendi randevusunu görür, slotları görür
-- ============================================================
set local role authenticated;
set local "request.jwt.claims" to
  '{"sub":"c1000000-0000-0000-0000-000000000003","role":"authenticated","aud":"authenticated"}';

select is((select count(*)::int from public.appointments), 1,
  'Müşteri kendi randevusunu görür');

select is((select count(*)::int from public.time_slots), 2,
  'Müşteri tüm slotları görür (randevu almak için açık)');

select throws_ok(
  $$insert into public.time_slots (branch_id, baslangic)
    values ('a0000000-0000-0000-0000-000000000001'::uuid, '2026-07-02 09:00+03')$$,
  '42501',
  null,
  'Müşteri slot üretemez'
);

-- ============================================================
-- Şube A sahibi: şubesinin randevusunu, müşterisini, aracını görür
-- ============================================================
reset role;
set local role authenticated;
set local "request.jwt.claims" to
  '{"sub":"a1000000-0000-0000-0000-000000000001","role":"authenticated","aud":"authenticated"}';

select is((select count(*)::int from public.appointments), 1,
  'Şube A sahibi şubesinin randevusunu görür');

select is((select count(*)::int from public.vehicles where plaka = 'TEST34'), 1,
  'Şube A sahibi randevudaki aracı görür (vehicles_branch_staff)');

select is(
  (select count(*)::int from public.users
   where id = 'c1000000-0000-0000-0000-000000000003'::uuid), 1,
  'Şube A sahibi randevudaki müşteri profilini görür (users_branch_musteri)');

select lives_ok(
  $$insert into public.time_slots (branch_id, baslangic)
    values ('a0000000-0000-0000-0000-000000000001'::uuid, '2026-07-02 09:00+03')$$,
  'Şube A sahibi kendi şubesine slot üretir'
);

select throws_ok(
  $$insert into public.time_slots (branch_id, baslangic)
    values ('b0000000-0000-0000-0000-000000000002'::uuid, '2026-07-02 09:00+03')$$,
  '42501',
  null,
  'Şube A sahibi Şube B''ye slot üretemez'
);

-- ============================================================
-- Şube B sahibi: A şubesinin verisini göremez
-- ============================================================
reset role;
set local role authenticated;
set local "request.jwt.claims" to
  '{"sub":"b1000000-0000-0000-0000-000000000002","role":"authenticated","aud":"authenticated"}';

select is((select count(*)::int from public.appointments), 0,
  'Şube B sahibi Şube A randevusunu göremez');

select is((select count(*)::int from public.vehicles), 0,
  'Şube B sahibi Şube A''nın aracını göremez');

-- ============================================================
-- Admin: her şeyi görür
-- ============================================================
reset role;
set local role authenticated;
set local "request.jwt.claims" to
  '{"sub":"ad000000-0000-0000-0000-000000000099","role":"authenticated","aud":"authenticated"}';

select is((select count(*)::int from public.appointments), 1,
  'Admin tüm randevuları görür');

select is((select count(*)::int from public.time_slots) >= 2, true,
  'Admin tüm slotları görür');

select * from finish();
rollback;
