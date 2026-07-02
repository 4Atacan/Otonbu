-- ============================================================
-- Kampanya bonus puanı — award testleri (pgTAP)
-- Kapsam (migration 20260701000003_kampanya_puan_award):
--   * İş 'hazir'a geçince: hizmet puanı + geçerli 'puan' kampanyasının bonusu.
--   * Şube filtresi: başka şubeye özel kampanya, farklı şubedeki işe eklenmez.
--   * Çift tetik idempotent (ref unique) → toplam iki kez yazılmaz.
-- Çalıştırma: supabase test db
-- ============================================================
begin;

select plan(3);

insert into public.branches (id, ad) values
  ('aa000000-0000-0000-0000-0000000000b1'::uuid, 'Şube A'),
  ('aa000000-0000-0000-0000-0000000000b2'::uuid, 'Şube B');

insert into auth.users (id, email, email_confirmed_at, role, aud) values
  ('cc000000-0000-0000-0000-0000000000c1'::uuid, 'puanmus@test.local', now(), 'authenticated', 'authenticated');

insert into public.users (id, branch_id, rol) values
  ('cc000000-0000-0000-0000-0000000000c1'::uuid, null, 'musteri')
on conflict (id) do update set rol = excluded.rol;

-- İki hizmet, ikisi de 40 taban puan
insert into public.services (id, ad, kategori, taban_fiyat, puan) values
  ('55000000-0000-0000-0000-0000000000f1'::uuid, 'Yıkama',  'yikama', 300, 40),
  ('55000000-0000-0000-0000-0000000000f2'::uuid, 'Kaplama', 'kaplama', 300, 40);

-- Kampanya 1: GENEL (branch_id null), S1'e +15 bonus, süresiz aktif
insert into public.campaigns (id, branch_id, baslik, tip, hizmet_id, bonus_puan, aktif) values
  ('cae00000-0000-0000-0000-0000000000d1'::uuid, null,
   'S1 Puan Kampanyası', 'puan', '55000000-0000-0000-0000-0000000000f1'::uuid, 15, true);

-- Kampanya 2: yalnız Şube B'ye özel, S2'ye +30 bonus (Şube A işine EKLENMEMELİ)
insert into public.campaigns (id, branch_id, baslik, tip, hizmet_id, bonus_puan, aktif) values
  ('cae00000-0000-0000-0000-0000000000d2'::uuid, 'aa000000-0000-0000-0000-0000000000b2'::uuid,
   'S2 Şube B Puan', 'puan', '55000000-0000-0000-0000-0000000000f2'::uuid, 30, true);

insert into public.vehicles (id, user_id, plaka, segment) values
  ('ee000000-0000-0000-0000-0000000000e1'::uuid, 'cc000000-0000-0000-0000-0000000000c1'::uuid, 'PUAN34', 'kucuk');

-- Randevu 1: Şube A, S1 (genel kampanya geçerli)
insert into public.appointments (id, branch_id, user_id, vehicle_id, service_id, baslangic, durum) values
  ('99000000-0000-0000-0000-0000000000a1'::uuid,
   'aa000000-0000-0000-0000-0000000000b1'::uuid,
   'cc000000-0000-0000-0000-0000000000c1'::uuid,
   'ee000000-0000-0000-0000-0000000000e1'::uuid,
   '55000000-0000-0000-0000-0000000000f1'::uuid,
   '2026-07-01 09:00+03', 'onayli');

-- Randevu 2: Şube A, S2 (kampanya Şube B'ye özel → geçerli değil)
insert into public.appointments (id, branch_id, user_id, vehicle_id, service_id, baslangic, durum) values
  ('99000000-0000-0000-0000-0000000000a2'::uuid,
   'aa000000-0000-0000-0000-0000000000b1'::uuid,
   'cc000000-0000-0000-0000-0000000000c1'::uuid,
   'ee000000-0000-0000-0000-0000000000e1'::uuid,
   '55000000-0000-0000-0000-0000000000f2'::uuid,
   '2026-07-01 10:00+03', 'onayli');

insert into public.jobs (id, appointment_id, durum) values
  ('33000000-0000-0000-0000-0000000000d1'::uuid, '99000000-0000-0000-0000-0000000000a1'::uuid, 'basladi'),
  ('33000000-0000-0000-0000-0000000000d2'::uuid, '99000000-0000-0000-0000-0000000000a2'::uuid, 'basladi');

-- ============================================================
-- 1) İş hazır → hizmet puanı (40) + genel kampanya bonusu (15) = 55
-- ============================================================
update public.jobs set durum = 'hazir'
  where id = '33000000-0000-0000-0000-0000000000d1'::uuid;

select is(
  (select coalesce(sum(puan_degisim), 0)::int from public.loyalty_ledger
   where ref = 'job:33000000-0000-0000-0000-0000000000d1'),
  55, 'İş hazır: hizmet puanı + kampanya bonusu (40 + 15 = 55)');

-- ============================================================
-- 2) Şube filtresi: Şube B'ye özel kampanya, Şube A işine eklenmez → sadece 40
-- ============================================================
update public.jobs set durum = 'hazir'
  where id = '33000000-0000-0000-0000-0000000000d2'::uuid;

select is(
  (select coalesce(sum(puan_degisim), 0)::int from public.loyalty_ledger
   where ref = 'job:33000000-0000-0000-0000-0000000000d2'),
  40, 'Başka şubeye özel kampanya bonusu eklenmez (yalnız taban 40)');

-- ============================================================
-- 3) Çift tetik idempotent (tek kayıt)
-- ============================================================
update public.jobs set durum = 'tamamlandi'
  where id = '33000000-0000-0000-0000-0000000000d1'::uuid;

select is(
  (select count(*)::int from public.loyalty_ledger
   where ref = 'job:33000000-0000-0000-0000-0000000000d1'),
  1, 'Çift tetik idempotent (tek puan kaydı)');

select * from finish();
rollback;
