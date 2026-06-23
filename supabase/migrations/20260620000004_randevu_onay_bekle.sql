-- ============================================================
-- Randevu onay akışı geri getirilir: müşteri randevu aldığında randevu
-- DOĞRUDAN onaylanmaz; 'beklemede' durumunda açılır ve şube yöneticisi
-- (yonetim/randevular ekranındaki "Onayla" tuşu) onaylayana kadar bekler.
--
-- Not: musait_slotlar doluluğu durum <> 'iptal' ile sayar; yani 'beklemede'
-- randevu da slotu tutar (çift rezervasyon olmaz). İşler listesi yalnızca
-- 'onayli' randevuları iş olarak gösterir → onaysız randevu işe düşmez.
-- ============================================================

-- Savunma derinliği: RPC dışından durum belirtmeden insert olursa da
-- auto-onay olmasın diye kolon varsayılanını da 'beklemede' yap.
alter table public.appointments
  alter column durum set default 'beklemede';

create or replace function public.randevu_olustur(
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
  v_dolu     int;
  v_kapasite int;
  v_appt     uuid;
begin
  if v_uid is null then raise exception 'Oturum gerekli'; end if;

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

  -- Şube onayı bekler ('beklemede'); yönetici onaylayınca 'onayli' olur.
  insert into public.appointments (branch_id, user_id, vehicle_id, service_id, baslangic, durum)
  values (p_branch_id, v_uid, p_vehicle_id, p_service_id, p_baslangic, 'beklemede')
  returning id into v_appt;

  return v_appt;
end;
$$;

grant execute on function public.randevu_olustur(uuid, uuid, uuid, timestamptz) to authenticated;
