-- ============================================================
-- Faz 2 — job-photos storage bucket (önce/sonra fotoğrafları)
-- CLAUDE.md kural 6: private bucket, signed URL, sunucu tarafı tip+boyut sınırı.
-- Obje yolu konvansiyonu: "<job_id>/<dosya>.jpg" — RLS yolun ilk klasöründen
-- (job_id) işe ulaşıp erişimi işin müşterisi + şube personeliyle sınırlar.
-- ============================================================

-- Private bucket: jpeg/png, 5MB. Panelden elle değil migration ile.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'job-photos', 'job-photos', false,
  5242880,                              -- 5 MB
  array['image/jpeg', 'image/png']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ------------------------------------------------------------
-- storage.objects RLS — yalnızca bu bucket için.
-- Yol: (storage.foldername(name))[1] = job_id
-- ------------------------------------------------------------

-- Okuma (signed URL üretimi dahil): işin müşterisi, şube personeli, admin.
create policy job_photos_obj_select on storage.objects
  for select using (
    bucket_id = 'job-photos'
    and exists (
      select 1 from public.jobs j
      join public.appointments a on a.id = j.appointment_id
      where j.id::text = (storage.foldername(name))[1]
        and (
          a.user_id = auth.uid()
          or public.auth_role() = 'admin'
          or a.branch_id = public.auth_branch()
        )
    )
  );

-- Yükleme: yalnızca admin, işi üstlenen usta veya işin şubesinin personeli.
-- Müşteri foto YÜKLEYEMEZ (yalnızca görür).
create policy job_photos_obj_insert on storage.objects
  for insert with check (
    bucket_id = 'job-photos'
    and exists (
      select 1 from public.jobs j
      join public.appointments a on a.id = j.appointment_id
      where j.id::text = (storage.foldername(name))[1]
        and (
          public.auth_role() = 'admin'
          or j.assigned_to = auth.uid()
          or a.branch_id = public.auth_branch()
        )
    )
  );

-- Silme (yanlış foto düzeltmesi): yükleme ile aynı yetki.
create policy job_photos_obj_delete on storage.objects
  for delete using (
    bucket_id = 'job-photos'
    and exists (
      select 1 from public.jobs j
      join public.appointments a on a.id = j.appointment_id
      where j.id::text = (storage.foldername(name))[1]
        and (
          public.auth_role() = 'admin'
          or j.assigned_to = auth.uid()
          or a.branch_id = public.auth_branch()
        )
    )
  );
