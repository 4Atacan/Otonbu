-- ============================================================
-- Kampanyalar (campaigns) RLS + mekanik kısıtı testleri (pgTAP)
-- Kapsam (migration 20260630000001_kampanya_genislet):
--   * Admin kampanya ekler/günceller (merkez yönetim).
--   * Müşteri yalnız AKTİF kampanyaları görür; pasif olanları görmez.
--   * Müşteri kampanya yazamaz (yalnız admin).
--   * Mekanik kısıtı: tip='indirim' ise indirim_yuzde zorunlu (check).
-- Çalıştırma: supabase test db
-- ============================================================
begin;

select plan(8);

insert into auth.users (id, email, email_confirmed_at, role, aud) values
  ('ad000000-0000-0000-0000-0000000000a1'::uuid, 'admin@test.local',    now(), 'authenticated', 'authenticated'),
  ('11000000-0000-0000-0000-000000000c01'::uuid, 'musteri@test.local',  now(), 'authenticated', 'authenticated');

insert into public.users (id, branch_id, rol) values
  ('ad000000-0000-0000-0000-0000000000a1'::uuid, null, 'admin'),
  ('11000000-0000-0000-0000-000000000c01'::uuid, null, 'musteri')
on conflict (id) do update set branch_id = excluded.branch_id, rol = excluded.rol;

-- kampanya_indirim() testi için bir hizmet (FK hedefi)
insert into public.services (id, ad, kategori, taban_fiyat) values
  ('cafe0000-0000-0000-0000-000000000001'::uuid, 'Test Yıkama', 'yikama', 500);

-- ============================================================
-- Admin: aktif + pasif kampanya ekler
-- ============================================================
set local role authenticated;
set local "request.jwt.claims" to
  '{"sub":"ad000000-0000-0000-0000-0000000000a1","role":"authenticated","aud":"authenticated"}';

select lives_ok(
  $$insert into public.campaigns (baslik, tip, aktif)
    values ('Yaz indirimi', 'duyuru', true)$$,
  'Admin aktif kampanya ekler');

select lives_ok(
  $$insert into public.campaigns (baslik, tip, aktif)
    values ('Taslak kampanya', 'duyuru', false)$$,
  'Admin pasif (taslak) kampanya ekler');

-- Mekanik kısıtı: indirim tipinde yüzde zorunlu → check ihlali (23514)
select throws_ok(
  $$insert into public.campaigns (baslik, tip)
    values ('Eksik indirim', 'indirim')$$,
  '23514', null, 'tip=indirim ama indirim_yuzde yoksa kısıt reddeder');

select is((select count(*)::int from public.campaigns), 2,
  'Admin hem aktif hem pasif kampanyayı görür');

-- ============================================================
-- Müşteri: yalnız aktif görür, yazamaz
-- ============================================================
reset role;
set local role authenticated;
set local "request.jwt.claims" to
  '{"sub":"11000000-0000-0000-0000-000000000c01","role":"authenticated","aud":"authenticated"}';

select is((select count(*)::int from public.campaigns), 1,
  'Müşteri yalnız aktif kampanyayı görür (pasif gizli)');

select throws_ok(
  $$insert into public.campaigns (baslik, tip) values ('Kaçak', 'duyuru')$$,
  '42501', null, 'Müşteri kampanya ekleyemez (yalnız admin)');

-- ============================================================
-- kampanya_indirim(): hizmete bağlı aktif indirim doğru dönüyor mu
-- ============================================================
reset role;
set local role authenticated;
set local "request.jwt.claims" to
  '{"sub":"ad000000-0000-0000-0000-0000000000a1","role":"authenticated","aud":"authenticated"}';

insert into public.campaigns (baslik, tip, hizmet_id, indirim_yuzde, aktif)
values ('Hizmet %20', 'indirim', 'cafe0000-0000-0000-0000-000000000001'::uuid, 20, true);

select is(
  public.kampanya_indirim('cafe0000-0000-0000-0000-000000000001'::uuid, null), 20,
  'kampanya_indirim hizmete bağlı aktif indirimi döndürür (%20)');

select is(
  public.kampanya_indirim('00000000-0000-0000-0000-0000000000ff'::uuid, null), 0,
  'kampanya_indirim eşleşmeyen hedef için 0 döndürür');

select * from finish();
rollback;
