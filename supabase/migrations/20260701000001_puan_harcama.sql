-- ============================================================
-- Puanla hizmet alımı — randevu ödemesinde "puan" yöntemi
--
-- İHTİYAÇ (kullanıcı): Ürün/hizmete puan karşılığı (bedel) eklenebilsin (admin).
--   Müşteri RANDEVU alırken ödeme adımında puanı görsün ve puanı yeterse hizmeti
--   PUANLA alabilsin. (Kupon/kod mekanizması KULLANILMIYOR — bilinçli olarak yok.)
--
-- KARARLAR:
--   * puan_bedeli = kalem kaç puana alınır (kazandırdığı `puan`dan AYRI). 0 = alınamaz.
--   * Ödeme yöntemi 'puan' → randevu_olustur puanı SUNUCUDA düşer (kural 2: bakiye
--     istemcide hesaplanmaz). Çift harcama advisory lock ile serileştirilir.
--   * Randevu iptal olursa (self-iptal / yönetici talebi / KVKK silme) puan İADE
--     edilir (trigger, ref UNIQUE = idempotent).
--   * Randevu 'beklemede' açılır (onay akışı korunur); puan hemen düşer, iptalde iade.
-- ============================================================

-- ------------------------------------------------------------
-- 1) Puanla alım bedeli (kazandırdığı `puan`dan AYRI). 0 = puanla alınamaz.
-- ------------------------------------------------------------
alter table public.services
  add column if not exists puan_bedeli int not null default 0 check (puan_bedeli >= 0);
alter table public.products
  add column if not exists puan_bedeli int not null default 0 check (puan_bedeli >= 0);

comment on column public.services.puan_bedeli is 'Bu hizmet kaç OTONBU puanına alınabilir (0 = puanla alınamaz).';
comment on column public.products.puan_bedeli is 'Bu ürün kaç OTONBU puanına alınabilir (0 = puanla alınamaz).';

-- ------------------------------------------------------------
-- 2) Ödeme yöntemine 'puan' eklendi
-- ------------------------------------------------------------
alter table public.appointments drop constraint if exists appointments_odeme_yontemi_check;
alter table public.appointments
  add constraint appointments_odeme_yontemi_check
  check (odeme_yontemi in ('subede', 'online', 'puan'));

-- ------------------------------------------------------------
-- 3) randevu_olustur — p_odeme_yontemi eklendi; 'puan'da puanı düşer
--    (eski 4 argümanlı imza kaldırılır ki çağrı belirsiz olmasın)
-- ------------------------------------------------------------
drop function if exists public.randevu_olustur(uuid, uuid, uuid, timestamptz);

create or replace function public.randevu_olustur(
  p_branch_id     uuid,
  p_service_id    uuid,
  p_vehicle_id    uuid,
  p_baslangic     timestamptz,
  p_odeme_yontemi text default 'subede'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid      uuid := auth.uid();
  v_gun      date := (p_baslangic at time zone 'Europe/Istanbul')::date;
  v_dolu     int;
  v_kapasite int;
  v_appt     uuid;
  v_ad       text;
  v_bedel    int;
  v_bakiye   int;
begin
  if v_uid is null then raise exception 'Oturum gerekli'; end if;
  if p_odeme_yontemi not in ('subede', 'online', 'puan') then
    raise exception 'Geçersiz ödeme yöntemi';
  end if;

  if not exists (
    select 1 from public.vehicles v where v.id = p_vehicle_id and v.user_id = v_uid
  ) then
    raise exception 'Araç bulunamadı veya size ait değil';
  end if;

  if p_baslangic <= now() then
    raise exception 'Geçmiş bir saate randevu alınamaz';
  end if;

  -- Seçilen saat programdaki geçerli bir aday mı ve müsait mi?
  select m.dolu, m.kapasite into v_dolu, v_kapasite
  from public.musait_slotlar(p_branch_id, p_service_id, v_gun) m
  where m.baslangic = p_baslangic;

  if not found then
    raise exception 'Seçilen saat uygun değil';
  end if;
  if v_dolu >= v_kapasite then
    raise exception 'Seçilen saat dolu';
  end if;

  -- Puanla ödeme: bedel + bakiye SUNUCUDA doğrulanır (kural 2).
  if p_odeme_yontemi = 'puan' then
    perform pg_advisory_xact_lock(hashtext(v_uid::text));  -- çift harcama engeli
    select s.ad, s.puan_bedeli into v_ad, v_bedel
    from public.services s where s.id = p_service_id and s.aktif = true;
    if coalesce(v_bedel, 0) <= 0 then
      raise exception 'Bu hizmet puanla alınamaz';
    end if;
    select coalesce(sum(puan_degisim), 0) into v_bakiye
    from public.loyalty_ledger where user_id = v_uid;
    if v_bakiye < v_bedel then
      raise exception 'Yetersiz puan (bakiye %, gerekli %)', v_bakiye, v_bedel;
    end if;
  end if;

  -- Şube onayı bekler ('beklemede'); yönetici onaylayınca 'onayli' olur.
  insert into public.appointments
    (branch_id, user_id, vehicle_id, service_id, baslangic, durum, odeme_yontemi)
  values
    (p_branch_id, v_uid, p_vehicle_id, p_service_id, p_baslangic, 'beklemede', p_odeme_yontemi)
  returning id into v_appt;

  -- Puanı düş (ref UNIQUE = randevu başına tek kayıt). İptalde iade trigger'ı iade eder.
  if p_odeme_yontemi = 'puan' then
    insert into public.loyalty_ledger (user_id, puan_degisim, sebep, ref)
    values (v_uid, -v_bedel, 'Puanla randevu: ' || coalesce(v_ad, 'Hizmet'), 'randevu:' || v_appt);
  end if;

  return v_appt;
end;
$$;

grant execute on function public.randevu_olustur(uuid, uuid, uuid, timestamptz, text) to authenticated;

-- ------------------------------------------------------------
-- 4) Puan iadesi — puanla alınan randevu iptal olunca puanı geri ver
--    Tüm iptal yollarını kapsar (self-iptal / talep_yanitla / KVKK silme).
--    İade tutarı defterdeki harcama satırından okunur (bedel sonradan değişse de doğru).
-- ------------------------------------------------------------
create or replace function public.randevu_puan_iade()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_iade int;
begin
  if new.durum = 'iptal' and old.durum is distinct from new.durum
     and new.odeme_yontemi = 'puan' then
    select -puan_degisim into v_iade
    from public.loyalty_ledger where ref = 'randevu:' || new.id;
    if coalesce(v_iade, 0) > 0 then
      insert into public.loyalty_ledger (user_id, puan_degisim, sebep, ref)
      values (new.user_id, v_iade, 'Randevu iptali — puan iadesi', 'randevu-iade:' || new.id)
      on conflict (ref) do nothing;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists randevu_puan_iade_trg on public.appointments;
create trigger randevu_puan_iade_trg
  after update on public.appointments
  for each row execute function public.randevu_puan_iade();
