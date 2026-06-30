-- ============================================================
-- Faz 4 — KVKK tamamlama: rıza kaydı (consents) + "verilerimi sil"
--
-- KARARLAR (CLAUDE.md KVKK bölümü):
--   * consents = APPEND-ONLY rıza günlüğü. Kim, neye (aydınlatma metni versiyonu /
--     açık rıza / ticari ileti), ne zaman rıza verdi. Satır silinmez/değişmez;
--     izin değişince YENİ satır eklenir. Ticari ileti, uygulama rızasından AYRI.
--   * Kayıt anında rıza: signUp metadata'sındaki kvkk_versiyon + ticari_ileti'den
--     handle_new_user trigger'ı (definer) consents satırlarını yazar.
--   * Silme hakkı = HARD DELETE YOK. Kişisel alanlar anonimleştirilir + silindi_mi.
--     Ödeme/abonelik kaydı kişiye bağlanamaz halde muhasebe için KALIR.
-- Sıra: tablo → RLS → trigger güncelle → hesabimi_sil RPC
-- ============================================================

-- ------------------------------------------------------------
-- 1) consents — rıza günlüğü (append-only)
-- ------------------------------------------------------------
create table if not exists public.consents (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.users(id) on delete cascade,
  tip            text not null check (tip in ('aydinlatma','acik_riza','ticari_ileti')),
  metin_versiyon text not null,                 -- hangi metne rıza verildi (örn. 'v1')
  verildi_mi     boolean not null,
  created_at     timestamptz not null default now()
);
create index if not exists consents_user_idx on public.consents(user_id);

-- ------------------------------------------------------------
-- 2) RLS: kullanıcı yalnız kendi rıza kayıtlarını görür/ekler; admin hepsini görür.
--    Güncelleme/silme YOK (append-only audit).
-- ------------------------------------------------------------
alter table public.consents enable row level security;

create policy consents_select on public.consents
  for select using (user_id = auth.uid() or public.auth_role() = 'admin');

create policy consents_insert_self on public.consents
  for insert with check (user_id = auth.uid());

-- ------------------------------------------------------------
-- 3) handle_new_user: kullanıcı satırı + (varsa) kayıt rızalarını yaz
--    signUp metadata: { ad_soyad, telefon, kvkk_versiyon, ticari_ileti }
--    kvkk_versiyon yoksa (personel/eski kayıt) rıza yazılmaz — davranış değişmez.
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
set search_path = public as $$
declare
  v_ver  text := new.raw_user_meta_data->>'kvkk_versiyon';
  v_tic  boolean := coalesce((new.raw_user_meta_data->>'ticari_ileti')::boolean, false);
begin
  insert into public.users (id, email, telefon, ad_soyad)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'telefon', new.phone),
    new.raw_user_meta_data->>'ad_soyad'
  )
  on conflict (id) do nothing;

  -- Kayıt akışından gelen rızalar (aydınlatma + açık rıza zorunlu, ticari ileti ayrı)
  if v_ver is not null then
    insert into public.consents (user_id, tip, metin_versiyon, verildi_mi) values
      (new.id, 'aydinlatma',   v_ver, true),
      (new.id, 'acik_riza',    v_ver, true),
      (new.id, 'ticari_ileti', v_ver, v_tic);
  end if;

  return new;
end;
$$;

-- ------------------------------------------------------------
-- 4) hesabimi_sil — KVKK silme hakkı (anonimleştir + soft delete)
--    Kişisel veriyi siler; ödeme/muhasebe kaydını kişiye bağlanamaz halde bırakır.
--    SECURITY DEFINER: RLS atlar; yalnız kendi hesabına etki eder (auth.uid()).
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

  -- Kişisel kimlik alanları
  update public.users
    set ad_soyad = null, email = null, telefon = null, silindi_mi = true
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
