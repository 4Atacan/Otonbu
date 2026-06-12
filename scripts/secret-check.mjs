#!/usr/bin/env node
// Repo'da gizli anahtar değer desenlerini arar.
// Sözcük geçişlerine (örn. "service_role") değil, gerçek anahtar formatlarına bakar:
// - Supabase access token:    sbp_<base62>
// - Supabase secret key:      sb_secret_<base62>
// - JWT (anon/service_role):  eyJ...eyJ...<sig>
//
// Çıkış 0: temiz | Çıkış 1: eşleşme var (gizli anahtar sızıntısı)

import { execFileSync } from 'node:child_process';

const PATTERN = [
  'sbp_[A-Za-z0-9]{20,}',
  'sb_secret_[A-Za-z0-9]{20,}',
  'eyJ[A-Za-z0-9_-]{20,}\\.eyJ[A-Za-z0-9_-]{20,}\\.[A-Za-z0-9_-]+',
].join('|');

const EXCLUDES = [
  ':!*.example',
  ':!*.md',
  ':!package-lock.json',
  ':!scripts/',
  ':!supabase/functions/',
  ':!.claude/',
  ':!docs-obsidian/',
];

let out = '';
try {
  out = execFileSync('git', ['grep', '-nE', PATTERN, '--', ...EXCLUDES], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
} catch (e) {
  // git grep çıkış 1 = eşleşme yok (temiz)
  if (e.status === 1) { console.log('OK: gizli anahtar bulunamadı'); process.exit(0); }
  console.error('git grep hatası:', e.message);
  process.exit(2);
}

if (out.trim()) {
  console.error('⚠ Gizli anahtar şüpheli eşleşme:');
  console.error(out);
  process.exit(1);
}
console.log('OK: gizli anahtar bulunamadı');
