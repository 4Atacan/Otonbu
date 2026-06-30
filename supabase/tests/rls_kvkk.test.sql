-- ============================================================
-- Faz 4 — KVKK: consents RLS + hesabimi_sil (anonimleştirme) testleri (pgTAP)
-- Kapsam (migration 20260629000003_faz4_kvkk):
--   * Kullanıcı yalnız kendi rıza kayıtlarını görür; başkasınınkini görmez.
--   * Kullanıcı yalnız kendi adına rıza ekler (başkası adına 42501).
--   * hesabimi_sil: kişisel alanları anonimleştirir + silindi_mi; ödeme kaydı
--     KORUNUR (muhasebe); aktif abonelik iptal olur.
-- Çalıştırma: supabase test db
-- ============================================================
begin;

select plan(9);

-- ------------------------------------------------------------
-- Test verisi (RLS bypass: test runner tablo sahibidir)
-- ------------------------------------------------------------
insert into public.branches (id, ad) values
  ('a0000000-0000-0000-0000-0000000000a1'::uuid, 'Şube A');

insert into auth.users (id, email, email_confirmed_at, role, aud) values
  ('c1000000-0000-0000-0000-0000000000a1'::uuid, 'musteri1@test.local', now(), 'authenticated', 'authenticated'),
  ('c2000000-0000-0000-0000-0000000000a1'::uuid, 'musteri2@test.local', now(), 'authenticated', 'authenticated');

insert into public.users (id, branch_id, email, telefon, ad_soyad, rol) values
  ('c1000000-0000-0000-0000-0000000000a1'::uuid, null, 'musteri1@test.local', '+905550000011', 'Müşteri Bir', 'musteri'),
  ('c2000000-0000-0000-0000-0000000000a1'::uuid, null, 'musteri2@test.local', '+905550000012', 'Müşteri İki', 'musteri')
on conflict (id) do update set ad_soyad = excluded.ad_soyad, email = excluded.email, telefon = excluded.telefon;

-- Profil fotoğrafı: hesabimi_sil sonrası temizlenmeli (KVKK)
update public.users set avatar_url = 'c1000000-0000-0000-0000-0000000000a1/x.jpg'
  where id = 'c1000000-0000-0000-0000-0000000000a1'::uuid;

insert into public.consents (user_id, tip, metin_versiyon, verildi_mi) values
  ('c1000000-0000-0000-0000-0000000000a1'::uuid, 'aydinlatma', 'v1', true),
  ('c2000000-0000-0000-0000-0000000000a1'::uuid, 'aydinlatma', 'v1', true);

insert into public.vehicles (id, user_id, plaka, segment) values
  ('e1000000-0000-0000-0000-0000000000a1'::uuid, 'c1000000-0000-0000-0000-0000000000a1'::uuid, 'TEST34', 'kucuk');

insert into public.plans (id, ad, kademe, aylik_ucret) values
  ('d1000000-0000-0000-0000-0000000000a1'::uuid, 'Temel', 'temel', 299);

insert into public.subscriptions (id, user_id, branch_id, plan_id, durum) values
  ('5b000000-0000-0000-0000-0000000000a1'::uuid,
   'c1000000-0000-0000-0000-0000000000a1'::uuid,
   'a0000000-0000-0000-0000-0000000000a1'::uuid,
   'd1000000-0000-0000-0000-0000000000a1'::uuid, 'aktif');

insert into public.payments (id, subscription_id, user_id, tutar, saglayici_ref) values
  ('fa000000-0000-0000-0000-0000000000a1'::uuid,
   '5b000000-0000-0000-0000-0000000000a1'::uuid,
   'c1000000-0000-0000-0000-0000000000a1'::uuid, 299, 'ref-1');

-- ============================================================
-- Müşteri 1: rıza görünürlüğü + ekleme
-- ============================================================
set local role authenticated;
set local "request.jwt.claims" to
  '{"sub":"c1000000-0000-0000-0000-0000000000a1","role":"authenticated","aud":"authenticated"}';

select is((select count(*)::int from public.consents), 1,
  'Müşteri yalnız kendi rıza kaydını görür');

select is(
  (select count(*)::int from public.consents
   where user_id = 'c2000000-0000-0000-0000-0000000000a1'::uuid),
  0, 'Başka kullanıcının rıza kaydını görmez');

select lives_ok(
  $$insert into public.consents (user_id, tip, metin_versiyon, verildi_mi)
    values ('c1000000-0000-0000-0000-0000000000a1'::uuid, 'ticari_ileti', 'v1', true)$$,
  'Müşteri kendi adına rıza ekler');

select throws_ok(
  $$insert into public.consents (user_id, tip, metin_versiyon, verildi_mi)
    values ('c2000000-0000-0000-0000-0000000000a1'::uuid, 'ticari_ileti', 'v1', true)$$,
  '42501', null, 'Müşteri başkası adına rıza yazamaz');

-- ============================================================
-- Müşteri 1: hesabimi_sil (anonimleştirme)
-- ============================================================
select lives_ok('select public.hesabimi_sil()', 'hesabimi_sil çalışır');

-- Doğrulama: RLS bypass için sahibe dön
reset role;

select is(
  (select ad_soyad from public.users where id = 'c1000000-0000-0000-0000-0000000000a1'::uuid),
  null, 'Ad soyad anonimleştirildi (null)');

select ok(
  (select silindi_mi from public.users where id = 'c1000000-0000-0000-0000-0000000000a1'::uuid),
  'Kullanıcı silindi_mi işaretlendi');

select is(
  (select avatar_url from public.users where id = 'c1000000-0000-0000-0000-0000000000a1'::uuid),
  null, 'Profil fotoğrafı (avatar_url) anonimleştirildi (null)');

select is(
  (select count(*)::int from public.payments
   where user_id = 'c1000000-0000-0000-0000-0000000000a1'::uuid),
  1, 'Ödeme kaydı korundu (muhasebe — anonim kullanıcıya bağlı)');

select * from finish();
rollback;
