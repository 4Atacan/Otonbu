-- ============================================================
-- Puanla hizmet alımı (randevu ödemesinde 'puan') testleri (pgTAP)
-- Kapsam (migration 20260701000001_puan_harcama):
--   * randevu_olustur p_odeme_yontemi='puan' → bakiye yeterse puan düşer.
--   * Randevu iptal olunca puan iade edilir (trigger).
--   * Yetersiz bakiyede alım reddedilir.
--   * puan_bedeli=0 hizmet puanla alınamaz.
-- Çalıştırma: supabase test db  (önce: npx supabase db reset)
-- ============================================================
begin;

select plan(5);

-- Şube
insert into public.branches (id, ad) values
  ('a0000000-0000-0000-0000-0000000000a1'::uuid, 'Şube A');

-- 2 müşteri
insert into auth.users (id, email, email_confirmed_at, role, aud) values
  ('c1000000-0000-0000-0000-0000000000a1'::uuid, 'm1@test.local', now(), 'authenticated', 'authenticated'),
  ('c2000000-0000-0000-0000-0000000000a1'::uuid, 'm2@test.local', now(), 'authenticated', 'authenticated');

insert into public.users (id, branch_id, rol) values
  ('c1000000-0000-0000-0000-0000000000a1'::uuid, null, 'musteri'),
  ('c2000000-0000-0000-0000-0000000000a1'::uuid, null, 'musteri')
on conflict (id) do update set rol = excluded.rol;

-- 50 puana alınabilir hizmet + puanla alınamaz hizmet (bedel 0)
insert into public.services (id, ad, kategori, taban_fiyat, puan_bedeli, aktif) values
  ('51000000-0000-0000-0000-0000000000a1'::uuid, 'Detaylı Yıkama', 'yikama', 300, 50, true),
  ('52000000-0000-0000-0000-0000000000a1'::uuid, 'Bedelsiz Hizmet', 'yikama', 300, 0, true);

-- Araçlar
insert into public.vehicles (id, user_id, plaka, segment) values
  ('e1000000-0000-0000-0000-0000000000a1'::uuid, 'c1000000-0000-0000-0000-0000000000a1'::uuid, 'TEST34', 'kucuk'),
  ('e2000000-0000-0000-0000-0000000000a1'::uuid, 'c2000000-0000-0000-0000-0000000000a1'::uuid, 'TEST35', 'kucuk');

-- c1'e 100 puan (owner insert → RLS bypass)
insert into public.loyalty_ledger (user_id, puan_degisim, sebep, ref) values
  ('c1000000-0000-0000-0000-0000000000a1'::uuid, 100, 'Test bakiye', 'seed:c1');

-- Gelecek gün için varsayılan programdan geçerli bir slot yakala (program yoksa şablon)
create temp table t_slot as
  select min(m.baslangic) as bas
  from public.musait_slotlar(
    'a0000000-0000-0000-0000-0000000000a1'::uuid,
    '51000000-0000-0000-0000-0000000000a1'::uuid,
    (current_date + 2)) m
  where m.baslangic > now();
grant select on t_slot to public;

-- ============================================================
-- c1: puanla randevu (50 puan düşer)
-- ============================================================
set local role authenticated;
set local "request.jwt.claims" to
  '{"sub":"c1000000-0000-0000-0000-0000000000a1","role":"authenticated","aud":"authenticated"}';

select lives_ok(
  $$ select public.randevu_olustur(
       'a0000000-0000-0000-0000-0000000000a1'::uuid,
       '51000000-0000-0000-0000-0000000000a1'::uuid,
       'e1000000-0000-0000-0000-0000000000a1'::uuid,
       (select bas from t_slot), 'puan') $$,
  'Puanla randevu oluşturulur');

select is(
  (select coalesce(sum(puan_degisim), 0)::int from public.loyalty_ledger
   where user_id = 'c1000000-0000-0000-0000-0000000000a1'::uuid),
  50, 'Puanla randevu 50 puan düştü (100 - 50)');

-- İptal → puan iade
update public.appointments set durum = 'iptal'
  where user_id = 'c1000000-0000-0000-0000-0000000000a1'::uuid;

select is(
  (select coalesce(sum(puan_degisim), 0)::int from public.loyalty_ledger
   where user_id = 'c1000000-0000-0000-0000-0000000000a1'::uuid),
  100, 'Randevu iptali puanı iade etti (100)');

-- ============================================================
-- c2 (0 puan): puanla randevu reddedilir
-- ============================================================
reset role;
set local role authenticated;
set local "request.jwt.claims" to
  '{"sub":"c2000000-0000-0000-0000-0000000000a1","role":"authenticated","aud":"authenticated"}';

select throws_ok(
  $$ select public.randevu_olustur(
       'a0000000-0000-0000-0000-0000000000a1'::uuid,
       '51000000-0000-0000-0000-0000000000a1'::uuid,
       'e2000000-0000-0000-0000-0000000000a1'::uuid,
       (select bas from t_slot), 'puan') $$,
  NULL, 'Yetersiz puanla randevu reddedilir');

-- ============================================================
-- c1: puan_bedeli=0 hizmet puanla alınamaz
-- ============================================================
reset role;
set local role authenticated;
set local "request.jwt.claims" to
  '{"sub":"c1000000-0000-0000-0000-0000000000a1","role":"authenticated","aud":"authenticated"}';

select throws_ok(
  $$ select public.randevu_olustur(
       'a0000000-0000-0000-0000-0000000000a1'::uuid,
       '52000000-0000-0000-0000-0000000000a1'::uuid,
       'e1000000-0000-0000-0000-0000000000a1'::uuid,
       (select bas from t_slot), 'puan') $$,
  NULL, 'puan_bedeli=0 hizmet puanla alınamaz');

select * from finish();
rollback;
