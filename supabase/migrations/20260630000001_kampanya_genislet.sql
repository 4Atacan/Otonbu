-- ============================================================
-- Kampanya zenginleştirme: admin panelinden yönetilebilen,
-- görselli, mekanikli kampanyalar.
--   * tip: kampanyanın ne sunduğu
--       'duyuru'  → sade tanıtım banner'ı (mekanik yok)
--       'indirim' → belirli bir hizmette % fiyat indirimi
--       'puan'    → belirli bir hizmette ekstra sadakat puanı
--       'hediye'  → "şu hizmette cam suyu hediye" gibi yan fayda
--   * hizmet_id: kampanyanın bağlı olduğu hizmet (NULL = genel)
--   * gorsel: campaign-images bucket'ındaki obje yolu (Starbucks tarzı banner)
--
-- KURAL: Kampanyalar abonelikten BAĞIMSIZDIR. Abonelik hakkı (entitlements)
-- ile karıştırılmaz; ödeme/abonelik tablolarına dokunmaz. Yalnızca pazarlama
-- + (ileride) randevu/sipariş ekranında bilgilendirme amaçlıdır.
-- ============================================================

alter table public.campaigns
  add column if not exists tip text not null default 'duyuru'
    check (tip in ('duyuru', 'indirim', 'puan', 'hediye')),
  add column if not exists hizmet_id uuid references public.services(id) on delete set null,
  add column if not exists indirim_yuzde int,
  add column if not exists bonus_puan int,
  add column if not exists hediye text,
  add column if not exists gorsel text;

-- Mekanik tutarlılığı: tipine uygun alan dolu olmalı (esnek ama mantıklı).
alter table public.campaigns
  drop constraint if exists campaigns_mekanik_chk;
alter table public.campaigns
  add constraint campaigns_mekanik_chk check (
    (tip <> 'indirim' or (indirim_yuzde is not null and indirim_yuzde between 1 and 90))
    and (tip <> 'puan' or (bonus_puan is not null and bonus_puan > 0))
    and (tip <> 'hediye' or (hediye is not null and length(btrim(hediye)) > 0))
  );

-- ------------------------------------------------------------
-- campaign-images: PUBLIC bucket (service-images deseni).
-- Kampanya banner'ı kişisel veri değil; herkes görür. Yazma yalnız admin.
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'campaign-images', 'campaign-images', true,
  5242880,                                        -- 5 MB
  array['image/jpeg', 'image/png']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy campaign_images_obj_select on storage.objects
  for select using (bucket_id = 'campaign-images');

create policy campaign_images_obj_insert on storage.objects
  for insert with check (
    bucket_id = 'campaign-images' and public.auth_role() = 'admin'
  );

create policy campaign_images_obj_update on storage.objects
  for update using (
    bucket_id = 'campaign-images' and public.auth_role() = 'admin'
  );

create policy campaign_images_obj_delete on storage.objects
  for delete using (
    bucket_id = 'campaign-images' and public.auth_role() = 'admin'
  );
