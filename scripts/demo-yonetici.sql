-- ============================================================
-- Mağaza başvurusu — MEVCUT demo hesabına yöneticilik ver
--   Hedef hesap: otonbugarage+demo@gmail.com  (zaten kayıtlı müşteri)
--
-- NEDEN TEK HESAP YETİYOR?
--   app/(main)/* müşteri ekranları role göre KAPANMAZ — giriş yapan herkes görür.
--   app/(yonetim)/* yalnızca PERSONEL_ROLLER = ['admin','yonetici','calisan'].
--   profil.tsx'te personel için "Yönetici Paneline Geç" düğmesi belirir.
--   → Hakem giriş yapınca müşteri akışına düşer, Profil'den panele geçebilir.
--   Ayrıca users.telefon UNIQUE olduğu için ikinci demo hesabı açılamıyor.
--
-- NEDEN AYRI BİR "DEMO ŞUBE"?
--   Gerçek bir şubeye bağlarsak hakem, o şubenin panelinde gerçek müşterilerin
--   ad/telefon/plaka bilgisini görür → KVKK ihlali; ayrıca gerçek randevuları
--   onaylayıp iptal edebilir.
--   Demo şube aktif=false → müşteri ekranlarında GÖRÜNMEZ
--   (randevu-al / magaza / sigorta hepsi .eq('aktif', true) filtreler),
--   yönetim paneli branch_id ile okuduğu için yine de çalışır.
--   RLS: yönetici yalnızca branch_id = auth_branch() satırlarını görür → demo
--   şube boş olduğundan hiçbir gerçek kişisel veri açılmaz.
--
-- ETKİ
--   auth_role() rolü public.users'tan okur → değişiklik ANINDA geçerli,
--   yeniden giriş gerekmez. Hesabın müşteri tarafı aynen çalışmaya devam eder
--   (randevu alma, mağaza, puan) — branch_id yalnızca personel yetkisini belirler.
--
-- ÇALIŞTIRMA: Supabase Dashboard → SQL Editor → adımları SIRAYLA.
-- ============================================================


-- ------------------------------------------------------------
-- 1) Demo şubeyi oluştur (aktif=false → müşteriye görünmez)
--    Tekrar çalıştırmaya karşı güvenli.
-- ------------------------------------------------------------
insert into public.branches (ad, adres, aktif)
select 'OTONBU Demo Şube (mağaza incelemesi)', 'Sakarya', false
where not exists (
  select 1 from public.branches
  where ad = 'OTONBU Demo Şube (mağaza incelemesi)'
);


-- ------------------------------------------------------------
-- 2) Mevcut durumu gör (değiştirmeden önce)
--    Beklenen: rol='musteri', branch_id=null
-- ------------------------------------------------------------
select u.id,
       a.email,
       a.email_confirmed_at,
       u.rol       as mevcut_rol,
       u.branch_id as mevcut_sube
from public.users u
join auth.users a on a.id = u.id
where a.email = 'otonbugarage+demo@gmail.com';


-- ------------------------------------------------------------
-- 3) Yönetici yap + demo şubeye bağla
-- ------------------------------------------------------------
update public.users u
set rol       = 'yonetici',
    branch_id = (select id from public.branches
                 where ad = 'OTONBU Demo Şube (mağaza incelemesi)')
from auth.users a
where a.id = u.id
  and a.email = 'otonbugarage+demo@gmail.com';


-- ------------------------------------------------------------
-- 4) DOĞRULA — beklenen: rol='yonetici', sube_aktif=false
-- ------------------------------------------------------------
select a.email,
       u.rol,
       b.ad    as sube,
       b.aktif as sube_aktif
from public.users u
join auth.users a on a.id = u.id
left join public.branches b on b.id = u.branch_id
where a.email = 'otonbugarage+demo@gmail.com';


-- ------------------------------------------------------------
-- 5) GÜVENLİK KONTROLÜ — demo şube gerçekten boş mu?
--    Hepsi 0 dönmeli. 0 değilse hakem gerçek veri görebilir, DUR ve incele.
-- ------------------------------------------------------------
with s as (
  select id from public.branches
  where ad = 'OTONBU Demo Şube (mağaza incelemesi)'
)
select
  (select count(*) from public.appointments where branch_id = (select id from s)) as randevu,
  (select count(*) from public.users        where branch_id = (select id from s)) as kullanici;
-- Not: 'kullanici' 1 olmalı (demo hesabın kendisi) — diğerleri 0.


-- ============================================================
-- GERİ ALMA (yayından sonra demo yöneticiliğini kaldırmak istersen —
-- hesap müşteri olarak kalır, hakem erişimi kapanır)
-- ============================================================
-- update public.users u
-- set rol = 'musteri', branch_id = null
-- from auth.users a
-- where a.id = u.id and a.email = 'otonbugarage+demo@gmail.com';
