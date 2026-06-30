-- ============================================================
-- Hizmet teklif talebi (service_quotes) RLS testleri (pgTAP)
-- Kapsam (migration 20260629000001_hizmet_teklif):
--   * müşteri kendi adına talep oluşturur + kendi talebini görür
--   * müşteri başkası adına talep yazamaz (insert with check)
--   * başka müşteri talebi görmez (izolasyon)
--   * yönetici kendi şubesinin talebini görür + durum günceller
--   * başka şube yöneticisi görmez (franchise izolasyonu)
--   * çalışan GÖRMEZ (yalnız randevu + iş — rol modeliyle uyumlu)
-- Çalıştırma: supabase test db
-- ============================================================
begin;

select plan(8);

-- ------------------------------------------------------------
-- Test verisi (RLS bypass: test runner tablo sahibidir)
-- ------------------------------------------------------------
insert into public.branches (id, ad) values
  ('a0000000-0000-0000-0000-0000000000a1'::uuid, 'Şube A'),
  ('b0000000-0000-0000-0000-0000000000b1'::uuid, 'Şube B');

insert into auth.users (id, email, email_confirmed_at, role, aud) values
  ('a1000000-0000-0000-0000-0000000000a1'::uuid, 'yonetici-a@test.local', now(), 'authenticated', 'authenticated'),
  ('b1000000-0000-0000-0000-0000000000b1'::uuid, 'yonetici-b@test.local', now(), 'authenticated', 'authenticated'),
  ('c5000000-0000-0000-0000-0000000000a1'::uuid, 'calisan-a@test.local',  now(), 'authenticated', 'authenticated'),
  ('c1000000-0000-0000-0000-0000000000a1'::uuid, 'musteri1@test.local',   now(), 'authenticated', 'authenticated'),
  ('c2000000-0000-0000-0000-0000000000a1'::uuid, 'musteri2@test.local',   now(), 'authenticated', 'authenticated');

insert into public.users (id, branch_id, rol) values
  ('a1000000-0000-0000-0000-0000000000a1'::uuid, 'a0000000-0000-0000-0000-0000000000a1'::uuid, 'yonetici'),
  ('b1000000-0000-0000-0000-0000000000b1'::uuid, 'b0000000-0000-0000-0000-0000000000b1'::uuid, 'yonetici'),
  ('c5000000-0000-0000-0000-0000000000a1'::uuid, 'a0000000-0000-0000-0000-0000000000a1'::uuid, 'calisan'),
  ('c1000000-0000-0000-0000-0000000000a1'::uuid, null, 'musteri'),
  ('c2000000-0000-0000-0000-0000000000a1'::uuid, null, 'musteri')
on conflict (id) do update set branch_id = excluded.branch_id, rol = excluded.rol;

insert into public.services (id, ad, kategori, taban_fiyat, teklif_usulu) values
  ('51000000-0000-0000-0000-0000000000a1'::uuid, 'Komple Kaplama', 'kaplama', 0, true);

-- ============================================================
-- Müşteri 1: talep oluşturur + kendi talebini görür
-- ============================================================
set local role authenticated;
set local "request.jwt.claims" to
  '{"sub":"c1000000-0000-0000-0000-0000000000a1","role":"authenticated","aud":"authenticated"}';

select lives_ok(
  $$insert into public.service_quotes
      (user_id, branch_id, service_id, ad_soyad, telefon, kvkk_riza_at)
    values ('c1000000-0000-0000-0000-0000000000a1'::uuid,
            'a0000000-0000-0000-0000-0000000000a1'::uuid,
            '51000000-0000-0000-0000-0000000000a1'::uuid,
            'Müşteri 1', '+905550000011', now())$$,
  'Müşteri hizmet teklif talebi bırakır');

select is((select count(*)::int from public.service_quotes), 1,
  'Müşteri kendi teklif talebini görür');

select throws_ok(
  $$insert into public.service_quotes
      (user_id, branch_id, service_id, ad_soyad, telefon)
    values ('c2000000-0000-0000-0000-0000000000a1'::uuid,
            'a0000000-0000-0000-0000-0000000000a1'::uuid,
            '51000000-0000-0000-0000-0000000000a1'::uuid,
            'Sahte', '+905550000099')$$,
  '42501', null,
  'Müşteri başkası adına talep yazamaz');

-- ============================================================
-- Müşteri 2: başka müşterinin talebini görmez
-- ============================================================
reset role;
set local role authenticated;
set local "request.jwt.claims" to
  '{"sub":"c2000000-0000-0000-0000-0000000000a1","role":"authenticated","aud":"authenticated"}';

select is((select count(*)::int from public.service_quotes), 0,
  'Başka müşteri talebi görmez (izolasyon)');

-- ============================================================
-- Yönetici (Şube A): şubesinin talebini görür + durum günceller
-- ============================================================
reset role;
set local role authenticated;
set local "request.jwt.claims" to
  '{"sub":"a1000000-0000-0000-0000-0000000000a1","role":"authenticated","aud":"authenticated"}';

select is((select count(*)::int from public.service_quotes), 1,
  'Şube A yöneticisi şubesinin talebini görür');

select lives_ok(
  $$update public.service_quotes set durum = 'arandi'
    where branch_id = 'a0000000-0000-0000-0000-0000000000a1'::uuid$$,
  'Yönetici talep durumunu günceller');

-- ============================================================
-- Şube B yöneticisi: Şube A talebini görmez (franchise izolasyonu)
-- ============================================================
reset role;
set local role authenticated;
set local "request.jwt.claims" to
  '{"sub":"b1000000-0000-0000-0000-0000000000b1","role":"authenticated","aud":"authenticated"}';

select is((select count(*)::int from public.service_quotes), 0,
  'Başka şube yöneticisi talebi görmez');

-- ============================================================
-- Çalışan (Şube A): teklif taleplerini görmez
-- ============================================================
reset role;
set local role authenticated;
set local "request.jwt.claims" to
  '{"sub":"c5000000-0000-0000-0000-0000000000a1","role":"authenticated","aud":"authenticated"}';

select is((select count(*)::int from public.service_quotes), 0,
  'Çalışan teklif taleplerini görmez (yalnız randevu + iş)');

select * from finish();
rollback;
