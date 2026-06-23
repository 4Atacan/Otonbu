-- ============================================================
-- Yönetici randevu değişiklik talepleri (iptal / saat değişikliği).
-- Yönetici doğrudan iptal/saat değiştiremez; bir TALEP oluşturur. Talep
-- müşteriye uygulama içi bir onay olarak gider. Müşteri onaylarsa değişiklik
-- uygulanır, reddederse randevu olduğu gibi kalır.
--
-- Onaylama, slot_id güncellemesi gerektirir; müşterinin appointments RLS'i
-- buna izin vermez (yalnızca 'iptal'e çekebilir). Bu yüzden uygulama adımı
-- SECURITY DEFINER bir RPC içinde, sahiplik kontrolüyle yapılır.
-- ============================================================

create table if not exists public.appointment_changes (
  id              uuid primary key default gen_random_uuid(),
  appointment_id  uuid not null references public.appointments(id) on delete cascade,
  branch_id       uuid not null references public.branches(id),
  tip             text not null check (tip in ('iptal', 'saat')),
  yeni_slot_id    uuid references public.time_slots(id),
  durum           text not null default 'beklemede'
                  check (durum in ('beklemede', 'onaylandi', 'reddedildi')),
  olusturan       uuid references public.users(id),
  created_at      timestamptz not null default now(),
  resolved_at     timestamptz,
  -- saat değişikliği talebinde yeni slot zorunlu; iptal talebinde olmamalı
  constraint appointment_changes_slot_tutarli check (
    (tip = 'saat'  and yeni_slot_id is not null) or
    (tip = 'iptal' and yeni_slot_id is null)
  )
);
create index if not exists appointment_changes_appt_idx
  on public.appointment_changes (appointment_id, durum);
-- Bir randevu için aynı anda yalnızca tek bekleyen talep
create unique index if not exists appointment_changes_tek_beklemede
  on public.appointment_changes (appointment_id)
  where durum = 'beklemede';

alter table public.appointment_changes enable row level security;

-- Görüntüleme: admin, ilgili şube personeli ve randevu sahibi müşteri
create policy appt_changes_select on public.appointment_changes
  for select using (
    public.auth_role() = 'admin'
    or branch_id = public.auth_branch()
    or exists (
      select 1 from public.appointments a
      where a.id = appointment_changes.appointment_id and a.user_id = auth.uid()
    )
  );

-- Oluşturma: yalnızca admin veya randevunun şubesinin personeli, ve yalnızca
-- iptal edilmemiş bir randevu için. olusturan = kendisi olmalı.
create policy appt_changes_insert on public.appointment_changes
  for insert with check (
    olusturan = auth.uid()
    and (public.auth_role() = 'admin' or branch_id = public.auth_branch())
    and exists (
      select 1 from public.appointments a
      where a.id = appointment_changes.appointment_id
        and a.branch_id = appointment_changes.branch_id
        and a.durum <> 'iptal'
    )
  );

-- ------------------------------------------------------------
-- Müşteri talebi yanıtlar. SECURITY DEFINER: onayda slot_id/iptal
-- güncellemesi RLS'i aşar, ama sahiplik içeride doğrulanır.
-- ------------------------------------------------------------
create or replace function public.randevu_talep_yanitla(
  p_talep_id uuid,
  p_onay     boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  t public.appointment_changes;
begin
  select * into t
  from public.appointment_changes
  where id = p_talep_id and durum = 'beklemede'
  for update;

  if not found then
    raise exception 'Talep bulunamadı veya zaten yanıtlanmış';
  end if;

  -- Yalnızca randevunun sahibi müşteri yanıtlayabilir
  if not exists (
    select 1 from public.appointments a
    where a.id = t.appointment_id and a.user_id = auth.uid()
  ) then
    raise exception 'Bu talebi yanıtlama yetkiniz yok';
  end if;

  if p_onay then
    if t.tip = 'iptal' then
      update public.appointments set durum = 'iptal' where id = t.appointment_id;
    elsif t.tip = 'saat' then
      update public.appointments set slot_id = t.yeni_slot_id where id = t.appointment_id;
    end if;
    update public.appointment_changes
      set durum = 'onaylandi', resolved_at = now() where id = t.id;
  else
    update public.appointment_changes
      set durum = 'reddedildi', resolved_at = now() where id = t.id;
  end if;
end;
$$;

grant execute on function public.randevu_talep_yanitla(uuid, boolean) to authenticated;
