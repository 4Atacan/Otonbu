/**
 * Faz 1 RLS Hızlı Kontrol Scripti
 *
 * Asıl RLS testleri için: supabase/tests/rls_faz1.test.sql (pgTAP)
 * Bu script yalnızca temel erişim doğrulaması yapar.
 *
 * Çalıştırma:
 *   1. .env.test dosyasına SUPABASE_SERVICE_ROLE_TEST ekle
 *   2. npx ts-node -e "require('dotenv').config({path:'.env.test'})" scripts/test-rls.ts
 */
import { createClient } from '@supabase/supabase-js';

const URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_TEST;

if (!URL || !ANON || !SERVICE) {
  console.error('Eksik env: EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_TEST');
  process.exit(1);
}

const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });

let gecti = 0, kaldi = 0;

function assert(durum: boolean, mesaj: string) {
  if (durum) { console.log(`  ✓ ${mesaj}`); gecti++; }
  else { console.error(`  ✗ ${mesaj}`); kaldi++; }
}

async function temizle(emailler: string[]) {
  for (const email of emailler) {
    const { data: u } = await admin.from('users').select('id').eq('email', email).single();
    if (u) {
      await admin.from('vehicles').delete().eq('user_id', u.id);
      await admin.from('users').delete().eq('id', u.id);
      await (admin.auth.admin as any).deleteUser(u.id);
    }
  }
}

async function run() {
  console.log('\n=== OTONBU RLS HIZLI KONTROL ===\n');

  const emailler = ['rls-test-a@otonbu.local', 'rls-test-b@otonbu.local'];
  await temizle(emailler);

  // Şubeler
  const { data: subeA } = await admin.from('branches').insert({ ad: 'Test Şube A' }).select().single();
  const { data: subeB } = await admin.from('branches').insert({ ad: 'Test Şube B' }).select().single();

  // Kullanıcılar (service_role ile)
  const { data: authA } = await (admin.auth.admin as any).createUser({
    email: emailler[0], email_confirm: true,
  });
  const { data: authB } = await (admin.auth.admin as any).createUser({
    email: emailler[1], email_confirm: true,
  });

  await admin.from('users').upsert([
    { id: authA.user.id, email: emailler[0], rol: 'musteri', branch_id: subeA!.id },
    { id: authB.user.id, email: emailler[1], rol: 'musteri', branch_id: subeB!.id },
  ]);

  await admin.from('vehicles').insert([
    { user_id: authA.user.id, plaka: 'TEST01', segment: 'standart' },
    { user_id: authB.user.id, plaka: 'TEST02', segment: 'standart' },
  ]);

  // Service_role tüm verileri görür
  console.log('Kontrol 1: Service_role tüm araçları görür');
  const { data: tumAraclar } = await admin.from('vehicles').select('*');
  assert((tumAraclar?.length ?? 0) >= 2, 'Service_role 2+ araç görür');

  // Anon kullanıcı branches ve services görür, vehicles göremez
  console.log('\nKontrol 2: Anon kullanıcı araçları göremez');
  const anon = createClient(URL, ANON);
  const { data: anonAraclar } = await anon.from('vehicles').select('*');
  assert(!anonAraclar || anonAraclar.length === 0, 'Anon araçları göremez');

  const { data: anonSubeler } = await anon.from('branches').select('*');
  assert((anonSubeler?.length ?? 0) >= 2, 'Anon şubeleri görür (public)');

  // Temizlik
  await temizle(emailler);
  await admin.from('branches').delete().in('id', [subeA!.id, subeB!.id]);

  console.log(`\n${'─'.repeat(40)}`);
  console.log(`✓ ${gecti} geçti | ✗ ${kaldi} kaldı`);
  console.log('\nTam RLS testi için: supabase test db (pgTAP)\n');
  if (kaldi > 0) process.exit(1);
}

run().catch(e => { console.error(e); process.exit(1); });
