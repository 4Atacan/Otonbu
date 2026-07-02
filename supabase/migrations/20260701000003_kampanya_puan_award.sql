-- ============================================================
-- Kampanya bonus puanı — award'a dahil et
--
-- SORUN: puan_ver_job() iş 'hazir/tamamlandi'ya geçince yalnızca services.puan
--   yazıyordu. Aktif bir 'puan' kampanyası (campaigns.tip='puan', bonus_puan)
--   o hizmete bağlıysa (hizmet_id) müşteri ekranda "toplam" puanı görüyor ama
--   fiilen kazanmıyordu. Bu migration award'ı hizmet puanı + kampanya bonusu
--   olacak şekilde düzeltir (gösterim ile gerçek kazanç artık aynı).
--
-- Bonus seçimi: tamamlanma anında geçerli (tarih aralığı), hizmete bağlı, ilgili
--   ŞUBEDE geçerli (branch_id null = tüm şubeler veya randevunun şubesi) aktif
--   'puan' kampanyaları arasından EN YÜKSEK bonus_puan. (İstemci gösterimi
--   kampanyaPuanHaritasi ile aynı mantık; kural 2: puan sunucuda hesaplanır.)
-- Idempotency korunur: ref = 'job:<id>', on conflict do nothing.
-- ============================================================

create or replace function public.puan_ver_job()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid; v_puan int; v_ad text; v_service uuid; v_branch uuid; v_bonus int;
begin
  if new.durum in ('hazir','tamamlandi')
     and old.durum is distinct from new.durum
     and old.durum not in ('hazir','tamamlandi') then
    select a.user_id, s.puan, s.ad, a.service_id, a.branch_id
      into v_uid, v_puan, v_ad, v_service, v_branch
    from public.appointments a
    join public.services s on s.id = a.service_id
    where a.id = new.appointment_id;

    -- Hizmete bağlı, şubede geçerli, tarihçe geçerli aktif 'puan' kampanyasının
    -- en yüksek bonusu (yoksa 0).
    select coalesce(max(c.bonus_puan), 0) into v_bonus
    from public.campaigns c
    where c.tip = 'puan'
      and c.aktif = true
      and c.hizmet_id = v_service
      and (c.branch_id is null or c.branch_id = v_branch)
      and (c.baslangic is null or c.baslangic <= current_date)
      and (c.bitis is null or c.bitis >= current_date);

    if v_uid is not null and (coalesce(v_puan, 0) + coalesce(v_bonus, 0)) > 0 then
      insert into public.loyalty_ledger (user_id, puan_degisim, sebep, ref)
      values (
        v_uid,
        coalesce(v_puan, 0) + coalesce(v_bonus, 0),
        'Hizmet: ' || coalesce(v_ad, 'Hizmet')
          || case when coalesce(v_bonus, 0) > 0 then ' (+' || v_bonus || ' kampanya)' else '' end,
        'job:' || new.id
      )
      on conflict (ref) do nothing;
    end if;
  end if;
  return new;
end;
$$;
