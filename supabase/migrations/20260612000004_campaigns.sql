-- ============================================================
-- Kampanyalar: müşteri uygulamasındaki Kampanyalar sekmesi.
-- İçerik ileride yönetim panelinden (admin) girilecek; şimdilik
-- tablo + RLS hazır, ekran boş durumu gösterir.
-- branch_id NULL = tüm şubelerde geçerli genel kampanya.
-- ============================================================

create table if not exists public.campaigns (
  id         uuid primary key default gen_random_uuid(),
  branch_id  uuid references public.branches(id) on delete cascade,
  baslik     text not null,
  aciklama   text,
  baslangic  date,
  bitis      date,
  aktif      boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists campaigns_aktif_idx on public.campaigns (aktif, created_at);

alter table public.campaigns enable row level security;

-- Aktif kampanyaları herkes okur; pasif/taslak olanları sadece admin
create policy campaigns_select on public.campaigns
  for select using (aktif = true or public.auth_role() = 'admin');

-- Yazma sadece admin (ileride yönetim paneli)
create policy campaigns_admin on public.campaigns
  for all using (public.auth_role() = 'admin');
