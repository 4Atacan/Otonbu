-- ============================================================
-- vehicles detaylandırma: serbest metin marka_model yerine
-- ayrı arac_cinsi / marka / model kolonları.
-- Segment fiyatlama kararı Faz 2+'ya ertelendi; kolon olduğu
-- gibi kalır (default 'standart'), formdan sorulmaz.
-- ============================================================

alter table public.vehicles
  add column if not exists arac_cinsi text
    check (arac_cinsi in (
      'sedan','hatchback','suv','crossover','station_wagon',
      'mpv','coupe','cabrio','pickup','panelvan'
    ));

alter table public.vehicles
  add column if not exists marka text;

alter table public.vehicles
  add column if not exists model text;

-- Eski serbest metin değer kaybolmasın: model alanına taşı, kolonu kaldır
update public.vehicles
  set model = marka_model
  where marka_model is not null and model is null;

alter table public.vehicles
  drop column if exists marka_model;
