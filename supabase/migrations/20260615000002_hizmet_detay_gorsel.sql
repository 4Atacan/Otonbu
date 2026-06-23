-- ============================================================
-- Hizmet detay zenginleştirme: açıklama + kapak görseli
--   * services.aciklama: "bu hizmette neler yapıyoruz" metni
--   * services.gorsel: service-images bucket'ındaki obje yolu
--   * service-images: PUBLIC bucket — katalog görseli kişisel veri değil,
--     herkes (anon dahil) görür. Yükleme/değiştirme yalnızca admin.
-- (job-photos'tan farkı: o private + signed URL çünkü müşteri verisi;
--  bu marka/katalog görseli, public URL ile sunulur.)
-- ============================================================

alter table public.services
  add column if not exists aciklama text;

alter table public.services
  add column if not exists gorsel text;          -- service-images içindeki yol

-- Public bucket: jpeg/png, 5MB.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'service-images', 'service-images', true,
  5242880,                                        -- 5 MB
  array['image/jpeg', 'image/png']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ------------------------------------------------------------
-- storage.objects RLS — yalnızca bu bucket için.
-- Okuma herkese açık (public katalog); yazma/silme yalnızca admin.
-- ------------------------------------------------------------
create policy service_images_obj_select on storage.objects
  for select using (bucket_id = 'service-images');

create policy service_images_obj_insert on storage.objects
  for insert with check (
    bucket_id = 'service-images' and public.auth_role() = 'admin'
  );

create policy service_images_obj_update on storage.objects
  for update using (
    bucket_id = 'service-images' and public.auth_role() = 'admin'
  );

create policy service_images_obj_delete on storage.objects
  for delete using (
    bucket_id = 'service-images' and public.auth_role() = 'admin'
  );
