-- ============================================================
-- Faz 2: Randevu akışı — time_slots, branch_prices, appointments,
-- jobs, job_photos + RLS. (IMPLEMENTATION.md Faz 2 şeması)
-- Ek olarak yönetici panelinin ihtiyaç duyduğu politikalar:
-- - admin diğer kullanıcıları güncelleyebilir (rol/şube atama)
-- - şube personeli, şubesindeki randevuların müşteri/araç bilgisini görür
-- ============================================================

-- ------------------------------------------------------------
-- Tablolar
-- ------------------------------------------------------------
create table if not exists public.time_slots (
  id         uuid primary key default gen_random_uuid(),
  branch_id  uuid not null references public.branches(id) on delete cascade,
  baslangic  timestamptz not null,
  kapasite   int not null default 1
);
create index if not exists time_slots_branch_baslangic_idx
  on public.time_slots (branch_id, baslangic);
-- Aynı şubeye aynı saatte ikinci slot üretilemesin (şablon iki kez
-- çalıştırılırsa sessizce atlanır — istemci upsert ignoreDuplicates kullanır)
create unique index if not exists time_slots_branch_baslangic_unique
  on public.time_slots (branch_id, baslangic);

create table if not exists public.branch_prices (
  id          uuid primary key default gen_random_uuid(),
  branch_id   uuid not null references public.branches(id) on delete cascade,
  service_id  uuid not null references public.services(id) on delete cascade,
  segment     text not null,
  fiyat       numeric(10,2) not null,
  unique (branch_id, service_id, segment)
);

create table if not exists public.appointments (
  id          uuid primary key default gen_random_uuid(),
  branch_id   uuid not null references public.branches(id),
  user_id     uuid not null references public.users(id),
  vehicle_id  uuid not null references public.vehicles(id),
  service_id  uuid not null references public.services(id),
  slot_id     uuid references public.time_slots(id),
  durum       text not null default 'onayli'
              check (durum in ('beklemede','onayli','iptal')),
  created_at  timestamptz not null default now()
);
create index if not exists appointments_branch_created_idx
  on public.appointments (branch_id, created_at);
create index if not exists appointments_slot_idx
  on public.appointments (slot_id);

create table if not exists public.jobs (
  id              uuid primary key default gen_random_uuid(),
  appointment_id  uuid not null references public.appointments(id) on delete cascade,
  assigned_to     uuid references public.users(id),
  durum           text not null default 'basladi'
                  check (durum in ('basladi','tamamlandi','hazir'))
);

create table if not exists public.job_photos (
  id      uuid primary key default gen_random_uuid(),
  job_id  uuid not null references public.jobs(id) on delete cascade,
  tip     text not null check (tip in ('once','sonra')),
  url     text not null
);

-- ------------------------------------------------------------
-- RLS aktif
-- ------------------------------------------------------------
alter table public.time_slots    enable row level security;
alter table public.branch_prices enable row level security;
alter table public.appointments  enable row level security;
alter table public.jobs          enable row level security;
alter table public.job_photos    enable row level security;

-- ------------------------------------------------------------
-- Slotlar: herkes okur (randevu almak için), admin + kendi şubesinin
-- sahibi yönetir
-- ------------------------------------------------------------
create policy slots_select on public.time_slots
  for select using (true);

create policy slots_manage on public.time_slots
  for all using (
    public.auth_role() = 'admin'
    or (public.auth_role() = 'sube_sahibi' and branch_id = public.auth_branch())
  );

-- ------------------------------------------------------------
-- Şube fiyatları: herkes okur, admin + şube sahibi yönetir
-- ------------------------------------------------------------
create policy prices_select on public.branch_prices
  for select using (true);

create policy prices_manage on public.branch_prices
  for all using (
    public.auth_role() = 'admin'
    or (public.auth_role() = 'sube_sahibi' and branch_id = public.auth_branch())
  );

-- ------------------------------------------------------------
-- Randevular: müşteri kendininkini, personel şubesininkini, admin hepsini
-- ------------------------------------------------------------
create policy appt_customer on public.appointments
  for select using (
    user_id = auth.uid()
    or public.auth_role() = 'admin'
    or branch_id = public.auth_branch()
  );

create policy appt_create on public.appointments
  for insert with check (user_id = auth.uid());

create policy appt_branch_manage on public.appointments
  for update using (
    public.auth_role() = 'admin' or branch_id = public.auth_branch()
  );

-- ------------------------------------------------------------
-- İşler: admin, atanan usta veya işin şubesinin personeli
-- ------------------------------------------------------------
create policy jobs_branch on public.jobs
  for all using (
    public.auth_role() = 'admin'
    or assigned_to = auth.uid()
    or exists (
      select 1 from public.appointments a
      where a.id = jobs.appointment_id and a.branch_id = public.auth_branch()
    )
  );

create policy job_photos_access on public.job_photos
  for all using (
    public.auth_role() = 'admin'
    or exists (
      select 1 from public.jobs j
      join public.appointments a on a.id = j.appointment_id
      where j.id = job_photos.job_id
        and (a.user_id = auth.uid() or a.branch_id = public.auth_branch())
    )
  );

-- ------------------------------------------------------------
-- Panel için ek politikalar
-- ------------------------------------------------------------
-- Admin, kullanıcı kayıtlarını güncelleyebilir (şube sahibi atama:
-- rol + branch_id). users_update_self yalnızca kendi satırını kapsıyordu.
create policy users_admin_update on public.users
  for update using (public.auth_role() = 'admin');

-- Şube personeli, şubesinde randevusu olan müşterinin profilini görür
-- (randevu listesinde ad/telefon göstermek için). KİŞİSEL VERİ erişimi
-- operasyonel gereklilikle sınırlı: yalnızca kendi şubesinin randevuları.
create policy users_branch_musteri on public.users
  for select using (
    exists (
      select 1 from public.appointments a
      where a.user_id = users.id and a.branch_id = public.auth_branch()
    )
  );

-- Şube personeli, şubesinde randevusu olan aracı görür (plaka KİŞİSEL VERİ,
-- erişim aynı şekilde şube randevularıyla sınırlı).
create policy vehicles_branch_staff on public.vehicles
  for select using (
    exists (
      select 1 from public.appointments a
      where a.vehicle_id = vehicles.id and a.branch_id = public.auth_branch()
    )
  );
