-- ============================================================
-- Bildirim sistemi RLS + tetikleyici testleri (pgTAP)
-- Kapsam (migration 20260703000002_bildirimler):
--   * Randevu INSERT → yalnız o şubenin yöneticisine bildirim düşer.
--   * Randevu onaylanınca müşteriye bildirim düşer.
--   * Herkes yalnız KENDİ bildirimini görür (franchise + kişi izolasyonu).
--   * İstemci notifications'a doğrudan INSERT edemez (yalnız sunucu yazar).
--   * Müşteri kendi bildirimini okundu işaretleyebilir.
-- Çalıştırma: supabase test db
-- ============================================================
begin;

select plan(8);

insert into public.branches (id, ad) values
  ('a0000000-0000-0000-0000-0000000000a1'::uuid, 'Şube A'),
  ('b0000000-0000-0000-0000-0000000000b1'::uuid, 'Şube B');

insert into auth.users (id, email, email_confirmed_at, role, aud) values
  ('a1000000-0000-0000-0000-0000000000a1'::uuid, 'yonetici-a@test.local', now(), 'authenticated', 'authenticated'),
  ('b1000000-0000-0000-0000-0000000000b1'::uuid, 'yonetici-b@test.local', now(), 'authenticated', 'authenticated'),
  ('c1000000-0000-0000-0000-0000000000c1'::uuid, 'musteri@test.local',    now(), 'authenticated', 'authenticated');

insert into public.users (id, branch_id, rol) values
  ('a1000000-0000-0000-0000-0000000000a1'::uuid, 'a0000000-0000-0000-0000-0000000000a1'::uuid, 'yonetici'),
  ('b1000000-0000-0000-0000-0000000000b1'::uuid, 'b0000000-0000-0000-0000-0000000000b1'::uuid, 'yonetici'),
  ('c1000000-0000-0000-0000-0000000000c1'::uuid, null, 'musteri')
on conflict (id) do update set branch_id = excluded.branch_id, rol = excluded.rol;

insert into public.services (id, ad, kategori, taban_fiyat) values
  ('51000000-0000-0000-0000-000000000051'::uuid, 'Test Yıkama', 'yikama', 100);

insert into public.vehicles (id, user_id, plaka, arac_cinsi) values
  ('e1000000-0000-0000-0000-0000000000e1'::uuid,
   'c1000000-0000-0000-0000-0000000000c1'::uuid, '54 TST 001', 'sedan');

-- ============================================================
-- Müşteri randevu talebi oluşturur → trigger şube yöneticisine bildirim atar
-- ============================================================
set local role authenticated;
set local "request.jwt.claims" to
  '{"sub":"c1000000-0000-0000-0000-0000000000c1","role":"authenticated","aud":"authenticated"}';

select lives_ok(
  $$insert into public.appointments
      (id, branch_id, user_id, vehicle_id, service_id, durum, baslangic)
    values
      ('f1000000-0000-0000-0000-0000000000f1'::uuid,
       'a0000000-0000-0000-0000-0000000000a1'::uuid,
       'c1000000-0000-0000-0000-0000000000c1'::uuid,
       'e1000000-0000-0000-0000-0000000000e1'::uuid,
       '51000000-0000-0000-0000-000000000051'::uuid,
       'beklemede', now() + interval '1 day')$$,
  'Müşteri randevu talebi oluşturur (bildirim trigger''ı işlemi bozmaz)');

-- Müşteri: talep bildirimi KENDİNE gitmez
select is((select count(*)::int from public.notifications), 0,
  'Talep bildirimi müşteriye düşmez');

-- İstemci notifications''a doğrudan yazamaz (insert politikası yok)
select throws_ok(
  $$insert into public.notifications (user_id, baslik, govde)
    values ('c1000000-0000-0000-0000-0000000000c1'::uuid, 'Sahte', 'bildirim')$$,
  '42501', null, 'İstemci notifications''a doğrudan insert edemez');

-- ============================================================
-- Yönetici A: bildirimi görür; Yönetici B (başka şube) görmez
-- ============================================================
reset role;
set local role authenticated;
set local "request.jwt.claims" to
  '{"sub":"a1000000-0000-0000-0000-0000000000a1","role":"authenticated","aud":"authenticated"}';

select is((select count(*)::int from public.notifications
           where baslik = 'Yeni randevu talebi'), 1,
  'Şube yöneticisine "Yeni randevu talebi" bildirimi düşer');

-- Yönetici A randevuyu onaylar → müşteriye bildirim
select lives_ok(
  $$update public.appointments set durum = 'onayli'
    where id = 'f1000000-0000-0000-0000-0000000000f1'::uuid$$,
  'Yönetici randevuyu onaylar');

reset role;
set local role authenticated;
set local "request.jwt.claims" to
  '{"sub":"b1000000-0000-0000-0000-0000000000b1","role":"authenticated","aud":"authenticated"}';

select is((select count(*)::int from public.notifications), 0,
  'Başka şubenin yöneticisi bildirimi görmez (franchise izolasyonu)');

-- ============================================================
-- Müşteri: onay bildirimini görür + okundu işaretler
-- ============================================================
reset role;
set local role authenticated;
set local "request.jwt.claims" to
  '{"sub":"c1000000-0000-0000-0000-0000000000c1","role":"authenticated","aud":"authenticated"}';

select is((select count(*)::int from public.notifications
           where baslik = 'Randevun onaylandı'), 1,
  'Onaylanınca müşteriye "Randevun onaylandı" bildirimi düşer');

update public.notifications set okundu_mu = true where okundu_mu = false;
select is((select count(*)::int from public.notifications where okundu_mu = false), 0,
  'Müşteri kendi bildirimini okundu işaretler');

select * from finish();
rollback;
