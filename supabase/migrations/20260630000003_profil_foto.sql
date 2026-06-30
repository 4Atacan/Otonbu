-- ============================================================
-- Profil fotoğrafı: kullanıcının kendi yüklediği avatar.
--   * users.avatar_url → avatars bucket'ındaki obje yolu ({uid}/...).
--   * avatars: PUBLIC bucket. Avatar düşük hassasiyetli kişisel veridir;
--     yol tahmin edilemez (uuid) ve YAZMA yalnız sahibine açıktır. Public
--     okuma sayesinde yönetici, randevu/iş ekranında müşterinin avatarını
--     imza üretmeden gösterebilir (job-photos gibi private değil — bilinçli
--     tercih: avatar before/after fotoğrafı kadar hassas değil).
--   * KVKK: hesabimi_sil avatar_url'i de temizler (aşağıda yeniden tanımlanır).
-- ============================================================

alter table public.users
  add column if not exists avatar_url text;   -- KİŞİSEL VERİ (profil foto yolu)

-- ------------------------------------------------------------
-- avatars: PUBLIC bucket, yalnız sahibi yazar/güncell/siler.
-- Yol deseni: {auth.uid()}/{dosya}. İlk klasör segmenti sahibinin uid'i olmalı.
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars', 'avatars', true,
  5242880,                                       -- 5 MB
  array['image/jpeg', 'image/png']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy avatars_obj_select on storage.objects
  for select using (bucket_id = 'avatars');

create policy avatars_obj_insert on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy avatars_obj_update on storage.objects
  for update using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy avatars_obj_delete on storage.objects
  for delete using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ------------------------------------------------------------
-- hesabimi_sil: KVKK silme hakkına avatar_url temizliği eklendi.
-- (20260629000003 ile aynı, tek fark: users.avatar_url = null)
-- ------------------------------------------------------------
create or replace function public.hesabimi_sil()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Oturum gerekli'; end if;

  -- Kişisel kimlik alanları (avatar dahil)
  update public.users
    set ad_soyad = null, email = null, telefon = null,
        avatar_url = null, silindi_mi = true
    where id = v_uid;

  -- Araç plakası kişisel veridir
  update public.vehicles
    set plaka = '(silindi)', marka = null, model = null
    where user_id = v_uid;

  -- Teklif/sigorta talepleri (iletişim snapshot'ı)
  update public.insurance_requests
    set ad_soyad = null, telefon = null, plaka = null, arac_detay = null,
        musteri_not = null, silindi_mi = true
    where user_id = v_uid;
  update public.service_quotes
    set ad_soyad = null, telefon = null, plaka = null, arac_detay = null,
        musteri_not = null, silindi_mi = true
    where user_id = v_uid;

  -- Sipariş notu serbest metin → temizle (toplam muhasebe için kalır)
  update public.orders set musteri_not = null where user_id = v_uid;

  -- Aktif abonelikleri durdur (muhasebe kaydı kalır), gelecek randevuları iptal et
  update public.subscriptions set durum = 'iptal'
    where user_id = v_uid and durum <> 'iptal';
  update public.appointments set durum = 'iptal'
    where user_id = v_uid and durum in ('beklemede', 'onayli');

  -- payments: DOKUNULMAZ (muhasebe; artık anonim kullanıcıya bağlı).
end;
$$;

grant execute on function public.hesabimi_sil() to authenticated;
