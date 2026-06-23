-- ============================================================
-- FAZ 3 — Abonelik iptali (müşteri kendi aboneliğini iptal eder)
--
-- subscriptions istemciye SALT-OKUNUR (CLAUDE.md). İptal yazımı bu SECURITY
-- DEFINER fonksiyonla yapılır; fonksiyon yalnızca çağıranın KENDİ aboneliğini
-- iptal edebilmesini doğrular. KVKK: hard delete YOK — durum='iptal' (soft).
-- Kalan haklar durur ama aktif abonelik olmadığı için hak_ile_randevu çalışmaz.
-- ============================================================
create or replace function public.abonelik_iptal(p_subscription_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Oturum gerekli'; end if;

  update public.subscriptions
  set durum = 'iptal'
  where id = p_subscription_id
    and user_id = v_uid
    and durum <> 'iptal';

  if not found then
    raise exception 'Abonelik bulunamadı veya size ait değil';
  end if;
end;
$$;

grant execute on function public.abonelik_iptal(uuid) to authenticated;
