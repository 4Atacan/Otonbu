-- ============================================================
-- Faz 3 — TASLAK ödeme akışı testi (pgTAP)
-- Kapsam: abonelik_taslak_basla → abonelik 'aktif' + dönem hakları + payment;
--         tekrar abone olma engeli; app_ayar bayrağı kapalıyken reddetme.
-- Çalıştırma: supabase test db
-- ============================================================
begin;

select plan(9);

-- ------------------------------------------------------------
-- Test verisi (RLS bypass: test runner tablo sahibidir)
-- ------------------------------------------------------------
insert into public.branches (id, ad) values
  ('a0000000-0000-0000-0000-0000000000c1'::uuid, 'Şube T');

insert into auth.users (id, email, email_confirmed_at, role, aud) values
  ('c1000000-0000-0000-0000-0000000000c1'::uuid, 'taslak-musteri@test.local', now(), 'authenticated', 'authenticated');

insert into public.users (id, branch_id, telefon, rol, ad_soyad) values
  ('c1000000-0000-0000-0000-0000000000c1'::uuid, null, '+905550000099', 'musteri', 'Taslak Müşteri')
on conflict (id) do update set rol = excluded.rol;

insert into public.services (id, ad, kategori, taban_fiyat) values
  ('51000000-0000-0000-0000-0000000000c1'::uuid, 'Taslak Yıkama', 'yikama', 250);

-- Plan ayda 3 hak verir
insert into public.plans (id, ad, kademe, aylik_ucret) values
  ('d1000000-0000-0000-0000-0000000000c1'::uuid, 'Taslak Paket', 'temel', 250);
insert into public.plan_haklari (plan_id, service_id, aylik_adet) values
  ('d1000000-0000-0000-0000-0000000000c1'::uuid, '51000000-0000-0000-0000-0000000000c1'::uuid, 3);

-- ------------------------------------------------------------
-- Müşteri taslak ile abone olur
-- ------------------------------------------------------------
set local role authenticated;
set local "request.jwt.claims" to
  '{"sub":"c1000000-0000-0000-0000-0000000000c1","role":"authenticated","aud":"authenticated"}';

select lives_ok(
  $$select public.abonelik_taslak_basla(
      'd1000000-0000-0000-0000-0000000000c1'::uuid,
      'a0000000-0000-0000-0000-0000000000c1'::uuid)$$,
  'Taslak ile abone olunur');

select is(
  (select durum from public.subscriptions
   where user_id = 'c1000000-0000-0000-0000-0000000000c1'::uuid),
  'aktif', 'Abonelik aktif oldu (ödeme simüle edildi)');

select is(
  (select kalan_adet from public.entitlements e
   join public.subscriptions s on s.id = e.subscription_id
   where s.user_id = 'c1000000-0000-0000-0000-0000000000c1'::uuid
     and e.service_id = '51000000-0000-0000-0000-0000000000c1'::uuid),
  3, 'Bu dönemin hakları üretildi (3)');

select is(
  (select count(*)::int from public.payments
   where user_id = 'c1000000-0000-0000-0000-0000000000c1'::uuid),
  1, 'Taslak ödeme kaydı oluştu');

-- Aynı şubede ikinci kez abone olunamaz
select throws_ok(
  $$select public.abonelik_taslak_basla(
      'd1000000-0000-0000-0000-0000000000c1'::uuid,
      'a0000000-0000-0000-0000-0000000000c1'::uuid)$$,
  'P0001', null, 'Aynı şubede ikinci abonelik engellenir');

-- ------------------------------------------------------------
-- Bayrak kapalıyken taslak reddedilir
-- ------------------------------------------------------------
reset role;
update public.app_ayar set deger = 'kapali' where anahtar = 'odeme_taslak_modu';

set local role authenticated;
set local "request.jwt.claims" to
  '{"sub":"c1000000-0000-0000-0000-0000000000c1","role":"authenticated","aud":"authenticated"}';

select throws_ok(
  $$select public.abonelik_taslak_basla(
      'd1000000-0000-0000-0000-0000000000c1'::uuid,
      'a0000000-0000-0000-0000-0000000000c1'::uuid)$$,
  'P0001', null, 'Taslak modu kapalıyken reddedilir');

-- Müşteri app_ayar'ı değiştiremez: RLS yazımı 0 satır etkiler, değer korunur.
update public.app_ayar set deger = 'acik' where anahtar = 'odeme_taslak_modu';
select is(
  (select deger from public.app_ayar where anahtar = 'odeme_taslak_modu'),
  'kapali', 'Müşteri özellik bayrağını değiştiremez (değer korunur)');

-- ------------------------------------------------------------
-- Müşteri kendi aboneliğini iptal eder (abonelik_iptal RPC)
-- ------------------------------------------------------------
select lives_ok(
  $$select public.abonelik_iptal(
      (select id from public.subscriptions
       where user_id = 'c1000000-0000-0000-0000-0000000000c1'::uuid limit 1))$$,
  'Müşteri aboneliğini iptal eder');

select is(
  (select durum from public.subscriptions
   where user_id = 'c1000000-0000-0000-0000-0000000000c1'::uuid),
  'iptal', 'Abonelik iptal oldu (soft)');

select * from finish();
rollback;
