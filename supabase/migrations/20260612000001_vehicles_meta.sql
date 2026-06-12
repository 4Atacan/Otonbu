-- ============================================================
-- vehicles düzeltmesi:
-- - created_at kolonu eklenir (araç listesi bu kolona göre sıralanıyor)
-- - user_id default auth.uid(): istemci insert'te user_id göndermez,
--   RLS politikası (user_id = auth.uid()) default ile otomatik sağlanır
-- ============================================================

alter table public.vehicles
  add column if not exists created_at timestamptz not null default now();

alter table public.vehicles
  alter column user_id set default auth.uid();
