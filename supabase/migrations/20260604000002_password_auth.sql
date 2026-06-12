-- ============================================================
-- Auth modeli: e-posta OTP → e-posta + şifre (e-posta doğrulamalı)
-- - handle_new_user trigger: raw_user_meta_data'dan ad_soyad + telefon al
-- - users.telefon için kısmi unique index (silinmiş kayıtlar hariç)
-- - telefon_to_email RPC: anon erişimli; login formunda telefon girilince
--   email karşılığı bulunup signInWithPassword'a verilir
-- ============================================================

-- ------------------------------------------------------------
-- Trigger güncelle: signUp metadata'sından ad_soyad ve telefon'u oku
-- auth.users.raw_user_meta_data { ad_soyad, telefon } alanlarını kabul eder
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  insert into public.users (id, email, telefon, ad_soyad)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'telefon', new.phone),
    new.raw_user_meta_data->>'ad_soyad'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ------------------------------------------------------------
-- Telefon unique kısıtı (NULL ve soft-deleted hariç)
-- ------------------------------------------------------------
create unique index if not exists users_telefon_unique
  on public.users(telefon)
  where telefon is not null and silindi_mi = false;

-- ------------------------------------------------------------
-- telefon → email çözümleyici (login formu için)
-- SECURITY DEFINER: RLS'i atlar; sadece email döner (telefon var mı sorusunu
-- tek bit'lik sızıntı seviyesinde tutar — enumerasyon riski rate limit ile
-- yönetilir, captcha login'in önünde olduğu için suistimal yüzeyi dar).
-- ------------------------------------------------------------
create or replace function public.telefon_to_email(t text)
returns text language sql stable security definer
set search_path = public as $$
  select email from public.users
  where telefon = t and silindi_mi = false
  limit 1
$$;

grant execute on function public.telefon_to_email(text) to anon, authenticated;
