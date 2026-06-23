-- ============================================================
-- Günlük moda "kaç gün sürer" (gun_sayisi) eklenir ve doluluk artık bir GÜN
-- ARALIĞI üzerinden hesaplanır.
--
-- Örn: PPF = 3 gün. Müşteri 15 Haziran'a randevu alırsa araç 15-16-17 günlerini
-- işgal eder. Başka biri 16 veya 17'ye (ya da 14/13'e — kapsama girerse) bakınca
-- o günlerin dolu görünmesi gerekir.
--
-- Bir aday gün D için "kaç N-günlük iş sığar":
--   D'den başlayan iş [D, D+N-1] günlerini kaplar. Bu aralıktaki HER günün
--   kapasitesi dolmamış olmalı. Bir d günündeki eşzamanlı iş sayısı =
--   başlangıcı [d-(N-1), d] arasında olan iptal-dışı randevular. dolu =
--   aralıktaki en dolu günün sayısı (max). dolu >= kapasite ise D kapalıdır.
--
-- saatli modda gun_sayisi yok sayılır (doluluk birebir saat eşleşmesi).
-- ============================================================

alter table public.service_schedules
  add column if not exists gun_sayisi int not null default 1
    check (gun_sayisi between 1 and 30);

-- Dönüş tablosuna 'gun_sayisi' eklendiği için önce düşür.
drop function if exists public.musait_slotlar(uuid, uuid, date);

create or replace function public.musait_slotlar(
  p_branch_id  uuid,
  p_service_id uuid,
  p_gun        date
)
returns table (
  baslangic  timestamptz,
  kapasite   int,
  dolu       int,
  mod        text,
  gun_sayisi int
)
language sql
stable
security definer
set search_path = public
as $$
  with sch as (
    select
      coalesce(ss.mod, 'saatli')   as mod,
      coalesce(ss.aralik_dk, 40)   as aralik_dk,
      coalesce(ss.kapasite, 1)     as kapasite,
      coalesce(ss.gun_sayisi, 1)   as gun_sayisi,
      coalesce(
        ss.windows,
        '[{"bas":"09:00","son":"12:20"},{"bas":"13:40","son":"17:00"}]'::jsonb
      ) as windows,
      ss.gunler
    from (select 1) tek
    left join public.service_schedules ss
      on ss.branch_id = p_branch_id and ss.service_id = p_service_id
  ),
  gun_ok as (
    select * from sch s
    where s.gunler is null
       or extract(isodow from p_gun)::int = any(s.gunler)
  ),
  adaylar as (
    -- saatli: pencere aralıklarından saat ızgarası (DISTINCT → çift saat olmasın)
    select distinct gs as baslangic, g.kapasite, 'saatli'::text as mod, 1 as gun_sayisi
    from gun_ok g
    cross join lateral jsonb_array_elements(g.windows) w
    cross join lateral generate_series(
      ((p_gun::text || ' ' || (w->>'bas'))::timestamp at time zone 'Europe/Istanbul'),
      ((p_gun::text || ' ' || (w->>'son'))::timestamp at time zone 'Europe/Istanbul'),
      make_interval(mins => g.aralik_dk)
    ) gs
    where g.mod = 'saatli'

    union all

    -- günlük: o gün için tek bırakma slotu (windows[0].bas, yoksa 09:00)
    select
      ((p_gun::text || ' ' || coalesce(g.windows->0->>'bas', '09:00'))::timestamp
        at time zone 'Europe/Istanbul') as baslangic,
      g.kapasite,
      'gunluk'::text as mod,
      g.gun_sayisi
    from gun_ok g
    where g.mod = 'gunluk'
  )
  select
    a.baslangic,
    a.kapasite,
    case when a.mod = 'gunluk' then
      -- [p_gun, p_gun+N-1] aralığındaki en dolu günün doluluğu
      coalesce((
        select max(gunluk_say)
        from (
          select (
            select count(*)
            from public.appointments ap
            where ap.branch_id = p_branch_id
              and ap.service_id = p_service_id
              and ap.durum <> 'iptal'
              and (ap.baslangic at time zone 'Europe/Istanbul')::date
                  between gd::date - (a.gun_sayisi - 1) and gd::date
          ) as gunluk_say
          from generate_series(
            p_gun::timestamp,
            (p_gun + (a.gun_sayisi - 1))::timestamp,
            interval '1 day'
          ) gd
        ) spans
      ), 0)
    else
      -- saatli: birebir saat eşleşmesi
      coalesce((
        select count(*)
        from public.appointments ap
        where ap.branch_id = p_branch_id
          and ap.service_id = p_service_id
          and ap.durum <> 'iptal'
          and ap.baslangic = a.baslangic
      ), 0)
    end::int as dolu,
    a.mod,
    a.gun_sayisi
  from adaylar a
  order by a.baslangic;
$$;

grant execute on function public.musait_slotlar(uuid, uuid, date) to authenticated;
