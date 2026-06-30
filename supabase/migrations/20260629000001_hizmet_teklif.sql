-- ============================================================
-- Hizmet teklif usulü (fiyat verilemeyen hizmetler için "iletişime geç")
--
-- KARAR: Bazı hizmetlerde fiyat araca göre değişir; sabit fiyat verilemez.
--   Böyle hizmetler services.teklif_usulu = true ile işaretlenir. Müşteri
--   bunlarda RANDEVU ALMAZ; sigorta sekmesindeki gibi bir TEKLİF TALEBİ
--   bırakır, şube geri döner (telefonla). service_quotes tablosu bu talebi tutar.
--
-- KVKK: ad/telefon/plaka kişisel veri → açık rıza zamanı + ayrı ticari ileti
--   izni + soft delete. Sigorta (insurance_requests) ile aynı desen.
-- Franchise: talep bir şubeye aittir (branch_id zorunlu) → yönetici yalnız
--   kendi şubesinin talebini görür/yönetir (RLS).
-- Sıra: services kolonu → tablo → RLS
-- ============================================================

-- ------------------------------------------------------------
-- 1) services: teklif usulü bayrağı
-- ------------------------------------------------------------
alter table public.services
  add column if not exists teklif_usulu boolean not null default false;

comment on column public.services.teklif_usulu is
  'true ise sabit fiyat yok; müşteri randevu yerine teklif talebi bırakır (service_quotes).';

-- ------------------------------------------------------------
-- 2) service_quotes: hizmet teklif talebi (iletişim formu)
-- ------------------------------------------------------------
create table if not exists public.service_quotes (
  id                uuid primary key default gen_random_uuid(),
  branch_id         uuid not null references public.branches(id),       -- talebin gittiği şube
  user_id           uuid not null references public.users(id) on delete cascade,
  service_id        uuid not null references public.services(id),
  vehicle_id        uuid references public.vehicles(id) on delete set null,
  ad_soyad          text,        -- KİŞİSEL VERİ (iletişim snapshot)
  telefon           text,        -- KİŞİSEL VERİ
  plaka             text,        -- KİŞİSEL VERİ (araç snapshot)
  arac_detay        text,        -- marka/model/yıl serbest metin
  musteri_not       text,
  durum             text not null default 'yeni'
                    check (durum in ('yeni','arandi','teklif_verildi','kapandi')),
  kvkk_riza_at      timestamptz,                       -- açık rıza zamanı (KVKK)
  ticari_ileti_izni boolean not null default false,    -- uygulama rızasından AYRI izin
  silindi_mi        boolean not null default false,    -- KVKK soft delete
  created_at        timestamptz not null default now()
);
create index if not exists service_quotes_branch_idx  on public.service_quotes(branch_id);
create index if not exists service_quotes_user_idx     on public.service_quotes(user_id);
create index if not exists service_quotes_service_idx  on public.service_quotes(service_id);

-- ------------------------------------------------------------
-- 3) RLS: müşteri kendi talebini oluşturur/görür; yönetici + admin
--    (şubesindekini) görür ve durum günceller. Çalışan GÖRMEZ
--    (yalnız randevu + iş — rol modeli 20260627000001 ile uyumlu).
-- ------------------------------------------------------------
alter table public.service_quotes enable row level security;

create policy quotes_select on public.service_quotes
  for select using (
    user_id = auth.uid()
    or public.auth_role() = 'admin'
    or (public.auth_role() = 'yonetici' and branch_id = public.auth_branch())
  );

create policy quotes_insert_self on public.service_quotes
  for insert with check (user_id = auth.uid());

create policy quotes_staff_update on public.service_quotes
  for update using (
    public.auth_role() = 'admin'
    or (public.auth_role() = 'yonetici' and branch_id = public.auth_branch())
  ) with check (
    public.auth_role() = 'admin'
    or (public.auth_role() = 'yonetici' and branch_id = public.auth_branch())
  );
