// App icon + splash üretici. Kaynak: otonbu-garage-dark.svg içindeki
// camgöbeği "o" markası (fill #00a0e3). Yatay wordmark kare ikona sığmaz;
// bu yüzden markanın tek tanınır simgesi olan "o"yu kare zemine ortalarız.
//
// Çalıştır:  node scripts/gen-icons.mjs
import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ASSETS = join(ROOT, 'assets');

const MAVI = '#00a0e3';   // logo camgöbeği
const BEYAZ = '#ffffff';  // seçilen ikon zemini

// SVG'den ilk path'in (camgöbeği "o") d verisini çek
const svg = readFileSync(join(ROOT, 'otonbu-garage-dark.svg'), 'utf8');
const d = svg.match(/<path[^>]*fill="#00a0e3"[^>]*\sd="([^"]+)"/)?.[1]
       ?? svg.match(/<path[^>]*\sd="([^"]+)"[^>]*fill="#00a0e3"/)?.[1];
if (!d) throw new Error('Camgöbeği "o" path bulunamadı');

// "o" markasının kendi koordinat sınırları (SVG viewBox 0 0 939.496 350.796)
const MARK = { minX: 0, minY: 58.958, w: 156.864, h: 156.864 };

// Kare SVG kur: mark'ı 1000x1000 tuvale, kenar boşluğu (pad) ile ortala.
function kareSvg({ pad, bg, fill }) {
  const C = 1000;
  const content = C * (1 - 2 * pad);
  const s = content / Math.max(MARK.w, MARK.h);
  const tx = (C - content) / 2 - MARK.minX * s;
  const ty = (C - content) / 2 - MARK.minY * s;
  const arka = bg ? `<rect width="${C}" height="${C}" fill="${bg}"/>` : '';
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${C}" height="${C}" viewBox="0 0 ${C} ${C}">` +
    `${arka}<g transform="translate(${tx} ${ty}) scale(${s})">` +
    `<path fill="${fill}" fill-rule="evenodd" d="${d}"/></g></svg>`
  );
}

async function png(out, size, opts) {
  await sharp(kareSvg(opts), { density: 384 })
    .resize(size, size)
    .png()
    .toFile(join(ASSETS, out));
  console.log('✓', out, `${size}x${size}`, opts.bg ? `bg ${opts.bg}` : 'şeffaf');
}

// iOS + genel ikon: beyaz zemin, mark ~%64
await png('icon.png', 1024, { pad: 0.18, bg: BEYAZ, fill: MAVI });
// Web favicon
await png('favicon.png', 48, { pad: 0.18, bg: BEYAZ, fill: MAVI });
// Android adaptive foreground: şeffaf, güvenli alan için küçük (mark ~%40)
await png('android-icon-foreground.png', 1024, { pad: 0.30, bg: null, fill: MAVI });
// Android adaptive background: düz beyaz
await png('android-icon-background.png', 1024, { pad: 0, bg: BEYAZ, fill: BEYAZ });
// Android themed monochrome: siluet (renk sistemce değişir, alfa önemli)
await png('android-icon-monochrome.png', 1024, { pad: 0.30, bg: null, fill: '#000000' });
// Splash: şeffaf mark, beyaz splash zemininde ortalanır
await png('splash-icon.png', 1024, { pad: 0.28, bg: null, fill: MAVI });

console.log('Tüm ikonlar üretildi.');
