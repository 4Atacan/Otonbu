-- ============================================================
-- FAZ 3 — Abonelik + ödeme VERİ MOTORU (dış bağımlılık yok kısmı)
--
-- Bu migration Faz 3'ün DB temelini kurar: paketler, abonelikler, aylık haklar
-- (entitlements), ödeme kayıtları + hak üretimi/tüketimi/iadesi mantığı.
-- iyzico Edge Functions (abonelik-baslat, iyzico-webhook), zamanlanmış
-- donem-yenile ve istemci UI AYRI adımlarda gelir (secret'lar gerekir).
--
-- GÜVENLİK İLKELERİ (CLAUDE.md):
--   * subscriptions / entitlements / payments → istemci YALNIZCA OKUR.
--     Tüm yazımlar SECURITY DEFINER fonksiyonlar (hak üretim/tüketim/iade) ya da
--     iyzico webhook'unda service_role ile yapılır.
--   * Hak yalnızca aboneliğin şubesinde geçerli (franchise izolasyonu).
--   * Hak hesaba bağlı: müşterinin tüm araçlarında kullanılabilir.
--
-- SPEC'TEN SAPMA (gerekçeli):
--   * entitlements.hak_tipi (serbest metin) yerine somut service_id kullanıldı —
--     booking ile birebir eşleşme + temiz join. Planın aylık hak şablonu için
--     spec'te eksik olan plan_haklari tablosu eklendi.
--   * Hak iadesi için istemci-yazılabilir kolon yerine entitlement_usage tablosu
--     (yalnız definer fonksiyon yazar) — sahte iade sömürüsü engellenir.
-- ============================================================

-- ------------------------------------------------------------
-- 1) Paketler ve plan hak şablonu
-- ------------------------------------------------------------
create table if not exists public.plans (
  id           uuid primary key default gen_random_uuid(),
  ad           text not null,
  kademe       text not null check (kademe in ('temel','orta','ust')),
  aylik_ucret  numeric(10,2) not null,
  aciklama     text,
  aktif        boolean not null default true,
  created_at   timestamptz not null default now()
);

-- Bir plan, ayda hangi hizmetten kaç adet hak verir (donem_yenile bunu okur).
create table if not exists public.plan_haklari (
  id          uuid primary key default gen_random_uuid(),
  plan_id     uuid not null references public.plans(id) on delete cascade,
  service_id  uuid not null references public.services(id) on delete cascade,
  aylik_adet  int not null check (aylik_adet > 0),
  unique (plan_id, service_id)
);
create index if not exists plan_haklari_plan_idx on public.plan_haklari(plan_id);

-- ------------------------------------------------------------
-- 2) Abonelikler (hak yalnızca bu şubede)
-- ------------------------------------------------------------
create table if not exists public.subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id),
  branch_id   uuid not null references public.branches(id),
  plan_id     uuid not null references public.plans(id),
  durum       text not null default 'aktif'
              check (durum in ('aktif','yenilenen','iptal')),
  baslangic   date not null default current_date,
  silindi_mi  boolean not null default false,   -- KVKK soft delete (Faz 4)
  created_at  timestamptz not null default now()
);
create index if not exists subscriptions_user_idx on public.subscriptions(user_id);
create index if not exists subscriptions_branch_idx on public.subscriptions(branch_id);

-- ------------------------------------------------------------
-- 3) Aylık haklar (devir YOK — her dönem yeniden üretilir)
-- ------------------------------------------------------------
create table if not exists public.entitlements (
  id               uuid primary key default gen_random_uuid(),
  subscription_id  uuid not null references public.subscriptions(id) on delete cascade,
  service_id       uuid not null references public.services(id),
  kalan_adet       int not null check (kalan_adet >= 0),
  donem            date not null,                 -- ayın ilk günü (date_trunc month)
  unique (subscription_id, service_id, donem)
);
create index if not exists entitlements_sub_donem_idx
  on public.entitlements(subscription_id, donem);

-- Hangi randevu hangi hakkı tüketti — yalnız definer fonksiyon yazar (iade için).
create table if not exists public.entitlement_usage (
  id              uuid primary key default gen_random_uuid(),
  appointment_id  uuid not null unique references public.appointments(id) on delete cascade,
  entitlement_id  uuid not null references public.entitlements(id),
  iade_edildi     boolean not null default false,
  created_at      timestamptz not null default now()
);
create index if not exists entitlement_usage_ent_idx on public.entitlement_usage(entitlement_id);

-- ------------------------------------------------------------
-- 4) Ödemeler (iyzico) — yazımı yalnız webhook (service_role)
-- ------------------------------------------------------------
create table if not exists public.payments (
  id               uuid primary key default gen_random_uuid(),
  subscription_id  uuid references public.subscriptions(id),
  user_id          uuid not null references public.users(id),
  tutar            numeric(10,2) not null,
  saglayici_ref    text,                          -- iyzico referansı
  silindi_mi       boolean not null default false,
  created_at       timestamptz not null default now()
);
create index if not exists payments_user_idx on public.payments(user_id);

-- ============================================================
-- RLS — istemci için SADECE OKUMA. Yazımlar definer/service_role.
-- ============================================================
alter table public.plans             enable row level security;
alter table public.plan_haklari      enable row level security;
alter table public.subscriptions     enable row level security;
alter table public.entitlements      enable row level security;
alter table public.entitlement_usage enable row level security;
alter table public.payments          enable row level security;

-- Paketler herkese açık (satın alma ekranı için), yönetimi admin
create policy plans_select on public.plans for select using (true);
create policy plans_admin  on public.plans for all
  using (public.auth_role() = 'admin')
  with check (public.auth_role() = 'admin');

create policy plan_haklari_select on public.plan_haklari for select using (true);
create policy plan_haklari_admin  on public.plan_haklari for all
  using (public.auth_role() = 'admin')
  with check (public.auth_role() = 'admin');

-- Abonelik: sahibi müşteri, aboneliğin şubesi personeli, admin görür
create policy subs_access on public.subscriptions for select using (
  user_id = auth.uid()
  or public.auth_role() = 'admin'
  or branch_id = public.auth_branch()
);

-- Hak: aboneliğin sahibi ya da şubesi personeli + admin görür
create policy ent_access on public.entitlements for select using (
  public.auth_role() = 'admin'
  or exists (
    select 1 from public.subscriptions s
    where s.id = entitlements.subscription_id
      and (s.user_id = auth.uid() or s.branch_id = public.auth_branch())
  )
);

-- Hak kullanımı: ilgili randevunun müşterisi/şubesi + admin görür
create policy ent_usage_access on public.entitlement_usage for select using (
  public.auth_role() = 'admin'
  or exists (
    select 1 from public.appointments a
    where a.id = entitlement_usage.appointment_id
      and (a.user_id = auth.uid() or a.branch_id = public.auth_branch())
  )
);

-- Ödeme: sahibi müşteri + admin (şube personeli ödeme detayını görmez)
create policy pay_access on public.payments for select using (
  user_id = auth.uid() or public.auth_role() = 'admin'
);

-- ============================================================
-- FONKSİYONLAR (hepsi SECURITY DEFINER — RLS'i aşar, istemci yazamaz)
-- ============================================================

-- ------------------------------------------------------------
-- 5) donem_yenile_tum — ay başı: aktif aboneliklere o dönemin haklarını üretir.
-- Devir YOK: yalnız o döneme ait satır oluşturur; varsa dokunmaz (idempotent,
-- tüketilmiş sayacı sıfırlamaz). Zamanlanmış görev (Adım 3) bunu çağıracak.
-- ------------------------------------------------------------
create or replace function public.donem_yenile_tum(
  p_donem date default date_trunc('month', current_date)::date
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_say int;
begin
  insert into public.entitlements (subscription_id, service_id, kalan_adet, donem)
  select s.id, ph.service_id, ph.aylik_adet, p_donem
  from public.subscriptions s
  join public.plan_haklari ph on ph.plan_id = s.plan_id
  where s.durum = 'aktif' and s.silindi_mi = false
  on conflict (subscription_id, service_id, donem) do nothing;
  get diagnostics v_say = row_count;
  return v_say;
end;
$$;

-- Tek abonelik için hak üretimi (abonelik ilk aktifleşince çağrılır).
create or replace function public.donem_haklari_uret(
  p_subscription_id uuid,
  p_donem date default date_trunc('month', current_date)::date
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.entitlements (subscription_id, service_id, kalan_adet, donem)
  select s.id, ph.service_id, ph.aylik_adet, p_donem
  from public.subscriptions s
  join public.plan_haklari ph on ph.plan_id = s.plan_id
  where s.id = p_subscription_id and s.durum = 'aktif' and s.silindi_mi = false
  on conflict (subscription_id, service_id, donem) do nothing;
$$;

-- ------------------------------------------------------------
-- 6) hak_ile_randevu — abonelik hakkıyla randevu (atomik tüketim).
-- randevu_olustur ile aynı doğrulamalar + hak kontrolü; hepsi tek transaction.
-- Hak şubeye kilitli (abonelik şubesi = randevu şubesi), hesaba bağlı (her araç).
-- ------------------------------------------------------------
create or replace function public.hak_ile_randevu(
  p_branch_id  uuid,
  p_service_id uuid,
  p_vehicle_id uuid,
  p_baslangic  timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid      uuid := auth.uid();
  v_gun      date := (p_baslangic at time zone 'Europe/Istanbul')::date;
  v_donem    date := date_trunc('month', (p_baslangic at time zone 'Europe/Istanbul'))::date;
  v_sub      uuid;
  v_ent      uuid;
  v_dolu     int;
  v_kapasite int;
  v_appt     uuid;
begin
  if v_uid is null then raise exception 'Oturum gerekli'; end if;

  -- Araç sahipliği (savunma derinliği)
  if not exists (
    select 1 from public.vehicles v where v.id = p_vehicle_id and v.user_id = v_uid
  ) then
    raise exception 'Araç bulunamadı veya size ait değil';
  end if;

  if p_baslangic <= now() then
    raise exception 'Geçmiş bir saate randevu alınamaz';
  end if;

  -- Bu şubede aktif abonelik (hak şubeye kilitli)
  select s.id into v_sub
  from public.subscriptions s
  where s.user_id = v_uid and s.branch_id = p_branch_id
    and s.durum = 'aktif' and s.silindi_mi = false
  limit 1;
  if v_sub is null then
    raise exception 'Bu şubede aktif aboneliğiniz yok';
  end if;

  -- Seçilen saat programda geçerli + müsait mi?
  select m.dolu, m.kapasite into v_dolu, v_kapasite
  from public.musait_slotlar(p_branch_id, p_service_id, v_gun) m
  where m.baslangic = p_baslangic;
  if not found then raise exception 'Seçilen saat uygun değil'; end if;
  if v_dolu >= v_kapasite then raise exception 'Seçilen saat dolu'; end if;

  -- Cari dönem hakkını ATOMİK düş (kalan_adet>0 koşulu yarış koşulunu önler)
  update public.entitlements
  set kalan_adet = kalan_adet - 1
  where subscription_id = v_sub
    and service_id = p_service_id
    and donem = v_donem
    and kalan_adet > 0
  returning id into v_ent;
  if v_ent is null then
    raise exception 'Bu hizmet için bu dönem kullanılabilir hakkınız yok';
  end if;

  -- Randevu (şube onayı bekler) + hak kullanım kaydı (iade için)
  insert into public.appointments (branch_id, user_id, vehicle_id, service_id, baslangic, durum)
  values (p_branch_id, v_uid, p_vehicle_id, p_service_id, p_baslangic, 'beklemede')
  returning id into v_appt;

  insert into public.entitlement_usage (appointment_id, entitlement_id)
  values (v_appt, v_ent);

  return v_appt;
end;
$$;

-- ------------------------------------------------------------
-- 7) hak_iade — randevu iptal olunca tüketilen hakkı geri ver.
-- Tüm iptal yolları durum='iptal' yazar (müşteri iptali, talep yanıtı) →
-- bu trigger hepsini yakalar. SECURITY DEFINER: müşteri entitlements'a yazamaz
-- ama trigger onun adına iadeyi yapar. entitlement_usage istemciye kapalı
-- olduğu için sahte iade üretilemez.
-- ------------------------------------------------------------
create or replace function public.hak_iade()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.durum = 'iptal' and old.durum is distinct from 'iptal' then
    update public.entitlements e
    set kalan_adet = kalan_adet + 1
    from public.entitlement_usage u
    where u.appointment_id = new.id
      and u.iade_edildi = false
      and e.id = u.entitlement_id;

    update public.entitlement_usage
    set iade_edildi = true
    where appointment_id = new.id and iade_edildi = false;
  end if;
  return new;
end;
$$;

drop trigger if exists hak_iade_trg on public.appointments;
create trigger hak_iade_trg
  after update of durum on public.appointments
  for each row execute function public.hak_iade();

-- ------------------------------------------------------------
-- Grant: yalnızca hak_ile_randevu istemciden çağrılabilir.
-- donem_yenile_tum / donem_haklari_uret / hak_iade istemciye AÇILMAZ
-- (zamanlanmış görev / webhook / trigger bağlamında çalışır).
-- ------------------------------------------------------------
grant execute on function public.hak_ile_randevu(uuid, uuid, uuid, timestamptz) to authenticated;
revoke execute on function public.donem_yenile_tum(date) from public, authenticated;
revoke execute on function public.donem_haklari_uret(uuid, date) from public, authenticated;

-- ------------------------------------------------------------
-- 8) Örnek paketler (admin panelinden düzenlenecek — placeholder).
-- plan_haklari boş bırakıldı; admin her plana hangi hizmetten kaç hak
-- vereceğini (gerçek service_id'lerle) UI'dan tanımlayacak.
-- ------------------------------------------------------------
insert into public.plans (id, ad, kademe, aylik_ucret, aciklama) values
  ('c1a00000-0000-0000-0000-0000000000a1'::uuid, 'Temel', 'temel', 299, 'Aylık temel bakım paketi'),
  ('c1a00000-0000-0000-0000-0000000000a2'::uuid, 'Orta',  'orta',  549, 'Daha sık bakım + ek hizmet'),
  ('c1a00000-0000-0000-0000-0000000000a3'::uuid, 'Üst',   'ust',   899, 'Kapsamlı premium paket')
on conflict (id) do nothing;
