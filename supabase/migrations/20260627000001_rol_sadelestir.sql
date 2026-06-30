-- ============================================================
-- Rol modelini sadeleştir: admin · yonetici · calisan · musteri
--
-- NEDEN: Şube tarafında tek "sahip" yerine ÇOKLU "yönetici" gerekiyor; ayrı
-- olarak yalnızca randevu + iş gören "çalışan" rolü ekleniyor. Eski 5'li model
-- (musteri/sube_sahibi/kasa/usta/admin) 4'e iniyor:
--   * sube_sahibi → yonetici  (şube yöneticisi; ARTIK ŞUBE BAŞINA ÇOKLU)
--   * kasa, usta  → calisan    (saha çalışanı; yalnız randevu + iş)
--
-- YETKİ HARİTASI (CLAUDE.md kural 3 — franchise izolasyonu korunur):
--   * sipariş / sigorta / ürün / fiyat / program YÖNETİMİ → yonetici (+admin)
--   * randevu + iş GÖRÜNTÜLEME / iş ÇALIŞMASI → şube personeli (branch_id
--     tabanlı politikalar; calisan dahil — değiştirmeye gerek yok)
--   * randevu YÖNETİMİ (onay/iptal/saat) → yonetici (+admin); calisan YALNIZ görür
--
-- Bu migration EN SON çalışır (timestamp): önceki migration'ların eski rol
-- string'leriyle kurduğu politikaları burada düşürüp yeni rollerle yeniden kurar.
-- branch_id tabanlı politikalara (appt_customer, jobs_branch, job_photos_access,
-- users_branch_musteri, vehicles_branch_staff, schedules_select ...) DOKUNULMAZ —
-- calisan bunlardan randevu/iş erişimini otomatik alır.
-- ============================================================

-- ------------------------------------------------------------
-- 1) Veri göçü + yeni check constraint
--    Sıra: önce eski constraint düşer, sonra veri yeni değerlere taşınır,
--    sonra yeni constraint eklenir (yeni değerler eski constraint'i ihlal eder).
-- ------------------------------------------------------------
alter table public.users drop constraint if exists users_rol_check;

update public.users set rol = 'yonetici' where rol = 'sube_sahibi';
update public.users set rol = 'calisan'  where rol in ('kasa', 'usta');

alter table public.users
  add constraint users_rol_check
  check (rol in ('musteri', 'yonetici', 'calisan', 'admin'));

-- ------------------------------------------------------------
-- 2) users (faz1): personel kendi şubesinin kullanıcılarını görür → yonetici.
--    (calisan'ın şube personel listesine ihtiyacı yok; randevudaki müşteriyi
--     zaten users_branch_musteri politikası üzerinden görür.)
-- ------------------------------------------------------------
drop policy if exists users_self on public.users;
create policy users_self on public.users
  for select using (
    id = auth.uid()
    or public.auth_role() = 'admin'
    or (public.auth_role() = 'yonetici' and branch_id = public.auth_branch())
  );

-- ------------------------------------------------------------
-- 3) time_slots / branch_prices yönetimi (faz2) → yonetici
-- ------------------------------------------------------------
drop policy if exists slots_manage on public.time_slots;
create policy slots_manage on public.time_slots
  for all using (
    public.auth_role() = 'admin'
    or (public.auth_role() = 'yonetici' and branch_id = public.auth_branch())
  );

drop policy if exists prices_manage on public.branch_prices;
create policy prices_manage on public.branch_prices
  for all using (
    public.auth_role() = 'admin'
    or (public.auth_role() = 'yonetici' and branch_id = public.auth_branch())
  );

-- ------------------------------------------------------------
-- 4) appointments yönetimi (faz2): onay/iptal/saat → yonetici (+admin).
--    Eskiden "branch_id = auth_branch()" ile TÜM şube personeli güncelleyebiliyordu;
--    artık calisan randevuyu YALNIZ görür (appt_customer select açık), yönetemez.
--    İş akışı (jobs/job_photos) ayrı tablolarda olduğu için bu daralma calisan'ın
--    iş yapmasını engellemez.
-- ------------------------------------------------------------
drop policy if exists appt_branch_manage on public.appointments;
create policy appt_branch_manage on public.appointments
  for update using (
    public.auth_role() = 'admin'
    or (public.auth_role() = 'yonetici' and branch_id = public.auth_branch())
  );

-- ------------------------------------------------------------
-- 5) service_schedules yönetimi (hizmet_programi) → yonetici
-- ------------------------------------------------------------
drop policy if exists schedules_manage on public.service_schedules;
create policy schedules_manage on public.service_schedules
  for all using (
    public.auth_role() = 'admin'
    or (public.auth_role() = 'yonetici' and branch_id = public.auth_branch())
  )
  with check (
    public.auth_role() = 'admin'
    or (public.auth_role() = 'yonetici' and branch_id = public.auth_branch())
  );

-- ------------------------------------------------------------
-- 6) Mağaza / sigorta (magaza_sigorta): calisan HARİÇ — yalnız yonetici + admin.
--    "çalışan sadece randevu + iş görür" kuralı: ürün/sipariş/sigorta görünmez.
-- ------------------------------------------------------------
drop policy if exists products_select on public.products;
create policy products_select on public.products
  for select using (
    (aktif and not silindi_mi)                                  -- müşteri vitrini
    or public.auth_role() = 'admin'
    or (public.auth_role() = 'yonetici' and branch_id = public.auth_branch())
  );

drop policy if exists products_manage on public.products;
create policy products_manage on public.products
  for all using (
    public.auth_role() = 'admin'
    or (public.auth_role() = 'yonetici' and branch_id = public.auth_branch())
  ) with check (
    public.auth_role() = 'admin'
    or (public.auth_role() = 'yonetici' and branch_id = public.auth_branch())
  );

drop policy if exists orders_select on public.orders;
create policy orders_select on public.orders
  for select using (
    user_id = auth.uid()
    or public.auth_role() = 'admin'
    or (public.auth_role() = 'yonetici' and branch_id = public.auth_branch())
  );

drop policy if exists orders_staff_update on public.orders;
create policy orders_staff_update on public.orders
  for update using (
    public.auth_role() = 'admin'
    or (public.auth_role() = 'yonetici' and branch_id = public.auth_branch())
  ) with check (
    public.auth_role() = 'admin'
    or (public.auth_role() = 'yonetici' and branch_id = public.auth_branch())
  );

drop policy if exists order_items_select on public.order_items;
create policy order_items_select on public.order_items
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_id and (
        o.user_id = auth.uid()
        or public.auth_role() = 'admin'
        or (public.auth_role() = 'yonetici' and o.branch_id = public.auth_branch())
      )
    )
  );

drop policy if exists ins_select on public.insurance_requests;
create policy ins_select on public.insurance_requests
  for select using (
    user_id = auth.uid()
    or public.auth_role() = 'admin'
    or (public.auth_role() = 'yonetici' and branch_id = public.auth_branch())
  );

drop policy if exists ins_staff_update on public.insurance_requests;
create policy ins_staff_update on public.insurance_requests
  for update using (
    public.auth_role() = 'admin'
    or (public.auth_role() = 'yonetici' and branch_id = public.auth_branch())
  ) with check (
    public.auth_role() = 'admin'
    or (public.auth_role() = 'yonetici' and branch_id = public.auth_branch())
  );

-- ------------------------------------------------------------
-- 7) product-images storage (magaza_sigorta): yazma → admin + yonetici
-- ------------------------------------------------------------
drop policy if exists product_images_insert on storage.objects;
create policy product_images_insert on storage.objects
  for insert with check (
    bucket_id = 'product-images' and public.auth_role() in ('admin', 'yonetici')
  );

drop policy if exists product_images_update on storage.objects;
create policy product_images_update on storage.objects
  for update using (
    bucket_id = 'product-images' and public.auth_role() in ('admin', 'yonetici')
  );

drop policy if exists product_images_delete on storage.objects;
create policy product_images_delete on storage.objects
  for delete using (
    bucket_id = 'product-images' and public.auth_role() in ('admin', 'yonetici')
  );
