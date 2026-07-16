-- ============================================================================
--  ⚠️  YALNIZCA CANLI ÖNCESİ — ÜRETİMDE ÇALIŞTIRMA  ⚠️
-- ============================================================================
--  Bu script GERÇEK MÜŞTERİ VERİSİNİ değil, canlıya çıkış öncesi TEST işlem
--  verisini sıfırlamak içindir. Uygulama GERÇEK KULLANICILARA açıldıktan sonra
--  BU DOSYAYI ASLA ÇALIŞTIRMA. Çünkü:
--
--    • HARD DELETE'tir — silinen randevu/sipariş/abonelik/puan geri DÖNMEZ.
--    • KVKK'yı İHLAL EDER — gerçek kullanıcı/ödeme/abonelik kayıtlarında hard
--      delete yasaktır (soft delete + anonimleştirme şarttır).
--    • payments (ödemeler) MUHASEBE için saklanmalıdır — silmek yasal/muhasebe
--      kaydını yok eder.
--
--  Canlıdan sonra veri temizliği gerekirse: `hesap-sil` Edge Function akışını
--  kullan (anonimleştirir, ödemeyi korur, KVKK'ya uygundur).
-- ----------------------------------------------------------------------------
--  KAPSAM (yalnızca işlem/operasyonel veri):
--    KORUNUR: kullanıcılar, araçlar, şubeler, hizmetler, ürünler, paketler,
--             kampanyalar, programlar, fiyatlar, rıza kayıtları (consents).
--    SİLİNİR: randevular, işler, iş fotoğrafı kayıtları, randevu değişiklikleri,
--             siparişler + kalemleri, sigorta talepleri, teklifler, abonelikler,
--             haklar + kullanımları, ödemeler, puan hareketleri, bildirimler.
--             Ayrıca ürün "satış adedi" sayaçları sıfırlanır.
--
--  ÇALIŞTIRMA: Supabase Dashboard → SQL Editor → tamamını yapıştır → Run.
--  Tek transaction: hata olursa hiçbir şey silinmez (all-or-nothing). Idempotent:
--  tekrar çalıştırılabilir, zaten boşsa etkisizdir.
-- ============================================================================

begin;

-- TRUNCATE, satır tetikleyicilerini (puan ödülü / bildirim üretimi vb.)
-- TETİKLEMEZ; bu yüzden temiz siler. CASCADE + hepsini listeleme = FK sırası
-- derdi yok. RESTART IDENTITY: bigint sekans sayaçlarını sıfırlar.
truncate table
  public.appointment_changes,
  public.job_photos,
  public.jobs,
  public.appointments,
  public.order_items,
  public.orders,
  public.insurance_requests,
  public.service_quotes,
  public.entitlement_usage,
  public.entitlements,
  public.payments,
  public.subscriptions,
  public.loyalty_ledger,
  public.notifications
restart identity cascade;

-- Ürün "çok satan" sıralamasını besleyen otomatik satış sayacını sıfırla.
update public.products set satis_adedi = 0 where satis_adedi <> 0;

-- Doğrulama: aşağıdaki tümü 0 dönmeli (commit'ten önce gösterir).
select
  (select count(*) from public.appointments)       as randevu,
  (select count(*) from public.jobs)               as isler,
  (select count(*) from public.orders)             as siparis,
  (select count(*) from public.service_quotes)     as teklif,
  (select count(*) from public.insurance_requests) as sigorta,
  (select count(*) from public.subscriptions)      as abonelik,
  (select count(*) from public.entitlements)       as hak,
  (select count(*) from public.payments)           as odeme,
  (select count(*) from public.loyalty_ledger)     as puan_hareketi,
  (select count(*) from public.notifications)      as bildirim,
  (select coalesce(sum(satis_adedi),0) from public.products) as toplam_satis_adedi;

commit;
