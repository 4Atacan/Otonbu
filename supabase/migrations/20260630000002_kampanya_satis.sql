-- ============================================================
-- Kampanyayı satışa bağla: ürün hedefi + sunucu tarafı indirim.
--   * campaigns.urun_id: kampanya bir ÜRÜNE de bağlanabilir (hizmet_id gibi).
--   * kampanya_indirim(): bir hizmet/ürün için AKTİF + tarih-geçerli en yüksek
--     'indirim' yüzdesini döndürür. Fiyat hesabının TEK doğruluk kaynağı.
--   * siparis_olustur: ürün satışında kampanya indirimini SUNUCUDA uygular
--     (CLAUDE.md kural 2 — istemciye güvenme). Stok düşüşü zaten atomik.
-- ============================================================

alter table public.campaigns
  add column if not exists urun_id uuid references public.products(id) on delete set null;

-- ------------------------------------------------------------
-- Aktif kampanya indirimi (yüzde). Hizmet veya ürün için çağrılır;
-- ikisi de verilirse OR. Tarih sınırı null = süresiz. En yüksek aktif % kazanır.
-- security definer: tüm aktif kampanyaları görmesi için (RLS zaten aktif=true'ya açık).
-- ------------------------------------------------------------
create or replace function public.kampanya_indirim(
  p_hizmet uuid default null,
  p_urun   uuid default null
) returns int
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(max(indirim_yuzde), 0)::int
  from public.campaigns
  where tip = 'indirim'
    and aktif = true
    and indirim_yuzde is not null
    and (baslangic is null or baslangic <= current_date)
    and (bitis is null or bitis >= current_date)
    and (
      (p_hizmet is not null and hizmet_id = p_hizmet)
      or (p_urun is not null and urun_id = p_urun)
    );
$$;

grant execute on function public.kampanya_indirim(uuid, uuid) to authenticated, anon;

-- ------------------------------------------------------------
-- siparis_olustur — ürün kampanya indirimini sunucuda uygula (yeniden tanım).
-- (20260626000001'deki gövdenin aynısı + v_ind indirim adımı.)
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
  v_ind    int;
  v_toplam numeric(10,2) := 0;
begin
  if v_uid is null then raise exception 'Oturum gerekli'; end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Sepet boş';
  end if;

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

    -- Ürün bu şubeye ait + aktif + yeterli stok mu? Fiyatı SUNUCU okur, stok atomik düşer.
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

    -- Kampanya indirimi (varsa) — sunucu kaydından, istemciden DEĞİL.
    v_ind := public.kampanya_indirim(null, v_pid);
    if v_ind > 0 then
      v_fiyat := round(v_fiyat * (1 - v_ind::numeric / 100), 2);
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
