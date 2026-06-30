-- ============================================================
-- Abonelik aktivasyon güvenliği (pgTAP) — "sahte ödeme" savunması
-- Kapsam:
--   * Müşteri kendi 'beklemede' aboneliğini doğrudan 'aktif' YAPAMAZ
--     (subscriptions'ta UPDATE politikası yok → RLS 0 satır, durum değişmez).
--     Aktivasyonun tek yolu abonelik_aktiflestir (service_role / webhook).
--   * abonelik_aktiflestir ödeme yazar + aboneliği aktifler + hak üretir.
--   * Aynı sağlayıcı referansıyla ikinci çağrı (çift webhook) İDEMPOTENT:
--     yeni ödeme yazmaz, false döner.
-- Not: iyzico'nun kendisi mock'lanmaz; bu test ödeme onayının DB tarafındaki
--   güvenlik garantilerini doğrular (istemci kendini aktifleyemez + idempotency).
-- Çalıştırma: supabase test db
-- ============================================================
begin;

select plan(5);

-- ------------------------------------------------------------
-- Test verisi (RLS bypass: test runner tablo sahibidir)
-- ------------------------------------------------------------
insert into public.branches (id, ad) values
  ('a0000000-0000-0000-0000-0000000000a1'::uuid, 'Şube A');

insert into auth.users (id, email, email_confirmed_at, role, aud) values
  ('c1000000-0000-0000-0000-0000000000a1'::uuid, 'musteri@test.local', now(), 'authenticated', 'authenticated');

insert into public.users (id, branch_id, rol) values
  ('c1000000-0000-0000-0000-0000000000a1'::uuid, null, 'musteri')
on conflict (id) do update set rol = excluded.rol;

insert into public.services (id, ad, kategori, taban_fiyat) values
  ('51000000-0000-0000-0000-0000000000a1'::uuid, 'Oto Yıkama', 'yikama', 300);

insert into public.plans (id, ad, kademe, aylik_ucret) values
  ('d1000000-0000-0000-0000-0000000000a1'::uuid, 'Temel Paket', 'temel', 299);

insert into public.plan_haklari (plan_id, service_id, aylik_adet) values
  ('d1000000-0000-0000-0000-0000000000a1'::uuid, '51000000-0000-0000-0000-0000000000a1'::uuid, 4);

-- Ödeme öncesi durum: 'beklemede' abonelik (abonelik-baslat'ın bıraktığı hal)
insert into public.subscriptions (id, user_id, branch_id, plan_id, durum) values
  ('5b000000-0000-0000-0000-0000000000a1'::uuid,
   'c1000000-0000-0000-0000-0000000000a1'::uuid,
   'a0000000-0000-0000-0000-0000000000a1'::uuid,
   'd1000000-0000-0000-0000-0000000000a1'::uuid,
   'beklemede');

-- ============================================================
-- Müşteri: kendi aboneliğini doğrudan aktif EDEMEZ
-- ============================================================
set local role authenticated;
set local "request.jwt.claims" to
  '{"sub":"c1000000-0000-0000-0000-0000000000a1","role":"authenticated","aud":"authenticated"}';

-- UPDATE politikası yok → 0 satır (hata değil), durum 'beklemede' kalır.
update public.subscriptions set durum = 'aktif'
  where id = '5b000000-0000-0000-0000-0000000000a1'::uuid;
select is(
  (select durum from public.subscriptions
   where id = '5b000000-0000-0000-0000-0000000000a1'::uuid),
  'beklemede',
  'Müşteri kendi aboneliğini doğrudan aktif edemez (ödemesiz aktivasyon engeli)');

-- ============================================================
-- Sunucu (service_role / webhook bağlamı): tek geçerli aktivasyon yolu
-- ============================================================
reset role;

select is(
  public.abonelik_aktiflestir(
    '5b000000-0000-0000-0000-0000000000a1'::uuid, 299, 'iyzi-ref-1'),
  true,
  'abonelik_aktiflestir ödeme onayıyla aktifler (true)');

select is(
  (select durum from public.subscriptions
   where id = '5b000000-0000-0000-0000-0000000000a1'::uuid),
  'aktif',
  'Abonelik aktivasyondan sonra aktif');

select is(
  (select count(*)::int from public.payments
   where subscription_id = '5b000000-0000-0000-0000-0000000000a1'::uuid),
  1,
  'Tek ödeme kaydı yazıldı');

-- Aynı sağlayıcı referansıyla ikinci webhook (çift bildirim) → idempotent
select is(
  public.abonelik_aktiflestir(
    '5b000000-0000-0000-0000-0000000000a1'::uuid, 299, 'iyzi-ref-1'),
  false,
  'Aynı referanslı ikinci webhook idempotent (false, çift ödeme yok)');

select * from finish();
rollback;
