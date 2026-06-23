-- ============================================================
-- Hizmet bazlı çalışma programı (şube + hizmet) ve programdan türetilen
-- randevu uygunluğu. Eski model (elle üretilen branch geneli time_slots)
-- kaldırılıyor: her şube her hizmet için kendi saat pencerelerini, aralığını
-- ve kapasitesini belirler; uygun saatler bu programdan ANINDA türetilir.
--
-- Bu yüzden:
--  * appointments artık doğrudan baslangic (timestamptz) tutar (slot_id değil).
--  * appointment_changes yeni saat için yeni_baslangic tutar.
--  * musait_slotlar artık (şube, hizmet, gün) alır ve adayları üretir.
--  * randevu_olustur RPC: seçilen saati programa karşı doğrular (istemciye
--    güvenme — CLAUDE.md kural 2).
-- time_slots tablosu ve slot_id/yeni_slot_id kolonları geriye dönük uyumluluk
-- için bırakılır (artık yazılmaz), düşürülmez.
-- ============================================================

-- ------------------------------------------------------------
-- 1) service_schedules — (şube, hizmet) başına çalışma programı
-- ------------------------------------------------------------
create table if not exists public.service_schedules (
  id          uuid primary key default gen_random_uuid(),
  branch_id   uuid not null references public.branches(id) on delete cascade,
  service_id  uuid not null references public.services(id) on delete cascade,
  -- [{ "bas": "09:00", "son": "12:20" }, ...] — bas/son ilk/son randevu saatidir
  windows     jsonb not null default '[{"bas":"09:00","son":"12:20"},{"bas":"13:40","son":"17:00"}]'::jsonb,
  aralik_dk   int not null default 40 check (aralik_dk between 5 and 600),
  kapasite    int not null default 1  check (kapasite between 1 and 50),
  gunler      int[],  -- ISO gün (1=Pzt .. 7=Paz); null = her gün
  updated_at  timestamptz not null default now(),
  unique (branch_id, service_id)
);

alter table public.service_schedules enable row level security;

-- Görüntüleme: admin veya şubenin personeli
create policy schedules_select on public.service_schedules
  for select using (
    public.auth_role() = 'admin' or branch_id = public.auth_branch()
  );

-- Yönetim: admin veya şube sahibi (kendi şubesi)
create policy schedules_manage on public.service_schedules
  for all using (
    public.auth_role() = 'admin'
    or (public.auth_role() = 'sube_sahibi' and branch_id = public.auth_branch())
  )
  with check (
    public.auth_role() = 'admin'
    or (public.auth_role() = 'sube_sahibi' and branch_id = public.auth_branch())
  );

-- ------------------------------------------------------------
-- 2) appointments.baslangic (slot_id yerine doğrudan zaman)
-- ------------------------------------------------------------
alter table public.appointments add column if not exists baslangic timestamptz;
update public.appointments a
  set baslangic = ts.baslangic
  from public.time_slots ts
  where a.slot_id = ts.id and a.baslangic is null;
update public.appointments set baslangic = created_at where baslangic is null;
alter table public.appointments alter column baslangic set not null;
create index if not exists appointments_branch_baslangic_idx
  on public.appointments (branch_id, baslangic);

-- ------------------------------------------------------------
-- 3) appointment_changes.yeni_baslangic (yeni_slot_id yerine)
-- ------------------------------------------------------------
alter table public.appointment_changes add column if not exists yeni_baslangic timestamptz;
update public.appointment_changes ac
  set yeni_baslangic = ts.baslangic
  from public.time_slots ts
  where ac.yeni_slot_id = ts.id and ac.yeni_baslangic is null;
alter table public.appointment_changes drop constraint if exists appointment_changes_slot_tutarli;
alter table public.appointment_changes add constraint appointment_changes_saat_tutarli check (
  (tip = 'saat'  and yeni_baslangic is not null) or
  (tip = 'iptal' and yeni_baslangic is null)
);

-- ------------------------------------------------------------
-- 4) musait_slotlar — programdan (şube, hizmet, gün) aday saatleri türetir,
-- her aday için o şubedeki (tüm hizmetler) iptal-dışı randevularla çakışmayı
-- "dolu" olarak sayar. Program yoksa makul bir varsayılana düşer.
-- ------------------------------------------------------------
drop function if exists public.musait_slotlar(uuid, timestamptz, timestamptz, int);
drop function if exists public.musait_slotlar(uuid, timestamptz, timestamptz);

create or replace function public.musait_slotlar(
  p_branch_id  uuid,
  p_service_id uuid,
  p_gun        date
)
returns table (
  baslangic timestamptz,
  kapasite  int,
  dolu      int
)
language sql
stable
security definer
set search_path = public
as $$
  with sch as (
    select
      coalesce(ss.aralik_dk, 40) as aralik_dk,
      coalesce(ss.kapasite, 1)   as kapasite,
      coalesce(
        ss.windows,
        '[{"bas":"09:00","son":"12:20"},{"bas":"13:40","son":"17:00"}]'::jsonb
      ) as windows,
      ss.gunler
    from (select 1) tek
    left join public.service_schedules ss
      on ss.branch_id = p_branch_id and ss.service_id = p_service_id
  ),
  sure as (
    select coalesce(s.sure_dk, 40) as dk from public.services s where s.id = p_service_id
  ),
  adaylar as (
    select gs as baslangic, sch.kapasite
    from sch
    cross join lateral jsonb_array_elements(sch.windows) w
    cross join lateral generate_series(
      ((p_gun::text || ' ' || (w->>'bas'))::timestamp at time zone 'Europe/Istanbul'),
      ((p_gun::text || ' ' || (w->>'son'))::timestamp at time zone 'Europe/Istanbul'),
      make_interval(mins => sch.aralik_dk)
    ) gs
    where sch.gunler is null
       or extract(isodow from p_gun)::int = any(sch.gunler)
  )
  select
    a.baslangic,
    a.kapasite,
    coalesce((
      select count(*)
      from public.appointments ap
      left join public.services s2 on s2.id = ap.service_id
      where ap.branch_id = p_branch_id
        and ap.durum <> 'iptal'
        and tstzrange(ap.baslangic, ap.baslangic + make_interval(mins => coalesce(s2.sure_dk, 40)))
            && tstzrange(a.baslangic, a.baslangic + make_interval(mins => (select dk from sure)))
    ), 0)::int as dolu
  from adaylar a
  order by a.baslangic;
$$;

grant execute on function public.musait_slotlar(uuid, uuid, date) to authenticated;

-- ------------------------------------------------------------
-- 5) randevu_olustur — seçilen saati programa karşı doğrulayıp randevu açar.
-- SECURITY DEFINER: doluluk hesabı tüm randevuları görmeyi gerektirir, ama
-- sahiplik (araç) ve geçerlilik içeride doğrulanır.
-- ------------------------------------------------------------
create or replace function public.randevu_olustur(
  p_branch_id  uuid,
  p_service_id uuid,
  p_vehicle_id uuid,
  p_baslangic  timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid      uuid := auth.uid();
  v_gun      date := (p_baslangic at time zone 'Europe/Istanbul')::date;
  v_dolu     int;
  v_kapasite int;
  v_appt     uuid;
begin
  if v_uid is null then raise exception 'Oturum gerekli'; end if;

  if not exists (
    select 1 from public.vehicles v where v.id = p_vehicle_id and v.user_id = v_uid
  ) then
    raise exception 'Araç bulunamadı veya size ait değil';
  end if;

  if p_baslangic <= now() then
    raise exception 'Geçmiş bir saate randevu alınamaz';
  end if;

  -- Seçilen saat programdaki geçerli bir aday mı ve müsait mi?
  select m.dolu, m.kapasite into v_dolu, v_kapasite
  from public.musait_slotlar(p_branch_id, p_service_id, v_gun) m
  where m.baslangic = p_baslangic;

  if not found then
    raise exception 'Seçilen saat uygun değil';
  end if;
  if v_dolu >= v_kapasite then
    raise exception 'Seçilen saat dolu';
  end if;

  insert into public.appointments (branch_id, user_id, vehicle_id, service_id, baslangic, durum)
  values (p_branch_id, v_uid, p_vehicle_id, p_service_id, p_baslangic, 'onayli')
  returning id into v_appt;

  return v_appt;
end;
$$;

grant execute on function public.randevu_olustur(uuid, uuid, uuid, timestamptz) to authenticated;

-- ------------------------------------------------------------
-- 6) randevu_talep_yanitla — yeni_baslangic / appointments.baslangic'e göre
-- güncellendi (yeni_slot_id yerine).
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
      update public.appointments set baslangic = t.yeni_baslangic where id = t.appointment_id;
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
