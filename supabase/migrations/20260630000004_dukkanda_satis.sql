-- ============================================================
-- Dükkanda (şubede) satış + şubede ödeme alındı işareti
--
-- İHTİYAÇ (kullanıcı): Mağaza yöneticisi/çalışanı, dükkanda uygulamadan bağımsız
--   ürün satabilsin ("şu satıldı") → stok düşer, hesap artar. Randevulu müşteri
--   şubede öderse "ödeme alındı" işaretlensin. Çalışan da bunları yapabilir
--   (saha personeli kasayı da görür — rol_modeli'nin "yalnız randevu+iş" daralması
--    burada bilinçli olarak gevşetiliyor: dükkan satışı + tahsilat saha işidir).
--
-- KARARLAR:
--   * Satış kaydı = orders/order_items (kaynak='dukkan'). Fiyat/stok SUNUCUDA
--     (dukkan_satis RPC, SECURITY DEFINER) → kural 2 korunur.
--   * Walk-in (hesapsız) müşteri olabilir → orders.user_id NULLABLE.
--   * Tahsilat = appointments.odeme_alindi (yalnız 'subede' ödemede anlamlı).
-- Sıra: kolonlar → puan trigger guard → RPC → RLS genişletme
-- ============================================================

-- ------------------------------------------------------------
-- 1) Şubede ödeme alındı işareti (randevu)
-- ------------------------------------------------------------
alter table public.appointments
  add column if not exists odeme_alindi boolean not null default false,
  add column if not exists odeme_alindi_at timestamptz;

comment on column public.appointments.odeme_alindi is
  'Şubede ödeme (odeme_yontemi=subede) tahsil edildi mi — personel İşler ekranından işaretler.';

-- ------------------------------------------------------------
-- 2) orders: dükkan satışı kaynağı + kaydı tutan personel + hesapsız müşteri
-- ------------------------------------------------------------
alter table public.orders
  add column if not exists kaynak text not null default 'uygulama'
    check (kaynak in ('uygulama', 'dukkan')),
  add column if not exists olusturan uuid references public.users(id) on delete set null;

alter table public.orders alter column user_id drop not null;  -- walk-in: hesap yok

-- ------------------------------------------------------------
-- 3) Puan trigger guard: hesapsız (user_id null) dükkan satışında puan yazma
--    (loyalty_ledger.user_id NOT NULL — null insert hata verirdi).
-- ------------------------------------------------------------
create or replace function public.puan_ver_order()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_puan int;
begin
  if new.durum = 'teslim' and old.durum is distinct from new.durum
     and new.user_id is not null then
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

-- ------------------------------------------------------------
-- 4) RPC: dukkan_satis — personel şubede satış kaydeder (atomik stok düşer)
--    p_items: [{ "product_id": "...", "adet": 2 }, ...]
--    p_appointment_id: randevulu müşteriye ekleniyorsa (hesabına yazılır), yoksa null.
--    Döner: order id.
-- ------------------------------------------------------------
create or replace function public.dukkan_satis(
  p_branch_id      uuid,
  p_items          jsonb,
  p_appointment_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_rol    text := public.auth_role();
  v_musteri uuid;            -- satışın bağlanacağı müşteri (randevudan) ya da null
  v_order  uuid;
  v_item   jsonb;
  v_pid    uuid;
  v_adet   int;
  v_fiyat  numeric(10,2);
  v_ad     text;
  v_toplam numeric(10,2) := 0;
begin
  if v_uid is null then raise exception 'Oturum gerekli'; end if;

  -- Yalnız bu şubenin personeli (yonetici/calisan) veya admin satış yazar.
  if not (
    v_rol = 'admin'
    or (v_rol in ('yonetici', 'calisan') and p_branch_id = public.auth_branch())
  ) then
    raise exception 'Bu şubede satış yapma yetkiniz yok';
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Satışa ürün eklenmedi';
  end if;

  -- Randevuya bağlanıyorsa randevu bu şubeye ait olmalı; müşterisi hesaba yazılır.
  if p_appointment_id is not null then
    select a.user_id into v_musteri
    from public.appointments a
    where a.id = p_appointment_id and a.branch_id = p_branch_id;
    if not found then
      raise exception 'Randevu bu şubede bulunamadı';
    end if;
  end if;

  insert into public.orders (branch_id, user_id, appointment_id, kaynak, olusturan, durum, toplam)
  values (p_branch_id, v_musteri, p_appointment_id, 'dukkan', v_uid, 'talep', 0)
  returning id into v_order;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_pid  := (v_item->>'product_id')::uuid;
    v_adet := coalesce((v_item->>'adet')::int, 1);
    if v_adet < 1 then v_adet := 1; end if;

    -- Şubeye ait + aktif + yeterli stok mu? Fiyatı SUNUCU okur, atomik düşer.
    update public.products
    set stok = stok - v_adet,
        satis_adedi = satis_adedi + v_adet
    where id = v_pid
      and branch_id = p_branch_id
      and aktif = true
      and silindi_mi = false
      and stok >= v_adet
    returning fiyat, ad into v_fiyat, v_ad;
    if not found then
      raise exception 'Ürün uygun değil veya stok yetersiz';
    end if;

    insert into public.order_items (order_id, product_id, ad, adet, birim_fiyat)
    values (v_order, v_pid, v_ad, v_adet, v_fiyat);

    v_toplam := v_toplam + v_fiyat * v_adet;
  end loop;

  -- 'teslim' = anında satıldı/teslim (puan trigger müşteri varsa puanı yazar).
  update public.orders set toplam = v_toplam, durum = 'teslim' where id = v_order;
  return v_order;
end;
$$;

grant execute on function public.dukkan_satis(uuid, jsonb, uuid) to authenticated;

-- ------------------------------------------------------------
-- 5) RPC: randevu_odeme_al — personel şubede ödemeyi tahsil ettiğini işaretler
-- ------------------------------------------------------------
create or replace function public.randevu_odeme_al(p_appointment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rol    text := public.auth_role();
  v_branch uuid;
begin
  if auth.uid() is null then raise exception 'Oturum gerekli'; end if;

  select branch_id into v_branch from public.appointments where id = p_appointment_id;
  if not found then raise exception 'Randevu bulunamadı'; end if;

  if not (
    v_rol = 'admin'
    or (v_rol in ('yonetici', 'calisan') and v_branch = public.auth_branch())
  ) then
    raise exception 'Bu randevuda tahsilat yetkiniz yok';
  end if;

  update public.appointments
    set odeme_alindi = true, odeme_alindi_at = now()
    where id = p_appointment_id;
end;
$$;

grant execute on function public.randevu_odeme_al(uuid) to authenticated;

-- ------------------------------------------------------------
-- 6) RLS genişletme: çalışan da kendi şubesinin DÜKKAN satışlarını görsün
--    (İşler ekranında hesap/satış listesi). Uygulama (müşteri) siparişleri
--    çalışana görünmez — yalnız kaynak='dukkan'.
-- ------------------------------------------------------------
drop policy if exists orders_select on public.orders;
create policy orders_select on public.orders
  for select using (
    user_id = auth.uid()
    or public.auth_role() = 'admin'
    or (public.auth_role() = 'yonetici' and branch_id = public.auth_branch())
    or (public.auth_role() = 'calisan' and branch_id = public.auth_branch()
        and kaynak = 'dukkan')
  );

drop policy if exists order_items_select on public.order_items;
create policy order_items_select on public.order_items
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_id and (
        o.user_id = auth.uid()
        or public.auth_role() = 'admin'
        or (public.auth_role() = 'yonetici' and o.branch_id = public.auth_branch())
        or (public.auth_role() = 'calisan' and o.branch_id = public.auth_branch()
            and o.kaynak = 'dukkan')
      )
    )
  );
