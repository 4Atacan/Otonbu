-- ============================================================
-- R2 (Cloudflare) geçişi — storage yetki fonksiyonu.
--
-- Dosyalar artık Supabase Storage yerine R2'de tutulacak; bu yüzden
-- storage.objects üzerindeki RLS politikaları devreye girmiyor. Bu fonksiyon
-- O POLİTİKALARIN BİREBİR AYNISINI taşır ve r2-imza Edge Function'ı tarafından
-- çağrılır: "bu kullanıcı, bu bucket'taki bu yola, bu işlemi yapabilir mi?"
-- (CLAUDE.md kural 3 = franchise izolasyonu, kural 6 = private dosya).
--
-- SECURITY DEFINER: jobs/appointments/insurance_requests tablolarına serbestçe
-- bakabilmek için RLS baypas edilir; erişim kuralları BURADA elle uygulanır —
-- aksi halde yolu bilen herkes private bir dosyayı indirebilirdi.
-- ============================================================

create or replace function public.r2_yetki(
  p_bucket text,
  p_yol text,
  p_islem text   -- 'yukle' (insert) | 'indir' (select)
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_ilk text := split_part(p_yol, '/', 1);   -- yolun ilk klasörü (uid veya job_id)
  v_rol text;
  v_branch uuid;
begin
  -- Temel guard: oturum + geçerli yol + tanınan işlem.
  if v_uid is null or coalesce(p_yol, '') = '' then
    return false;
  end if;
  if p_islem not in ('yukle', 'indir') then
    return false;
  end if;

  v_rol := public.auth_role();
  v_branch := public.auth_branch();

  -- ---- PUBLIC bucketlar: indirme herkese açık (public URL); yükleme kısıtlı ----
  if p_bucket = 'avatars' then
    if p_islem = 'indir' then return true; end if;
    return v_ilk = v_uid::text;                          -- yalnız kendi klasörüne

  elsif p_bucket = 'service-images' then
    if p_islem = 'indir' then return true; end if;
    return v_rol = 'admin';

  elsif p_bucket = 'campaign-images' then
    if p_islem = 'indir' then return true; end if;
    return v_rol = 'admin';

  elsif p_bucket = 'product-images' then
    if p_islem = 'indir' then return true; end if;
    return v_rol in ('admin', 'yonetici');

  -- ---- PRIVATE: vehicle-docs (ruhsat/kasko) ----
  elsif p_bucket = 'vehicle-docs' then
    if p_islem = 'yukle' then
      return v_ilk = v_uid::text;                         -- yalnız kendi klasörüne
    else
      -- Sahibi VEYA ruhsatı referans eden teklifi görebilen kullanıcı.
      -- İkinci koşul ins_select politikasının aynısıdır (şube izolasyonu):
      -- admin tümünü, yönetici yalnız kendi şubesinin talebini görür.
      return v_ilk = v_uid::text
        or exists (
          select 1 from public.insurance_requests i
          where i.ruhsat_url = p_yol
            and (
              i.user_id = v_uid
              or v_rol = 'admin'
              or (v_rol = 'yonetici' and i.branch_id = v_branch)
            )
        );
    end if;

  -- ---- PRIVATE: job-photos (iş öncesi/sonrası fotoğrafları) ----
  elsif p_bucket = 'job-photos' then
    if p_islem = 'yukle' then
      -- Admin, işi üstlenen usta veya işin şubesinin personeli. Müşteri YÜKLEYEMEZ.
      return exists (
        select 1 from public.jobs j
        join public.appointments a on a.id = j.appointment_id
        where j.id::text = v_ilk
          and (v_rol = 'admin' or j.assigned_to = v_uid or a.branch_id = v_branch)
      );
    else
      -- İşin müşterisi, şube personeli, admin görür.
      return exists (
        select 1 from public.jobs j
        join public.appointments a on a.id = j.appointment_id
        where j.id::text = v_ilk
          and (a.user_id = v_uid or v_rol = 'admin' or a.branch_id = v_branch)
      );
    end if;
  end if;

  return false;  -- tanınmayan bucket → reddet
end;
$$;

-- Yalnızca oturum açmış kullanıcı çağırabilir (Edge Function JWT ile çağırır).
revoke all on function public.r2_yetki(text, text, text) from public;
grant execute on function public.r2_yetki(text, text, text) to authenticated;
