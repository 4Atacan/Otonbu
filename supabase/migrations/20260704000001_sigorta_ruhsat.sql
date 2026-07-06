-- ============================================================
-- Sigorta/Kasko teklifinde araç RUHSATI eklenmesi
--
-- KARARLAR:
--   * Kasko teklifi için müşteri aracın ruhsatını (görselini) yükler.
--   * Ruhsat KİŞİSEL VERİ içerir (ad, plaka, motor no) → CLAUDE.md kural 6:
--     PRIVATE bucket, signed URL, sunucu tarafı tip (jpg/png) + boyut (5MB) sınırı.
--   * Yol konvansiyonu: "<uid>/<dosya>.jpg" — yolun ilk klasörü yükleyenin uid'i.
--     Yükleme/silme yalnızca sahibinin klasörüne; okuma sahibi + o teklifi
--     görebilen personel (insurance_requests RLS'i exists alt-sorgusunu süzer).
-- ============================================================

-- Teklif kaydına ruhsat dosya yolu (vehicle-docs bucket). KİŞİSEL VERİ.
alter table public.insurance_requests
  add column if not exists ruhsat_url text;

comment on column public.insurance_requests.ruhsat_url is
  'Kasko teklifi için yüklenen araç ruhsatı (vehicle-docs private bucket yolu). KİŞİSEL VERİ.';

-- ------------------------------------------------------------
-- Private bucket: jpeg/png, 5MB.
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'vehicle-docs', 'vehicle-docs', false,
  5242880,                              -- 5 MB
  array['image/jpeg', 'image/png']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ------------------------------------------------------------
-- storage.objects RLS — yalnızca bu bucket için.
-- ------------------------------------------------------------

-- Okuma (signed URL üretimi dahil): dosyanın sahibi VEYA bu dosyayı referans
-- eden bir teklifi görebilen kullanıcı. exists alt-sorgusu insurance_requests
-- RLS'inden (ins_select) geçer → yönetici yalnız kendi şubesinin, admin tümünü.
drop policy if exists vehicle_docs_select on storage.objects;
create policy vehicle_docs_select on storage.objects
  for select using (
    bucket_id = 'vehicle-docs'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1 from public.insurance_requests i where i.ruhsat_url = name
      )
    )
  );

-- Yükleme: yalnızca kendi uid klasörüne.
drop policy if exists vehicle_docs_insert on storage.objects;
create policy vehicle_docs_insert on storage.objects
  for insert with check (
    bucket_id = 'vehicle-docs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Silme (yanlış yükleme düzeltmesi): yalnızca kendi klasöründen.
drop policy if exists vehicle_docs_delete on storage.objects;
create policy vehicle_docs_delete on storage.objects
  for delete using (
    bucket_id = 'vehicle-docs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
