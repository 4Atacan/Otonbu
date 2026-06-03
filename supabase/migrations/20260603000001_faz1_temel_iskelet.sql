-- ============================================================
-- Faz 1: Temel iskelet — branches, users, services, vehicles
-- Sıra önemli: tablolar → fonksiyonlar → trigger → RLS
-- ============================================================

-- ------------------------------------------------------------
-- Tablolar (fonksiyonlar bunlara bağımlı, önce oluşturulmalı)
-- ------------------------------------------------------------
create table if not exists public.branches (
  id         uuid primary key default gen_random_uuid(),
  ad         text not null,
  adres      text,
  aktif      boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.users (
  id         uuid primary key references auth.users(id) on delete cascade,
  branch_id  uuid references public.branches(id),
  telefon    text unique not null,           -- KİŞİSEL VERİ
  rol        text not null default 'musteri'
             check (rol in ('musteri','sube_sahibi','kasa','usta','admin')),
  ad_soyad   text,                           -- KİŞİSEL VERİ
  silindi_mi boolean not null default false, -- KVKK soft delete
  created_at timestamptz not null default now()
);

create table if not exists public.services (
  id            uuid primary key default gen_random_uuid(),
  ad            text not null,
  kategori      text not null,
  taban_fiyat   numeric(10,2) not null,
  oynama_orani  numeric(4,3) not null default 0.05,
  aktif         boolean not null default true
);

create table if not exists public.vehicles (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users(id) on delete cascade,
  plaka        text not null,                -- KİŞİSEL VERİ
  marka_model  text,
  segment      text not null default 'standart'
);
create index if not exists vehicles_user_id_idx on public.vehicles(user_id);

-- ------------------------------------------------------------
-- Ortak yardımcılar (tablolar hazır olduktan sonra)
-- SECURITY DEFINER: RLS politikaları bu fonksiyonlara başvurur;
-- fonksiyonun kendi RLS'den muaf çalışması döngüyü önler.
-- ------------------------------------------------------------
create or replace function public.auth_role()
returns text language sql stable security definer
set search_path = public as $$
  select rol from public.users where id = auth.uid()
$$;

create or replace function public.auth_branch()
returns uuid language sql stable security definer
set search_path = public as $$
  select branch_id from public.users where id = auth.uid()
$$;

-- ------------------------------------------------------------
-- Trigger: auth.users → public.users otomatik kayıt
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  insert into public.users (id, telefon)
  values (new.id, coalesce(new.phone, ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ------------------------------------------------------------
-- RLS aktif
-- ------------------------------------------------------------
alter table public.branches enable row level security;
alter table public.users    enable row level security;
alter table public.services enable row level security;
alter table public.vehicles enable row level security;

-- ------------------------------------------------------------
-- Branches: herkes okur, sadece admin yazar
-- ------------------------------------------------------------
create policy branches_select on public.branches
  for select using (true);

create policy branches_admin on public.branches
  for all using (public.auth_role() = 'admin');

-- ------------------------------------------------------------
-- Users: kendini görür; personel kendi şubesini; admin hepsini
-- ------------------------------------------------------------
create policy users_self on public.users
  for select using (
    id = auth.uid()
    or public.auth_role() = 'admin'
    or (public.auth_role() in ('sube_sahibi','kasa')
        and branch_id = public.auth_branch())
  );

create policy users_insert_self on public.users
  for insert with check (id = auth.uid());

create policy users_update_self on public.users
  for update using (id = auth.uid());

-- ------------------------------------------------------------
-- Services: herkes okur, sadece admin değiştirir
-- ------------------------------------------------------------
create policy services_select on public.services
  for select using (true);

create policy services_admin on public.services
  for all using (public.auth_role() = 'admin');

-- ------------------------------------------------------------
-- Vehicles: sadece sahibi ve admin
-- ------------------------------------------------------------
create policy vehicles_owner on public.vehicles
  for all using (
    user_id = auth.uid()
    or public.auth_role() = 'admin'
  );
