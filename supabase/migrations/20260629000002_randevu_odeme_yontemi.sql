-- ============================================================
-- Randevuda ödeme yöntemi: "şubede öde" (varsayılan) / "online"
--
-- KARAR: Randevu alınırken müşteri ödeme yöntemini seçebilsin. Şimdilik tek
--   geçerli yol "şubede öde" (nakit/kart, teslimde) — varsayılan budur. "online"
--   değeri ileride iyzico entegrasyonu açılınca devreye girer (TASLAK modu kapanınca).
--   Online seçildiğinde tutar randevu-al akışında değil, abonelik/ödeme akışında
--   tahsil edilir; o aşamada randevu_olustur'a p_odeme_yontemi parametresi eklenip
--   değer buraya yazılır. Şu an istemci yalnız 'subede' seçebildiği için default yeterli.
-- ============================================================

alter table public.appointments
  add column if not exists odeme_yontemi text not null default 'subede'
    check (odeme_yontemi in ('subede', 'online'));

comment on column public.appointments.odeme_yontemi is
  'Randevu ödeme yöntemi: subede (nakit/kart, teslimde — varsayılan) | online (iyzico, ileride).';
