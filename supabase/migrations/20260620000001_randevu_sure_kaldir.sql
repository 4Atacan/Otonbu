-- ============================================================
-- Randevu modelinden "işlem süresi" (sure_dk) bağımlılığını kaldırır.
--
-- Neden: PPF/kaplama gibi işler 1–2 GÜN sürebiliyor. Dakika bazlı süre +
-- çakışma (tstzrange &&) modeli bu işler için anlamsız: tek bir "ortalama
-- süre" giremiyoruz ve uzun iş, gün içi slotları yanlış dolduruyor.
--
-- Yeni model: her slot bir "bırakma saati"dir. Doluluk artık süreden değil,
--   o (şube, hizmet, saat) için iptal-dışı randevu SAYISI ile hesaplanır ve
--   şubenin tanımladığı slot kapasitesiyle karşılaştırılır. Çok günlü işler
--   şube tarafından kapasite/açılan slot sayısı ile yönetilir.
--
-- Ayrıca: aday saatler artık TEKİLLEŞTİRİLİR (DISTINCT). Yönetici çakışan
-- saat aralıkları girdiğinde aynı timestamp iki kez üretiliyordu; bu, istemcide
-- "two children with same key" hatasına yol açıyordu.
--
-- services.sure_dk kolonu geriye dönük uyumluluk için DÜŞÜRÜLMEZ (artık
-- randevu mantığında kullanılmaz; yalnızca eski kayıtlar için durur).
-- ============================================================

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
  adaylar as (
    -- DISTINCT: çakışan saat aralıkları aynı saati iki kez üretmesin (çift key)
    select distinct gs as baslangic, sch.kapasite
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
    -- Doluluk = bu (şube, hizmet, saat) için iptal-dışı randevu sayısı.
    -- Süre/çakışma YOK: bir slot ya alınmış sayılır ya da boş.
    coalesce((
      select count(*)
      from public.appointments ap
      where ap.branch_id = p_branch_id
        and ap.service_id = p_service_id
        and ap.durum <> 'iptal'
        and ap.baslangic = a.baslangic
    ), 0)::int as dolu
  from adaylar a
  order by a.baslangic;
$$;

grant execute on function public.musait_slotlar(uuid, uuid, date) to authenticated;
