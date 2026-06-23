-- ============================================================
-- FAZ 3 — Adım 4 destek: abonelik aktivasyonu + TASLAK ödeme modu
--
-- iyzico entegrasyonu sona bırakıldı. Bu migration, ödeme adımının "taslağını"
-- kurar: gerçek tahsilat gelene kadar abonelik akışı uçtan uca test edilebilsin.
--
--   * abonelik_aktiflestir(): ödeme onaylanınca yapılacak TEK aktivasyon mantığı
--     (payment yaz + abonelik 'aktif' + dönem haklarını üret). Hem iyzico-webhook
--     hem taslak akışı bunu çağırır → tek doğruluk kaynağı. iyzico gelince webhook
--     zaten bunu çağırdığı için "taslağın üzerine" oturur.
--   * abonelik_taslak_basla(): ödeme sağlayıcısı yokken aboneliği DOĞRUDAN başlatır
--     (dev simülasyon). app_ayar.odeme_taslak_modu='acik' değilse REDDEDER —
--     canlıya çıkmadan bu bayrak 'kapali' yapılır, böylece bedava abonelik üretilemez.
-- ============================================================

-- ------------------------------------------------------------
-- Basit uygulama ayarı tablosu (özellik bayrakları). Yalnız admin yazar.
-- ------------------------------------------------------------
create table if not exists public.app_ayar (
  anahtar text primary key,
  deger   text not null
);
alter table public.app_ayar enable row level security;

create policy app_ayar_select on public.app_ayar for select using (true);
create policy app_ayar_admin  on public.app_ayar for all
  using (public.auth_role() = 'admin')
  with check (public.auth_role() = 'admin');

-- TASLAK modu açık başlar (iyzico yok). CANLI: 'kapali' yapılacak.
insert into public.app_ayar (anahtar, deger)
values ('odeme_taslak_modu', 'acik')
on conflict (anahtar) do nothing;

-- ------------------------------------------------------------
-- Ortak aktivasyon — ödeme onaylanınca çağrılır (webhook + taslak).
-- saglayici_ref unique olduğu için çift çağrı idempotent (false döner).
-- ------------------------------------------------------------
create or replace function public.abonelik_aktiflestir(
  p_subscription_id uuid,
  p_tutar numeric,
  p_ref   text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid;
  v_n    int;
begin
  select user_id into v_user from public.subscriptions where id = p_subscription_id;
  if v_user is null then return false; end if;

  -- Ödeme kaydı (idempotency anahtarı: saglayici_ref). ON CONFLICT, kısmi unique
  -- index'i (where saglayici_ref is not null) eşlemek için aynı predicate'i taşır.
  insert into public.payments (subscription_id, user_id, tutar, saglayici_ref)
  values (p_subscription_id, v_user, p_tutar, p_ref)
  on conflict (saglayici_ref) where saglayici_ref is not null do nothing;
  get diagnostics v_n = row_count;
  if v_n = 0 then
    return false;  -- bu ödeme zaten işlenmiş → tekrar aktifleme/hak üretme yok
  end if;

  update public.subscriptions
  set durum = 'aktif', baslangic = current_date
  where id = p_subscription_id and durum <> 'iptal';

  perform public.donem_haklari_uret(p_subscription_id);
  return true;
end;
$$;

-- Yalnız service_role / definer bağlamı çağırır — istemciye KAPALI.
revoke execute on function public.abonelik_aktiflestir(uuid, numeric, text)
  from public, authenticated, anon;

-- ------------------------------------------------------------
-- TASLAK akışı — ödeme adımı yerine geçici simülasyon (DEV).
-- iyzico gelince istemci bunun yerine 'abonelik-baslat' Edge Function'ı çağırır;
-- bu fonksiyon canlıda 'kapali' bayrağıyla devre dışı kalır.
-- ------------------------------------------------------------
create or replace function public.abonelik_taslak_basla(
  p_plan_id   uuid,
  p_branch_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_modu  text;
  v_ucret numeric;
  v_sub   uuid;
begin
  if v_uid is null then raise exception 'Oturum gerekli'; end if;

  select deger into v_modu from public.app_ayar where anahtar = 'odeme_taslak_modu';
  if coalesce(v_modu, 'kapali') <> 'acik' then
    raise exception 'Taslak ödeme modu kapalı';
  end if;

  if not exists (select 1 from public.branches where id = p_branch_id) then
    raise exception 'Şube bulunamadı';
  end if;

  select aylik_ucret into v_ucret
  from public.plans where id = p_plan_id and aktif = true;
  if v_ucret is null then raise exception 'Paket bulunamadı veya pasif'; end if;

  -- Aynı şubede zaten aktif abonelik varsa engelle.
  if exists (
    select 1 from public.subscriptions
    where user_id = v_uid and branch_id = p_branch_id
      and durum = 'aktif' and silindi_mi = false
  ) then
    raise exception 'Bu şubede zaten aktif aboneliğiniz var';
  end if;

  insert into public.subscriptions (user_id, branch_id, plan_id, durum)
  values (v_uid, p_branch_id, p_plan_id, 'beklemede')
  returning id into v_sub;

  -- Ödeme onaylanmış gibi aktifle (taslak referansı).
  perform public.abonelik_aktiflestir(v_sub, v_ucret, 'taslak-' || v_sub::text);
  return v_sub;
end;
$$;

grant execute on function public.abonelik_taslak_basla(uuid, uuid) to authenticated;
