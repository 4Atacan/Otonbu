-- ============================================================
-- Mağaza (şube bazlı perakende ürün) + Araç sigorta teklif talebi
--
-- KARARLAR:
--   * Ürünler TAMAMEN ŞUBE BAZLI: her şube kendi ürün/stok/fiyatını tutar
--     (products.branch_id zorunlu). Merkezi katalog yok.
--   * Satış akışı = VİTRİN + SİPARİŞ TALEBİ (ödeme YOK; iyzico beklemede).
--     Müşteri sepet doldurur, siparis_olustur RPC sunucuda fiyatı okur ve
--     stoğu atomik düşer (kural 2: istemciden gelen fiyata güvenme).
--   * Sigorta: yalnızca TEKLİF TALEP FORMU (gerçek entegrasyon yok). KVKK:
--     açık rıza zamanı + ayrı ticari ileti izni + soft delete.
-- Sıra: tablolar → RPC → RLS → storage
-- ============================================================

-- ------------------------------------------------------------
-- 1) Tablolar
-- ------------------------------------------------------------
create table if not exists public.products (
  id          uuid primary key default gen_random_uuid(),
  branch_id   uuid not null references public.branches(id) on delete cascade,
  ad          text not null,
  kategori    text,
  aciklama    text,
  fiyat       numeric(10,2) not null check (fiyat >= 0),
  stok        int not null default 0 check (stok >= 0),
  gorsel      text,                                  -- product-images bucket yolu
  one_cikan   boolean not null default false,        -- manuel "öne çıkar" rozeti
  satis_adedi int not null default 0,                -- otomatik sayaç → çok satan sıralama
  aktif       boolean not null default true,
  silindi_mi  boolean not null default false,        -- soft delete
  created_at  timestamptz not null default now()
);
create index if not exists products_branch_idx on public.products(branch_id);

create table if not exists public.orders (
  id             uuid primary key default gen_random_uuid(),
  branch_id      uuid not null references public.branches(id),
  user_id        uuid not null references public.users(id) on delete cascade,
  appointment_id uuid references public.appointments(id) on delete set null,  -- randevuyla birlikte ise
  durum          text not null default 'talep'
                 check (durum in ('talep','hazirlaniyor','hazir','teslim','iptal')),
  toplam         numeric(10,2) not null default 0,
  musteri_not    text,
  silindi_mi     boolean not null default false,
  created_at     timestamptz not null default now()
);
create index if not exists orders_branch_idx on public.orders(branch_id);
create index if not exists orders_user_idx on public.orders(user_id);

create table if not exists public.order_items (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders(id) on delete cascade,
  product_id  uuid references public.products(id) on delete set null,
  ad          text not null,                  -- sipariş anındaki ürün adı (snapshot)
  adet        int not null default 1 check (adet > 0),
  birim_fiyat numeric(10,2) not null          -- sipariş anındaki fiyat (sunucudan)
);
create index if not exists order_items_order_idx on public.order_items(order_id);

create table if not exists public.insurance_requests (
  id                uuid primary key default gen_random_uuid(),
  branch_id         uuid references public.branches(id),                 -- müşteri şube seçebilir (opsiyonel)
  user_id           uuid not null references public.users(id) on delete cascade,
  vehicle_id        uuid references public.vehicles(id) on delete set null,
  tip               text not null default 'kasko' check (tip in ('trafik','kasko')),
  ad_soyad          text,        -- KİŞİSEL VERİ (iletişim snapshot)
  telefon           text,        -- KİŞİSEL VERİ
  plaka             text,        -- KİŞİSEL VERİ (araç snapshot)
  arac_detay        text,        -- marka/model/yıl serbest metin
  musteri_not       text,
  durum             text not null default 'yeni'
                    check (durum in ('yeni','arandi','teklif_verildi','kapandi')),
  kvkk_riza_at      timestamptz,                       -- açık rıza zamanı (KVKK)
  ticari_ileti_izni boolean not null default false,    -- uygulama rızasından AYRI izin
  silindi_mi        boolean not null default false,    -- KVKK soft delete
  created_at        timestamptz not null default now()
);
create index if not exists insurance_requests_branch_idx on public.insurance_requests(branch_id);
create index if not exists insurance_requests_user_idx on public.insurance_requests(user_id);

-- ------------------------------------------------------------
-- 2) RPC: siparis_olustur — sunucu fiyat okur + atomik stok düşer (kural 2)
--    p_items: [{ "product_id": "...", "adet": 2 }, ...]
-- ------------------------------------------------------------
create or replace function public.siparis_olustur(
  p_branch_id      uuid,
  p_items          jsonb,
  p_appointment_id uuid default null,
  p_not            text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_order  uuid;
  v_item   jsonb;
  v_pid    uuid;
  v_adet   int;
  v_fiyat  numeric(10,2);
  v_ad     text;
  v_toplam numeric(10,2) := 0;
begin
  if v_uid is null then raise exception 'Oturum gerekli'; end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Sepet boş';
  end if;

  -- Randevuya bağlanıyorsa randevu kullanıcıya ait olmalı (savunma derinliği)
  if p_appointment_id is not null then
    if not exists (
      select 1 from public.appointments a
      where a.id = p_appointment_id and a.user_id = v_uid
    ) then
      raise exception 'Randevu bulunamadı veya size ait değil';
    end if;
  end if;

  insert into public.orders (branch_id, user_id, appointment_id, musteri_not, toplam)
  values (p_branch_id, v_uid, p_appointment_id, p_not, 0)
  returning id into v_order;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_pid  := (v_item->>'product_id')::uuid;
    v_adet := coalesce((v_item->>'adet')::int, 1);
    if v_adet < 1 then v_adet := 1; end if;

    -- Ürün bu şubeye ait + aktif + yeterli stok mu? Fiyatı SUNUCU okur.
    -- Atomik düşüş (stok >= adet koşulu yarış koşulunu önler).
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

  update public.orders set toplam = v_toplam where id = v_order;
  return v_order;
end;
$$;

grant execute on function public.siparis_olustur(uuid, jsonb, uuid, text) to authenticated;

-- ------------------------------------------------------------
-- 3) RLS
-- ------------------------------------------------------------
alter table public.products            enable row level security;
alter table public.orders              enable row level security;
alter table public.order_items         enable row level security;
alter table public.insurance_requests  enable row level security;

-- products: müşteri yalnızca aktif/silinmemiş ürünleri görür; şube personeli ve
-- admin kendi şubesinin hepsini görür. Yazma: admin + o şubenin sahibi.
create policy products_select on public.products
  for select using (
    (aktif and not silindi_mi)
    or public.auth_role() = 'admin'
    or (public.auth_role() in ('sube_sahibi','kasa','usta')
        and branch_id = public.auth_branch())
  );

create policy products_manage on public.products
  for all using (
    public.auth_role() = 'admin'
    or (public.auth_role() = 'sube_sahibi' and branch_id = public.auth_branch())
  ) with check (
    public.auth_role() = 'admin'
    or (public.auth_role() = 'sube_sahibi' and branch_id = public.auth_branch())
  );

-- orders: müşteri kendi siparişini; şube personeli + admin şubeyi görür.
-- Yazımı siparis_olustur (SECURITY DEFINER) yapar → istemci insert edemez.
-- Personel durum güncelleyebilir.
create policy orders_select on public.orders
  for select using (
    user_id = auth.uid()
    or public.auth_role() = 'admin'
    or (public.auth_role() in ('sube_sahibi','kasa','usta')
        and branch_id = public.auth_branch())
  );

create policy orders_staff_update on public.orders
  for update using (
    public.auth_role() = 'admin'
    or (public.auth_role() in ('sube_sahibi','kasa')
        and branch_id = public.auth_branch())
  ) with check (
    public.auth_role() = 'admin'
    or (public.auth_role() in ('sube_sahibi','kasa')
        and branch_id = public.auth_branch())
  );

-- order_items: bağlı sipariş görünüyorsa görünür. Yazım RPC içinde (definer).
create policy order_items_select on public.order_items
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_id and (
        o.user_id = auth.uid()
        or public.auth_role() = 'admin'
        or (public.auth_role() in ('sube_sahibi','kasa','usta')
            and o.branch_id = public.auth_branch())
      )
    )
  );

-- insurance_requests: müşteri kendi talebini oluşturur/görür; personel + admin
-- (şubesindekini) görür ve durum günceller.
create policy ins_select on public.insurance_requests
  for select using (
    user_id = auth.uid()
    or public.auth_role() = 'admin'
    or (public.auth_role() in ('sube_sahibi','kasa')
        and branch_id = public.auth_branch())
  );

create policy ins_insert_self on public.insurance_requests
  for insert with check (user_id = auth.uid());

create policy ins_staff_update on public.insurance_requests
  for update using (
    public.auth_role() = 'admin'
    or (public.auth_role() in ('sube_sahibi','kasa')
        and branch_id = public.auth_branch())
  ) with check (
    public.auth_role() = 'admin'
    or (public.auth_role() in ('sube_sahibi','kasa')
        and branch_id = public.auth_branch())
  );

-- ------------------------------------------------------------
-- 4) Storage: product-images (PUBLIC katalog görseli — service-images gibi).
--    Okuma herkese açık; yazma admin + şube sahibi.
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880,
        array['image/jpeg', 'image/png'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy product_images_select on storage.objects
  for select using (bucket_id = 'product-images');

create policy product_images_insert on storage.objects
  for insert with check (
    bucket_id = 'product-images' and public.auth_role() in ('admin','sube_sahibi')
  );

create policy product_images_update on storage.objects
  for update using (
    bucket_id = 'product-images' and public.auth_role() in ('admin','sube_sahibi')
  );

create policy product_images_delete on storage.objects
  for delete using (
    bucket_id = 'product-images' and public.auth_role() in ('admin','sube_sahibi')
  );
