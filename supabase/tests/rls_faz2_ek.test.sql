-- ============================================================
-- Faz 2 RLS Testleri — EK tablolar (pgTAP)
-- rls_faz2.test.sql appointments/time_slots/jobs/vehicles/users'ı kapsar;
-- bu dosya Faz 2 sonrası eklenen operasyonel tabloları kapsar:
--   branch_prices, service_schedules, appointment_changes, job_photos
-- CLAUDE.md kural 3: branch_id taşıyan her tabloda franchise izolasyonu RLS ile.
-- Çalıştırma: supabase test db
-- ============================================================
begin;

select plan(17);

-- ------------------------------------------------------------
-- Test verisi (RLS bypass: test runner tablo sahibidir)
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
  ('a1000000-0000-0000-0000-000000000001'::uuid, 'a0000000-0000-0000-0000-000000000001'::uuid, 'sahibi-a@test.local', 'yonetici'),
  ('b1000000-0000-0000-0000-000000000002'::uuid, 'b0000000-0000-0000-0000-000000000002'::uuid, 'sahibi-b@test.local', 'yonetici'),
  ('c1000000-0000-0000-0000-000000000003'::uuid, null, 'musteri@test.local', 'musteri'),
  ('ad000000-0000-0000-0000-000000000099'::uuid, null, 'admin@test.local', 'admin')
on conflict (id) do update
  set branch_id = excluded.branch_id, rol = excluded.rol, email = excluded.email;

insert into public.services (id, ad, kategori, taban_fiyat) values
  ('51000000-0000-0000-0000-000000000001'::uuid, 'Oto Yıkama', 'yikama', 300);

insert into public.vehicles (id, user_id, plaka, segment) values
  ('e1000000-0000-0000-0000-000000000001'::uuid, 'c1000000-0000-0000-0000-000000000003'::uuid, 'TEST34', 'kucuk');

-- Müşterinin Şube A'da randevusu (durum varsayılan: beklemede)
insert into public.appointments (id, branch_id, user_id, vehicle_id, service_id, baslangic) values
  ('90000000-0000-0000-0000-000000000001'::uuid,
   'a0000000-0000-0000-0000-000000000001'::uuid,
   'c1000000-0000-0000-0000-000000000003'::uuid,
   'e1000000-0000-0000-0000-000000000001'::uuid,
   '51000000-0000-0000-0000-000000000001'::uuid,
   '2026-07-01 09:00+03');

-- Şube A'nın üstlendiği iş + bir foto kaydı (görünürlük testleri için)
insert into public.jobs (id, appointment_id, assigned_to, durum) values
  ('30000000-0000-0000-0000-000000000001'::uuid,
   '90000000-0000-0000-0000-000000000001'::uuid,
   'a1000000-0000-0000-0000-000000000001'::uuid,
   'basladi');

insert into public.job_photos (id, job_id, tip, url) values
  ('40000000-0000-0000-0000-000000000001'::uuid,
   '30000000-0000-0000-0000-000000000001'::uuid,
   'once',
   '30000000-0000-0000-0000-000000000001/once-1.jpg');

-- ============================================================
-- Şube A sahibi: kendi şubesine fiyat/program/talep yazabilir, B'ye yazamaz
-- ============================================================
set local role authenticated;
set local "request.jwt.claims" to
  '{"sub":"a1000000-0000-0000-0000-000000000001","role":"authenticated","aud":"authenticated"}';

select lives_ok(
  $$insert into public.branch_prices (branch_id, service_id, segment, fiyat)
    values ('a0000000-0000-0000-0000-000000000001'::uuid,
            '51000000-0000-0000-0000-000000000001'::uuid, 'kucuk', 320)$$,
  'Şube A sahibi kendi şubesine fiyat girer (branch_prices)');

select throws_ok(
  $$insert into public.branch_prices (branch_id, service_id, segment, fiyat)
    values ('b0000000-0000-0000-0000-000000000002'::uuid,
            '51000000-0000-0000-0000-000000000001'::uuid, 'kucuk', 999)$$,
  '42501', null,
  'Şube A sahibi Şube B''ye fiyat giremez');

select lives_ok(
  $$insert into public.service_schedules (branch_id, service_id)
    values ('a0000000-0000-0000-0000-000000000001'::uuid,
            '51000000-0000-0000-0000-000000000001'::uuid)$$,
  'Şube A sahibi kendi şubesine program girer (service_schedules)');

select throws_ok(
  $$insert into public.service_schedules (branch_id, service_id)
    values ('b0000000-0000-0000-0000-000000000002'::uuid,
            '51000000-0000-0000-0000-000000000001'::uuid)$$,
  '42501', null,
  'Şube A sahibi Şube B''ye program giremez');

select lives_ok(
  $$insert into public.appointment_changes (appointment_id, branch_id, tip, olusturan)
    values ('90000000-0000-0000-0000-000000000001'::uuid,
            'a0000000-0000-0000-0000-000000000001'::uuid, 'iptal',
            'a1000000-0000-0000-0000-000000000001'::uuid)$$,
  'Şube A sahibi randevu için değişiklik talebi oluşturur (appointment_changes)');

select is((select count(*)::int from public.service_schedules), 1,
  'Şube A sahibi kendi programını görür');

select is((select count(*)::int from public.job_photos), 1,
  'Şube A sahibi şubesinin iş fotoğrafını görür (job_photos)');

-- ============================================================
-- Şube B sahibi: A şubesinin program/talep/fotosunu göremez
-- ============================================================
reset role;
set local role authenticated;
set local "request.jwt.claims" to
  '{"sub":"b1000000-0000-0000-0000-000000000002","role":"authenticated","aud":"authenticated"}';

select is((select count(*)::int from public.service_schedules), 0,
  'Şube B sahibi Şube A programını göremez');

select is((select count(*)::int from public.appointment_changes), 0,
  'Şube B sahibi Şube A değişiklik talebini göremez');

select is((select count(*)::int from public.job_photos), 0,
  'Şube B sahibi Şube A iş fotoğrafını göremez');

-- ============================================================
-- Müşteri: fiyatı okur ama yazamaz; programı göremez; talep yazamaz ama
-- kendi randevusunun talebini ve işinin fotosunu görür
-- ============================================================
reset role;
set local role authenticated;
set local "request.jwt.claims" to
  '{"sub":"c1000000-0000-0000-0000-000000000003","role":"authenticated","aud":"authenticated"}';

select is((select count(*)::int from public.branch_prices), 1,
  'Müşteri fiyatı görür (branch_prices select açık)');

select throws_ok(
  $$insert into public.branch_prices (branch_id, service_id, segment, fiyat)
    values ('a0000000-0000-0000-0000-000000000001'::uuid,
            '51000000-0000-0000-0000-000000000001'::uuid, 'buyuk', 1)$$,
  '42501', null,
  'Müşteri fiyat giremez');

select is((select count(*)::int from public.service_schedules), 0,
  'Müşteri programı göremez (yalnız personel)');

select throws_ok(
  $$insert into public.appointment_changes (appointment_id, branch_id, tip, olusturan)
    values ('90000000-0000-0000-0000-000000000001'::uuid,
            'a0000000-0000-0000-0000-000000000001'::uuid, 'iptal',
            'c1000000-0000-0000-0000-000000000003'::uuid)$$,
  '42501', null,
  'Müşteri değişiklik talebi oluşturamaz (personel değil)');

select is((select count(*)::int from public.appointment_changes), 1,
  'Müşteri kendi randevusunun değişiklik talebini görür');

select is((select count(*)::int from public.job_photos), 1,
  'Müşteri kendi işinin fotoğrafını görür');

-- ============================================================
-- Admin: tüm programları görür
-- ============================================================
reset role;
set local role authenticated;
set local "request.jwt.claims" to
  '{"sub":"ad000000-0000-0000-0000-000000000099","role":"authenticated","aud":"authenticated"}';

select is((select count(*)::int from public.service_schedules), 1,
  'Admin tüm programları görür');

select * from finish();
rollback;
