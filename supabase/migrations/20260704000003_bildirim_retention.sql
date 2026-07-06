-- ============================================================
-- notifications retention — DB'yi Free tier 500MB sınırından uzak tutar.
--
-- notifications her randevu/sipariş/teklif durumunda satır üretir; en hızlı
-- şişen tablo budur. Kullanıcı için değeri kısa ömürlüdür (okununca biter).
-- Bu yüzden eski bildirimleri düzenli sil:
--   * okunmuş bildirimler   → 30 günden eskiyse
--   * tüm bildirimler        → 90 günden eskiyse (okunmasa da)
-- Ödeme/abonelik/loyalty gibi KALICI kayıtlara DOKUNMAZ (yalnız notifications).
-- ============================================================

create or replace function public.bildirim_temizle()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.notifications
  where (okundu_mu and created_at < now() - interval '30 days')
     or (created_at < now() - interval '90 days');
$$;

revoke all on function public.bildirim_temizle() from public;

-- pg_cron görevi — her gün 03:20 UTC. Yalnız pg_cron ön-yüklüyse (cloud) kurulur;
-- yerel/CI ortamında sessizce atlanır (donem-yenile ile aynı desen).
do $$
begin
  if coalesce(current_setting('shared_preload_libraries', true), '') like '%pg_cron%' then
    execute 'create extension if not exists pg_cron';
    execute format(
      'select cron.schedule(%L, %L, %L)',
      'bildirim-temizle', '20 3 * * *', 'select public.bildirim_temizle()'
    );
    raise notice 'bildirim-temizle cron gorevi kuruldu (her gun 03:20 UTC)';
  else
    raise notice 'pg_cron on-yuklu degil; bildirim-temizle zamanlanmadi (yerel ortam).';
  end if;
end $$;
