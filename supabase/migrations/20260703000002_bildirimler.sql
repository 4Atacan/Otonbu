-- ============================================================
-- Bildirim sistemi: uygulama içi bildirim merkezi + Expo push
--
-- İKİ KATMAN:
--   1) notifications tablosu — uygulama içi bildirim merkezi (navbar zili).
--      Realtime publication'a eklenir → rozet anında güncellenir.
--      Expo Go'da da çalışır.
--   2) Expo push — users.expo_push_token doluysa pg_net ile
--      https://exp.host/--/api/v2/push/send'e asenkron POST atılır.
--      (Expo Go SDK 53+ uzak push DESTEKLEMEZ; token ancak dev build'de
--      kaydolur. Token yoksa push adımı sessizce atlanır.)
--
-- OLAYLAR (tetikleyiciler):
--   * appointments INSERT            → şube yöneticilerine "Yeni randevu talebi"
--   * appointments durum → onayli    → müşteriye "Randevun onaylandı"
--   * jobs durum → hazir             → müşteriye "Aracın hazır"
--   * service_quotes INSERT          → şube yöneticilerine "Yeni teklif talebi"
--   * insurance_requests INSERT      → şube yöneticilerine "Yeni sigorta talebi"
--   * orders INSERT (kaynak=uygulama)→ şube yöneticilerine "Yeni sipariş talebi"
--
-- KVKK: bildirim metinlerine kişisel veri (ad, plaka, telefon) YAZILMAZ —
--   yalnız hizmet adı + tarih. Yöneticinin bildirim geçmişi, müşteri hesabını
--   silse bile kişisel iz taşımaz. expo_push_token kişisel veri sayılır:
--   hesabimi_sil scrub'ına eklendi.
-- ============================================================

-- 1) pg_net — trigger'dan asenkron HTTP (Supabase'te hazır uzantı)
create extension if not exists pg_net;

-- 2) Cihaz push adresi (KİŞİSEL VERİ: hesap silmede scrub edilir)
alter table public.users
  add column if not exists expo_push_token text;

-- 3) Uygulama içi bildirimler
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  baslik     text not null,
  govde      text not null,
  ref        text,                                -- 'randevu:<id>', 'siparis:<id>' ... (yönlendirme)
  okundu_mu  boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

-- Herkes YALNIZ kendi bildirimini görür; okundu işaretlemek için günceller.
-- INSERT politikası YOK: bildirim yalnız sunucu (security definer fn) yazar.
create policy notifications_own_select on public.notifications
  for select using (user_id = auth.uid());
create policy notifications_own_update on public.notifications
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Realtime: navbar rozeti anında güncellensin (RLS realtime'da da geçerli)
do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null;
end $$;

-- ------------------------------------------------------------
-- 4) Çekirdek: tek kullanıcıya bildirim (satır + push)
-- ------------------------------------------------------------
create or replace function public.bildirim_at(
  p_user uuid, p_baslik text, p_govde text, p_ref text default null
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_token text;
begin
  insert into public.notifications (user_id, baslik, govde, ref)
  values (p_user, p_baslik, p_govde, p_ref);

  -- Push: token kayıtlıysa Expo'ya asenkron POST. Başarısızlık ana işlemi
  -- (randevu insert'i vb.) ASLA bozmasın.
  select expo_push_token into v_token
    from public.users where id = p_user and silindi_mi = false;
  if v_token is not null and v_token like 'ExponentPushToken%' then
    begin
      perform net.http_post(
        url     := 'https://exp.host/--/api/v2/push/send',
        body    := jsonb_build_object(
          'to', v_token, 'title', p_baslik, 'body', p_govde,
          'sound', 'default', 'data', jsonb_build_object('ref', p_ref)
        ),
        headers := '{"Content-Type": "application/json"}'::jsonb
      );
    exception when others then null;
    end;
  end if;
end;
$$;

-- Şubenin TÜM yöneticilerine (franchise: yalnız o şube; admin'e gitmez)
create or replace function public.bildirim_subeye(
  p_branch uuid, p_baslik text, p_govde text, p_ref text default null
) returns void language plpgsql security definer set search_path = public as $$
declare
  r record;
begin
  if p_branch is null then return; end if;
  for r in
    select id from public.users
     where branch_id = p_branch and rol = 'yonetici' and silindi_mi = false
  loop
    perform public.bildirim_at(r.id, p_baslik, p_govde, p_ref);
  end loop;
end;
$$;

-- ------------------------------------------------------------
-- 5) Tetikleyiciler
-- ------------------------------------------------------------

-- a) Yeni randevu talebi → şube yöneticileri
create or replace function public.bildirim_randevu_yeni()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_hizmet text;
begin
  select ad into v_hizmet from public.services where id = new.service_id;
  perform public.bildirim_subeye(
    new.branch_id,
    'Yeni randevu talebi',
    coalesce(v_hizmet, 'Hizmet') || ' — '
      || to_char(new.baslangic at time zone 'Europe/Istanbul', 'DD.MM.YYYY HH24:MI'),
    'randevu:' || new.id
  );
  return new;
end;
$$;
drop trigger if exists bildirim_randevu_yeni on public.appointments;
create trigger bildirim_randevu_yeni
  after insert on public.appointments
  for each row execute function public.bildirim_randevu_yeni();

-- b) Randevu onaylandı → müşteri
create or replace function public.bildirim_randevu_onay()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_hizmet text;
begin
  if new.durum = 'onayli' and old.durum is distinct from new.durum then
    select ad into v_hizmet from public.services where id = new.service_id;
    perform public.bildirim_at(
      new.user_id,
      'Randevun onaylandı',
      coalesce(v_hizmet, 'Hizmet') || ' — '
        || to_char(new.baslangic at time zone 'Europe/Istanbul', 'DD.MM.YYYY HH24:MI')
        || ' randevun onaylandı. Seni bekliyoruz!',
      'randevu:' || new.id
    );
  end if;
  return new;
end;
$$;
drop trigger if exists bildirim_randevu_onay on public.appointments;
create trigger bildirim_randevu_onay
  after update of durum on public.appointments
  for each row execute function public.bildirim_randevu_onay();

-- c) İş hazır → müşteri
create or replace function public.bildirim_is_hazir()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid; v_hizmet text; v_randevu uuid;
begin
  if new.durum = 'hazir' and old.durum is distinct from new.durum then
    select a.user_id, s.ad, a.id into v_uid, v_hizmet, v_randevu
      from public.appointments a
      join public.services s on s.id = a.service_id
     where a.id = new.appointment_id;
    if v_uid is not null then
      perform public.bildirim_at(
        v_uid,
        'Aracın hazır!',
        coalesce(v_hizmet, 'Hizmet') || ' tamamlandı. Aracını teslim alabilirsin.',
        'randevu:' || v_randevu
      );
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists bildirim_is_hazir on public.jobs;
create trigger bildirim_is_hazir
  after update on public.jobs
  for each row execute function public.bildirim_is_hazir();

-- d) Yeni teklif talebi → şube yöneticileri
create or replace function public.bildirim_teklif_yeni()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_hizmet text;
begin
  select ad into v_hizmet from public.services where id = new.service_id;
  perform public.bildirim_subeye(
    new.branch_id,
    'Yeni teklif talebi',
    coalesce(v_hizmet, 'Hizmet') || ' için teklif isteniyor.',
    'teklif:' || new.id
  );
  return new;
end;
$$;
drop trigger if exists bildirim_teklif_yeni on public.service_quotes;
create trigger bildirim_teklif_yeni
  after insert on public.service_quotes
  for each row execute function public.bildirim_teklif_yeni();

-- e) Yeni sigorta talebi → şube yöneticileri
create or replace function public.bildirim_sigorta_yeni()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.bildirim_subeye(
    new.branch_id,
    'Yeni sigorta talebi',
    'Sigorta teklif talebi geldi.',
    'sigorta:' || new.id
  );
  return new;
end;
$$;
drop trigger if exists bildirim_sigorta_yeni on public.insurance_requests;
create trigger bildirim_sigorta_yeni
  after insert on public.insurance_requests
  for each row execute function public.bildirim_sigorta_yeni();

-- f) Yeni sipariş talebi → şube yöneticileri (dükkanda satış HARİÇ:
--    onu zaten yönetici/çalışan kendi eliyle giriyor)
create or replace function public.bildirim_siparis_yeni()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.kaynak = 'uygulama' then
    perform public.bildirim_subeye(
      new.branch_id,
      'Yeni sipariş talebi',
      'Mağazadan yeni sipariş talebi geldi.',
      'siparis:' || new.id
    );
  end if;
  return new;
end;
$$;
drop trigger if exists bildirim_siparis_yeni on public.orders;
create trigger bildirim_siparis_yeni
  after insert on public.orders
  for each row execute function public.bildirim_siparis_yeni();

-- ------------------------------------------------------------
-- 6) KVKK: hesap silmede push token'ı da scrub et
--    (20260630000003'teki hesabimi_sil'in üstüne yalnız token satırı eklendi)
-- ------------------------------------------------------------
create or replace function public.hesabimi_sil()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Oturum gerekli'; end if;

  -- Kişisel kimlik alanları (avatar + cihaz push adresi dahil)
  update public.users
    set ad_soyad = null, email = null, telefon = null,
        avatar_url = null, expo_push_token = null, silindi_mi = true
    where id = v_uid;

  -- Araç plakası kişisel veridir
  update public.vehicles
    set plaka = '(silindi)', marka = null, model = null
    where user_id = v_uid;

  -- Teklif/sigorta talepleri (iletişim snapshot'ı)
  update public.insurance_requests
    set ad_soyad = null, telefon = null, plaka = null, arac_detay = null,
        musteri_not = null, silindi_mi = true
    where user_id = v_uid;
  update public.service_quotes
    set ad_soyad = null, telefon = null, plaka = null, arac_detay = null,
        musteri_not = null, silindi_mi = true
    where user_id = v_uid;

  -- Sipariş notu serbest metin → temizle (toplam muhasebe için kalır)
  update public.orders set musteri_not = null where user_id = v_uid;

  -- Aktif abonelikleri durdur (muhasebe kaydı kalır), gelecek randevuları iptal et
  update public.subscriptions set durum = 'iptal'
    where user_id = v_uid and durum <> 'iptal';
  update public.appointments set durum = 'iptal'
    where user_id = v_uid and durum in ('beklemede', 'onayli');

  -- payments: DOKUNULMAZ (muhasebe; artık anonim kullanıcıya bağlı).
end;
$$;

grant execute on function public.hesabimi_sil() to authenticated;
