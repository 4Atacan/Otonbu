-- ============================================================
-- Segment bazlı fiyatlama (Faz 2 zenginleştirme)
-- Araç boyutuna göre fiyat: küçük / büyük.
--   * services.segment_fiyatlari: marka tabanı, segment başına
--   * vehicles.segment: arac_cinsi'den TRIGGER ile otomatik (istemci
--     segment göndermez — CLAUDE.md kural 2)
--   * branch_prices.segment: eski tek segment 'standart' → 'kucuk'
-- Band (services.oynama_orani) artık her segmentin kendi marka tabanı
-- etrafında uygulanır; küçük↔büyük farkı band'a takılmaz.
-- ============================================================

-- ------------------------------------------------------------
-- 1) services: segment başına marka taban fiyatı (jsonb)
--    Şekil: {"kucuk": 600, "buyuk": 700}
--    taban_fiyat fallback olarak kalır (jsonb'de segment yoksa).
-- ------------------------------------------------------------
alter table public.services
  add column if not exists segment_fiyatlari jsonb not null default '{}'::jsonb;

-- Mevcut hizmetler: iki segmenti de taban_fiyat ile doldur (admin sonra büyüğü ayarlar)
update public.services
  set segment_fiyatlari = jsonb_build_object('kucuk', taban_fiyat, 'buyuk', taban_fiyat)
  where segment_fiyatlari = '{}'::jsonb;

-- ------------------------------------------------------------
-- 2) vehicles.segment: araç cinsinden otomatik atama
--    Büyük: suv, crossover, station_wagon, mpv, pickup, panelvan
--    Küçük: sedan, hatchback, coupe, cabrio (ve cins boşsa)
-- ------------------------------------------------------------
create or replace function public.arac_segment(cinsi text)
returns text language sql immutable
set search_path = public as $$
  select case
    when cinsi in ('suv','crossover','station_wagon','mpv','pickup','panelvan')
      then 'buyuk'
    else 'kucuk'
  end
$$;

create or replace function public.set_vehicle_segment()
returns trigger language plpgsql
set search_path = public as $$
begin
  -- Segment her zaman sunucuda hesaplanır; istemciden gelen değer yok sayılır.
  new.segment := public.arac_segment(new.arac_cinsi);
  return new;
end;
$$;

drop trigger if exists vehicles_set_segment on public.vehicles;
create trigger vehicles_set_segment
  before insert or update on public.vehicles
  for each row execute function public.set_vehicle_segment();

-- Mevcut araçları (default 'standart' dahil) yeniden sınıflandır
update public.vehicles set segment = public.arac_segment(arac_cinsi);

alter table public.vehicles alter column segment set default 'kucuk';

alter table public.vehicles
  drop constraint if exists vehicles_segment_check;
alter table public.vehicles
  add constraint vehicles_segment_check check (segment in ('kucuk','buyuk'));

-- ------------------------------------------------------------
-- 3) branch_prices: eski tek segment kaydını 'kucuk'a taşı
-- ------------------------------------------------------------
update public.branch_prices set segment = 'kucuk' where segment = 'standart';
