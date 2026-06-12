-- ============================================================
-- Plaka sistem genelinde tekil: aynı plaka ikinci kez kaydedilemez.
-- Boşluk ve harf büyüklüğü farkları aynı plakayı gizleyemesin diye
-- normalize edilmiş değer üzerinden unique index ("34 abc 123" =
-- "34ABC123"). İhlalde Postgres 23505 döner; istemci Türkçe mesaj basar.
-- ============================================================

create unique index if not exists vehicles_plaka_unique
  on public.vehicles (upper(replace(plaka, ' ', '')));
