-- ============================================================
-- Auth kanalı: SMS/telefon → e-posta OTP geçişi
-- - users.email kolonu eklenir (auth kanalı)
-- - users.telefon NOT NULL kısıtı kaldırılır (iletişim için opsiyonel kalır)
-- - handle_new_user trigger'ı email + telefon ikisini de yazar
-- ============================================================

alter table public.users
  add column if not exists email text unique;     -- KİŞİSEL VERİ (auth kanalı)

alter table public.users
  alter column telefon drop not null;             -- KİŞİSEL VERİ (iletişim, opsiyonel)

-- ------------------------------------------------------------
-- Trigger güncelle: auth.users → public.users
-- auth.users.email veya .phone hangisi doluysa public.users'a yansıt.
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  insert into public.users (id, email, telefon)
  values (new.id, new.email, new.phone)
  on conflict (id) do nothing;
  return new;
end;
$$;
