-- ============================================================
-- Faz 4 — Sadakat puanı (loyalty_ledger)
--
-- KARAR (kullanıcı): Her hizmetin/ürünün bir PUAN karşılığı olur (admin/yönetici
--   belirler). Müşteri o hizmeti yaptırınca / ürünü alınca puanı kazanır —
--   ABONELİK hakkıyla alsa bile (ödemeye değil, TAMAMLANMAYA bağlı). Puan,
--   iş 'hazir/tamamlandi' olunca (hizmet) ve sipariş 'teslim' olunca (ürün)
--   SUNUCUDA (definer trigger) yazılır; istemci puan yazamaz (kural 2).
-- Idempotency: loyalty_ledger.ref (job:<id> / order:<id>) UNIQUE → çift tetik
--   yeni puan yazmaz.
-- ============================================================

-- ------------------------------------------------------------
-- 1) Kalem başına puan değeri
-- ------------------------------------------------------------
alter table public.services
  add column if not exists puan int not null default 0 check (puan >= 0);
alter table public.products
  add column if not exists puan int not null default 0 check (puan >= 0);

comment on column public.services.puan is 'Bu hizmet tamamlanınca müşteriye verilen sadakat puanı.';
comment on column public.products.puan is 'Bu ürün siparişi teslim edilince verilen sadakat puanı (adet × puan).';

-- ------------------------------------------------------------
-- 2) loyalty_ledger — puan defteri (kazanım +, harcama -)
-- ------------------------------------------------------------
create table if not exists public.loyalty_ledger (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users(id) on delete cascade,
  puan_degisim int not null,                 -- + kazanım / - harcama
  sebep        text not null,
  ref          text unique,                  -- idempotency anahtarı (job:<id>/order:<id>); NULL = manuel
  created_at   timestamptz not null default now()
);
create index if not exists loyalty_ledger_user_idx on public.loyalty_ledger(user_id);

-- ------------------------------------------------------------
-- 3) RLS: kullanıcı kendi puan defterini görür; admin hepsini. Yazma YOK
--    (yalnız definer trigger / service_role). Harcama ileride RPC ile.
-- ------------------------------------------------------------
alter table public.loyalty_ledger enable row level security;

create policy loyalty_self on public.loyalty_ledger
  for select using (user_id = auth.uid() or public.auth_role() = 'admin');

-- ------------------------------------------------------------
-- 4) Tetikleyiciler — tamamlanınca puan yaz (definer → RLS atlar)
-- ------------------------------------------------------------
-- Hizmet: iş 'hazir' veya 'tamamlandi'ya İLK geçişte randevunun hizmet puanı.
create or replace function public.puan_ver_job()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid; v_puan int; v_ad text;
begin
  if new.durum in ('hazir','tamamlandi')
     and old.durum is distinct from new.durum
     and old.durum not in ('hazir','tamamlandi') then
    select a.user_id, s.puan, s.ad into v_uid, v_puan, v_ad
    from public.appointments a
    join public.services s on s.id = a.service_id
    where a.id = new.appointment_id;
    if v_uid is not null and coalesce(v_puan, 0) > 0 then
      insert into public.loyalty_ledger (user_id, puan_degisim, sebep, ref)
      values (v_uid, v_puan, 'Hizmet: ' || coalesce(v_ad, 'Hizmet'), 'job:' || new.id)
      on conflict (ref) do nothing;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists puan_ver_job_trg on public.jobs;
create trigger puan_ver_job_trg
  after update on public.jobs
  for each row execute function public.puan_ver_job();

-- Ürün: sipariş 'teslim'e geçince kalemlerin ürün puanı toplamı (adet × puan).
create or replace function public.puan_ver_order()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_puan int;
begin
  if new.durum = 'teslim' and old.durum is distinct from new.durum then
    select coalesce(sum(oi.adet * coalesce(p.puan, 0)), 0) into v_puan
    from public.order_items oi
    join public.products p on p.id = oi.product_id
    where oi.order_id = new.id;
    if v_puan > 0 then
      insert into public.loyalty_ledger (user_id, puan_degisim, sebep, ref)
      values (new.user_id, v_puan, 'Mağaza siparişi', 'order:' || new.id)
      on conflict (ref) do nothing;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists puan_ver_order_trg on public.orders;
create trigger puan_ver_order_trg
  after update on public.orders
  for each row execute function public.puan_ver_order();
