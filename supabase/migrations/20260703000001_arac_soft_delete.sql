-- ============================================================
-- Araç silme düzeltmesi: appointments.vehicle_id FK'sı (on delete yok)
-- yüzünden randevusu olan araç hard delete edilemiyor (23503).
-- Çözüm: soft delete (silindi_mi) — randevu geçmişi araca bağlı kalır,
-- KVKK anonimleştirmesi (hesabimi_sil) plakayı zaten scrub'lıyor.
-- İstemci önce hard delete dener (randevusuz araç temiz silinir),
-- 23503 dönerse silindi_mi=true'ya düşer.
-- ============================================================

alter table public.vehicles
  add column if not exists silindi_mi boolean not null default false;

-- Plaka tekilliği yalnız AKTİF araçlar arasında aransın: silinen aracın
-- plakası yeniden kaydedilebilmeli.
drop index if exists public.vehicles_plaka_unique;
create unique index vehicles_plaka_unique
  on public.vehicles (upper(replace(plaka, ' ', '')))
  where silindi_mi = false;
