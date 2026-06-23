-- ============================================================
-- Randevu programına "mod" eklenir: saatli (slot/saat bazlı) veya günlük.
--
--  * saatli: oto yıkama gibi gün içi işler. Müşteri belirli bir SAAT seçer;
--    aday saatler windows + aralik_dk'dan türetilir (mevcut davranış).
--  * gunluk: PPF/kaplama gibi 1–2 GÜN süren işler. Müşteri yalnızca bir GÜN
--    seçer; o gün için tek bir "bırakma" randevusu üretilir. Bırakma saati =
--    windows[0].bas (yoksa 09:00). kapasite = o gün alınabilecek araç sayısı.
--
-- musait_slotlar artık her satırda 'mod' döndürür; istemci buna göre saat
-- ızgarası ya da "tüm gün" kartı gösterir. Doluluk her iki modda da o
-- (şube, hizmet, baslangic) için iptal-dışı randevu SAYISI ile hesaplanır
-- (günlük modda tüm randevular aynı kanonik bırakma saatini taşır → gün sayımı).
-- ============================================================

alter table public.service_schedules
  add column if not exists mod text not null default 'saatli'
    check (mod in ('saatli', 'gunluk'));

-- Dönüş tablosuna 'mod' kolonu eklendiği için create-or-replace yetmez; önce düşür.
-- (randevu_olustur plpgsql gövdesinden çağırır — sıkı bağımlılık yok, CASCADE gereksiz.)
drop function if exists public.musait_slotlar(uuid, uuid, date);

create or replace function public.musait_slotlar(
  p_branch_id  uuid,
  p_service_id uuid,
  p_gun        date
)
returns table (
  baslangic timestamptz,
  kapasite  int,
  dolu      int,
  mod       text
)
language sql
stable
security definer
set search_path = public
as $$
  with sch as (
    select
      coalesce(ss.mod, 'saatli') as mod,
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
  gun_ok as (
    select * from sch s
    where s.gunler is null
       or extract(isodow from p_gun)::int = any(s.gunler)
  ),
  adaylar as (
    -- saatli: pencere aralıklarından saat ızgarası (DISTINCT → çift saat olmasın)
    select distinct gs as baslangic, g.kapasite, 'saatli'::text as mod
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
      'gunluk'::text as mod
    from gun_ok g
    where g.mod = 'gunluk'
  )
  select
    a.baslangic,
    a.kapasite,
    coalesce((
      select count(*)
      from public.appointments ap
      where ap.branch_id = p_branch_id
        and ap.service_id = p_service_id
        and ap.durum <> 'iptal'
        and ap.baslangic = a.baslangic
    ), 0)::int as dolu,
    a.mod
  from adaylar a
  order by a.baslangic;
$$;

grant execute on function public.musait_slotlar(uuid, uuid, date) to authenticated;
