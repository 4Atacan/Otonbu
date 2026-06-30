-- ============================================================
-- Faz 4 — Stok takibi + düşük stok uyarısı
--
-- KARAR (kullanıcı): products zaten PERAKENDE (satılan) stoğu tutuyor → ona
--   min_esik (düşük stok eşiği) ekle. stock_items YALNIZ SARF malzemesi için
--   (şampuan, wax, PPF film, mikrofiber — serviste kullanılan, müşteriye satılmayan).
--   Düşük stok uyarısı her ikisini de kapsar: miktar/stok <= min_esik (esik > 0).
-- ============================================================

-- ------------------------------------------------------------
-- 1) products: düşük stok eşiği (perakende)
-- ------------------------------------------------------------
alter table public.products
  add column if not exists min_esik int not null default 0 check (min_esik >= 0);

comment on column public.products.min_esik is
  'Düşük stok eşiği: stok <= min_esik ve min_esik > 0 ise yönetici panelinde uyarı.';

-- ------------------------------------------------------------
-- 2) stock_items: sarf / iç malzeme stoğu (müşteriye satılmaz)
-- ------------------------------------------------------------
create table if not exists public.stock_items (
  id         uuid primary key default gen_random_uuid(),
  branch_id  uuid not null references public.branches(id) on delete cascade,
  ad         text not null,
  tip        text not null default 'sarf' check (tip in ('sarf', 'perakende')),
  miktar     int not null default 0 check (miktar >= 0),
  min_esik   int not null default 0 check (min_esik >= 0),
  birim      text,                                  -- adet / litre / kg (opsiyonel)
  created_at timestamptz not null default now()
);
create index if not exists stock_items_branch_idx on public.stock_items(branch_id);

-- ------------------------------------------------------------
-- 3) RLS: yalnız o şubenin yöneticisi (+admin) görür ve yönetir.
--    Çalışan/müşteri erişemez (operasyonel iç envanter).
-- ------------------------------------------------------------
alter table public.stock_items enable row level security;

create policy stock_branch on public.stock_items
  for all using (
    public.auth_role() = 'admin'
    or (public.auth_role() = 'yonetici' and branch_id = public.auth_branch())
  ) with check (
    public.auth_role() = 'admin'
    or (public.auth_role() = 'yonetici' and branch_id = public.auth_branch())
  );
