-- ============================================================
-- Hizmet süresi + hizmet bazlı kampanya, ve süreye duyarlı slot doluluğu.
-- 1) services.sure_dk      — hizmetin yaklaşık süresi (dakika). Her işlem
--    aynı sürmez; randevu doluluğu artık bu süreye göre hesaplanır.
-- 2) services.kampanya_tip — 'yildiz' (öne çıkan) veya 'fiyat' (indirim).
--    'fiyat' tipinde kampanya_indirim_yuzde uygulanır.
-- 3) musait_slotlar — bir aday başlangıç slotu, [slot, slot+süre) penceresi
--    mevcut iptal-dışı bir randevunun penceresiyle çakışıyorsa "dolu" sayılır.
-- ============================================================

alter table public.services
  add column if not exists sure_dk int not null default 40,
  add column if not exists kampanya_tip text
    check (kampanya_tip in ('yildiz', 'fiyat')),
  add column if not exists kampanya_indirim_yuzde int
    check (kampanya_indirim_yuzde between 1 and 90);

-- Eski 3-argümanlı sürümü kaldır; yeni sürüm p_sure_dk varsayılanıyla gelir,
-- böylece 3 argümanla yapılan eski çağrılar da çözülür (varsayılan 40 dk).
drop function if exists public.musait_slotlar(uuid, timestamptz, timestamptz);

create or replace function public.musait_slotlar(
  p_branch_id uuid,
  p_bas       timestamptz,
  p_son       timestamptz,
  p_sure_dk   int default 40
)
returns table (
  id        uuid,
  baslangic timestamptz,
  kapasite  int,
  dolu      int
)
language sql
stable
security definer
set search_path = public
as $$
  select
    ts.id,
    ts.baslangic,
    ts.kapasite,
    -- Bu aday slotta başlayan p_sure_dk'lik bir randevunun penceresiyle
    -- çakışan mevcut (iptal-dışı) randevu sayısı. Her randevu kendi
    -- hizmetinin süresi kadar yer kaplar (services.sure_dk).
    coalesce((
      select count(*)
      from public.appointments a
      join public.time_slots ats on ats.id = a.slot_id
      left join public.services s on s.id = a.service_id
      where a.branch_id = ts.branch_id
        and a.durum <> 'iptal'
        and tstzrange(
              ats.baslangic,
              ats.baslangic + make_interval(mins => coalesce(s.sure_dk, 40))
            )
            && tstzrange(
              ts.baslangic,
              ts.baslangic + make_interval(mins => greatest(coalesce(p_sure_dk, 40), 1))
            )
    ), 0)::int as dolu
  from public.time_slots ts
  where ts.branch_id = p_branch_id
    and ts.baslangic >= p_bas
    and ts.baslangic <= p_son
  order by ts.baslangic;
$$;

grant execute on function public.musait_slotlar(uuid, timestamptz, timestamptz, int)
  to authenticated;
