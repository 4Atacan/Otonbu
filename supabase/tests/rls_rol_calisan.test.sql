-- ============================================================
-- Rol sadeleştirme — ÇALIŞAN rolü izolasyon testleri (pgTAP)
-- Kapsam (migration 20260627000001_rol_sadelestir):
--   * calisan kendi şubesinin randevu + işini GÖRÜR ve İŞ ÇALIŞIR
--   * calisan sipariş / sigorta / pasif ürün GÖRMEZ ("yalnız randevu + iş")
--   * calisan randevuyu YÖNETEMEZ (onay/iptal) — yalnız yönetici
--   * calisan ürün ekleyemez (yönetim yetkisi yok)
--   * karşıt: yönetici sipariş/sigortayı görür, randevuyu onaylar
-- Çalıştırma: supabase test db
-- ============================================================
begin;

select plan(11);

-- ------------------------------------------------------------
-- Test verisi (RLS bypass: test runner tablo sahibidir)
-- ------------------------------------------------------------
insert into public.branches (id, ad) values
  ('a0000000-0000-0000-0000-0000000000a1'::uuid, 'Şube A');

insert into auth.users (id, email, email_confirmed_at, role, aud) values
  ('a1000000-0000-0000-0000-0000000000a1'::uuid, 'yonetici-a@test.local', now(), 'authenticated', 'authenticated'),
  ('c5000000-0000-0000-0000-0000000000a1'::uuid, 'calisan-a@test.local',  now(), 'authenticated', 'authenticated'),
  ('c1000000-0000-0000-0000-0000000000a1'::uuid, 'musteri@test.local',    now(), 'authenticated', 'authenticated');

insert into public.users (id, branch_id, email, rol) values
  ('a1000000-0000-0000-0000-0000000000a1'::uuid, 'a0000000-0000-0000-0000-0000000000a1'::uuid, 'yonetici-a@test.local', 'yonetici'),
  ('c5000000-0000-0000-0000-0000000000a1'::uuid, 'a0000000-0000-0000-0000-0000000000a1'::uuid, 'calisan-a@test.local',  'calisan'),
  ('c1000000-0000-0000-0000-0000000000a1'::uuid, null, 'musteri@test.local', 'musteri')
on conflict (id) do update
  set branch_id = excluded.branch_id, rol = excluded.rol, email = excluded.email;

insert into public.services (id, ad, kategori, taban_fiyat) values
  ('51000000-0000-0000-0000-0000000000a1'::uuid, 'Oto Yıkama', 'yikama', 300);

insert into public.vehicles (id, user_id, plaka, segment) values
  ('e1000000-0000-0000-0000-0000000000a1'::uuid, 'c1000000-0000-0000-0000-0000000000a1'::uuid, 'TEST34', 'kucuk');

-- Müşterinin Şube A'da randevusu (beklemede — onay testi için)
insert into public.appointments (id, branch_id, user_id, vehicle_id, service_id, baslangic, durum) values
  ('90000000-0000-0000-0000-0000000000a1'::uuid,
   'a0000000-0000-0000-0000-0000000000a1'::uuid,
   'c1000000-0000-0000-0000-0000000000a1'::uuid,
   'e1000000-0000-0000-0000-0000000000a1'::uuid,
   '51000000-0000-0000-0000-0000000000a1'::uuid,
   '2026-07-01 09:00+03', 'beklemede');

-- Bu randevu için bir iş (çalışan görür + ilerletir)
insert into public.jobs (id, appointment_id, durum) values
  ('30000000-0000-0000-0000-0000000000a1'::uuid,
   '90000000-0000-0000-0000-0000000000a1'::uuid, 'basladi');

-- Müşterinin Şube A'da siparişi + sigorta talebi (çalışan GÖRMEMELİ)
insert into public.orders (id, branch_id, user_id, toplam) values
  ('05000000-0000-0000-0000-0000000000a1'::uuid,
   'a0000000-0000-0000-0000-0000000000a1'::uuid,
   'c1000000-0000-0000-0000-0000000000a1'::uuid, 100);

insert into public.insurance_requests (id, branch_id, user_id, tip, kvkk_riza_at) values
  ('15000000-0000-0000-0000-0000000000a1'::uuid,
   'a0000000-0000-0000-0000-0000000000a1'::uuid,
   'c1000000-0000-0000-0000-0000000000a1'::uuid, 'kasko', now());

-- P1 aktif (vitrinde), P2 pasif (yalnız yönetici görür)
insert into public.products (id, branch_id, ad, fiyat, stok, aktif) values
  ('d1000000-0000-0000-0000-0000000000a1'::uuid, 'a0000000-0000-0000-0000-0000000000a1'::uuid, 'Cam Suyu', 100, 5, true),
  ('d2000000-0000-0000-0000-0000000000a1'::uuid, 'a0000000-0000-0000-0000-0000000000a1'::uuid, 'Pasif Ürün', 50, 3, false);

-- ============================================================
-- ÇALIŞAN (Şube A): randevu + iş görür/çalışır; mağaza/sigorta görmez
-- ============================================================
set local role authenticated;
set local "request.jwt.claims" to
  '{"sub":"c5000000-0000-0000-0000-0000000000a1","role":"authenticated","aud":"authenticated"}';

select is((select count(*)::int from public.appointments), 1,
  'Çalışan kendi şubesinin randevusunu görür');

select is((select count(*)::int from public.jobs), 1,
  'Çalışan kendi şubesinin işini görür');

select lives_ok(
  $$update public.jobs set durum = 'tamamlandi'
    where id = '30000000-0000-0000-0000-0000000000a1'::uuid$$,
  'Çalışan işi ilerletir (iş çalışması)');

select is((select count(*)::int from public.orders), 0,
  'Çalışan sipariş görmez (yalnız randevu + iş)');

select is((select count(*)::int from public.insurance_requests), 0,
  'Çalışan sigorta teklifini görmez');

select is((select count(*)::int from public.products), 1,
  'Çalışan yalnız aktif ürünü görür (pasif ürün gizli — yönetim erişimi yok)');

select throws_ok(
  $$insert into public.products (branch_id, ad, fiyat, stok)
    values ('a0000000-0000-0000-0000-0000000000a1'::uuid, 'Kaçak Ürün', 10, 1)$$,
  '42501', null,
  'Çalışan ürün ekleyemez (yönetim yetkisi yöneticide)');

-- Randevu yönetimi: RLS update politikası eşleşmez → 0 satır (hata değil),
-- durum DEĞİŞMEZ. Çalışan onaylayamaz.
update public.appointments set durum = 'onayli'
  where id = '90000000-0000-0000-0000-0000000000a1'::uuid;
select is(
  (select durum from public.appointments
   where id = '90000000-0000-0000-0000-0000000000a1'::uuid),
  'beklemede',
  'Çalışan randevuyu onaylayamaz (durum beklemede kalır)');

-- ============================================================
-- YÖNETİCİ (Şube A): mağaza/sigortayı görür, randevuyu onaylar (karşıt)
-- ============================================================
reset role;
set local role authenticated;
set local "request.jwt.claims" to
  '{"sub":"a1000000-0000-0000-0000-0000000000a1","role":"authenticated","aud":"authenticated"}';

select is((select count(*)::int from public.orders), 1,
  'Yönetici şubesinin siparişini görür');

select is((select count(*)::int from public.insurance_requests), 1,
  'Yönetici şubesinin sigorta teklifini görür');

select lives_ok(
  $$update public.appointments set durum = 'onayli'
    where id = '90000000-0000-0000-0000-0000000000a1'::uuid$$,
  'Yönetici randevuyu onaylar');

select * from finish();
rollback;
