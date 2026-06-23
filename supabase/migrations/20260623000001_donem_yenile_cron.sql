-- ============================================================
-- FAZ 3 — Adım 3: Dönem yenileme (zamanlanmış görev + tembel üretim)
--
-- donem_yenile_tum() zaten var (20260621000001): ay başı, aktif aboneliklere o
-- dönemin haklarını üretir (devir YOK, idempotent). Bu migration onu otomatikleştirir.
--
-- İKİ KATMAN:
--   1) pg_cron görevi — her ayın 1'inde donem_yenile_tum() (toplu üretim / yedek).
--   2) hak_ile_randevu tembel üretim — randevu anında, ilgili dönemin hakkı henüz
--      yoksa plan şablonundan üretir. Cron'un tetiklenme zamanına bağımlılığı kaldırır:
--        * cron UTC'de çalışır; ayın ilk saatlerinde (Istanbul) henüz koşmamış olabilir,
--        * müşteri gelecek aya randevu almak isteyebilir (o dönem henüz üretilmemiştir).
--      Böylece cron yalnızca toplu/yedek mekanizma olur; doğruluk booking anında garanti.
--
-- DAYANIKLILIK: pg_cron yalnız shared_preload_libraries'te ön-yüklenmişse kurulur.
--   Supabase cloud'da yüklüdür; yerel test stack'inde olmayabilir → o durumda zamanlama
--   atlanır (yerel `db reset` / pgTAP testleri bozulmasın). Tembel üretim her ortamda çalışır.
-- ============================================================

-- ------------------------------------------------------------
-- 1) hak_ile_randevu: hedef dönemin hakkını tembel üret (cron'a bağımlı kalma)
--    20260621000001'deki gövdenin aynısı + atomik düşüşten hemen önce tek satır
--    (perform donem_haklari_uret). donem_haklari_uret idempotent: dönem zaten
--    varsa dokunmaz, tüketilmiş sayacı bozmaz; plan o hizmeti vermiyorsa satır
--    oluşmaz → düşüş "hak yok" hatası verir (davranış değişmez).
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

  -- Cari dönem hakkı henüz üretilmemişse (cron tetiklenmeden ya da gelecek aya
  -- rezervasyon) plan şablonundan anında üret. Idempotent — varsa dokunmaz.
  perform public.donem_haklari_uret(v_sub, v_donem);

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

grant execute on function public.hak_ile_randevu(uuid, uuid, uuid, timestamptz) to authenticated;

-- ------------------------------------------------------------
-- 2) pg_cron görevi — her ayın 1'inde donem_yenile_tum() (toplu üretim / yedek)
--    Cron UTC çalışır; 00:07 UTC'de günün 1'i hem UTC hem Istanbul'da 1'dir →
--    donem_yenile_tum varsayılan dönemi (date_trunc month, current_date) doğru ay.
--    Idempotent: aynı isimli görev varsa cron.schedule günceller.
-- ------------------------------------------------------------
do $$
begin
  if coalesce(current_setting('shared_preload_libraries', true), '') like '%pg_cron%' then
    execute 'create extension if not exists pg_cron';
    execute format(
      'select cron.schedule(%L, %L, %L)',
      'donem-yenile', '7 0 1 * *', 'select public.donem_yenile_tum()'
    );
    raise notice 'donem-yenile cron gorevi kuruldu (her ayin 1''i, 00:07 UTC)';
  else
    raise notice 'pg_cron on-yuklu degil; donem-yenile zamanlanmadi (yerel ortam). Tembel uretim devrede.';
  end if;
end $$;
