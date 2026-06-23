-- ============================================================
-- FAZ 3 — Adım 2 destek migration'ı: ödeme akışı
--
-- iyzico Edge Functions (abonelik-baslat / iyzico-webhook) için DB tarafı:
--   1) Aboneliğe 'beklemede' durumu — ödeme onaylanana kadar abonelik PASİF
--      kalır. CheckoutForm başlatılınca 'beklemede' satır açılır; yalnızca
--      webhook (sunucu-sunucu doğrulanmış) tahsilatı onaylayınca 'aktif' olur.
--      Böylece ödenmemiş abonelik hiçbir zaman hak üretmez.
--   2) payments.saglayici_ref için partial unique index — aynı iyzico
--      ödemesi için webhook iki kez gelirse ikinci kayıt (ve ikinci hak
--      üretimi) engellenir (idempotency).
-- ============================================================

-- 1) 'beklemede' durumu (ödeme bekliyor). Mevcut check'i güncelle.
alter table public.subscriptions
  drop constraint if exists subscriptions_durum_check;
alter table public.subscriptions
  add constraint subscriptions_durum_check
  check (durum in ('beklemede','aktif','yenilenen','iptal'));

-- Yeni abonelik varsayılanı 'beklemede' — önce ödeme, sonra aktivasyon.
alter table public.subscriptions
  alter column durum set default 'beklemede';

-- 2) Ödeme idempotency: aynı iyzico referansı iki kez yazılamaz.
create unique index if not exists payments_saglayici_ref_uniq
  on public.payments (saglayici_ref)
  where saglayici_ref is not null;
