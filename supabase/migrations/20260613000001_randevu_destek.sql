-- ============================================================
-- Faz 2 — müşteri randevu akışı destek objeleri
-- 1) Müşteri kendi randevusuna ait işin durumunu/fotoğrafını görebilsin
-- 2) Müşteri, başkalarının randevularını GÖRMEDEN slot doluluğunu öğrenebilsin
-- ============================================================

-- ------------------------------------------------------------
-- 1) jobs: müşteri kendi randevusunun iş satırını okuyabilir.
-- jobs_branch politikası yalnızca admin/atanan usta/şube personelini
-- kapsıyordu; müşteri "işiniz hazır" durumunu ve foto erişimini bu satır
-- üzerinden alır. (Aynı komut için politikalar OR'lanır; sadece SELECT açar.)
-- ------------------------------------------------------------
create policy jobs_musteri_select on public.jobs
  for select using (
    exists (
      select 1 from public.appointments a
      where a.id = jobs.appointment_id and a.user_id = auth.uid()
    )
  );

-- ------------------------------------------------------------
-- 1b) Müşteri kendi randevusunu iptal edebilir. Mevcut appt_branch_manage
-- yalnızca admin/şube personelini kapsıyordu; müşterinin update hakkı yoktu.
-- with check ile müşteri durumu YALNIZCA 'iptal'e çekebilir — onaylıya geri
-- döndüremez. (using = hangi satırı, with check = sonuç durumu.)
-- ------------------------------------------------------------
create policy appt_musteri_iptal on public.appointments
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid() and durum = 'iptal');

-- ------------------------------------------------------------
-- 2) musait_slotlar — bir şube + zaman aralığındaki slotları, her slottaki
-- iptal-dışı randevu sayısıyla döndürür. SECURITY DEFINER: doluluk sayımı
-- için tüm randevuları görmesi gerekir, ama yalnızca AGREGAT sayı döner;
-- kişisel veri (kim aldı) sızmaz. Böylece müşteri appointments RLS'ini
-- aşmadan "bu slot dolu mu" bilgisini alır.
--
-- Zaman sınırları timestamptz olarak alınır (date değil) — istemci yerel
-- günün baş/sonunu ISO olarak yollar, böylece TR saat dilimi kayması olmaz.
-- ------------------------------------------------------------
create or replace function public.musait_slotlar(
  p_branch_id uuid,
  p_bas       timestamptz,
  p_son       timestamptz
)
returns table (
  id        uuid,
  baslangic timestamptz,
  kapasite  int,
  dolu      int
)
language sql
stable
security definer
set search_path = public
as $$
  select
    ts.id,
    ts.baslangic,
    ts.kapasite,
    coalesce(count(a.id) filter (where a.durum <> 'iptal'), 0)::int as dolu
  from public.time_slots ts
  left join public.appointments a on a.slot_id = ts.id
  where ts.branch_id = p_branch_id
    and ts.baslangic >= p_bas
    and ts.baslangic <= p_son
  group by ts.id, ts.baslangic, ts.kapasite
  order by ts.baslangic;
$$;

grant execute on function public.musait_slotlar(uuid, timestamptz, timestamptz)
  to authenticated;
