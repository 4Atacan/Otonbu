# Graph Report - Otonbu  (2026-07-16)

## Corpus Check
- 157 files · ~311,234 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 708 nodes · 1428 edges · 100 communities (35 shown, 65 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d67b991e`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Community 0
- Paket Bagimliliklari (npm)
- Supabase Istemci & Ana Ekranlar
- Kimlik Dogrulama Ekranlari
- Tipler & Randevu/Paket Akisi
- Community 6
- Hizmet Yonetimi & Calisma Duzeni
- Expo Yapilandirmasi (app.json)
- Community 9
- Proje Talimatlari (CLAUDE.md)
- Urun Ozellikleri Dokumani
- Obsidian Export Script
- Community 13
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24
- secret-check.mjs
- Community 28
- expo
- expo-asset
- Community 31
- Community 32
- Community 33
- Community 34
- expo-image-manipulator
- expo-image-picker
- @expo/metro-runtime
- expo-notifications
- expo-router
- expo-secure-store
- expo-sharing
- expo-splash-screen
- expo-status-bar
- expo-updates
- react
- react-dom
- react-native
- react-native-gesture-handler
- react-native-reanimated
- react-native-safe-area-context
- react-native-screens
- react-native-web
- react-native-webview
- @sentry/react-native
- @supabase/supabase-js
- backgroundImage
- KATEGORI_AD
- MARKA
- PROMO
- graphify
- hooks
- PreToolUse
- buildType
- build
- development
- preview
- production
- cli
- appVersionSource
- version
- developmentClient
- distribution
- SENTRY_DISABLE_AUTO_UPLOAD
- android
- env
- environment
- autoIncrement
- submit
- Auth görevleri (SMS suistimaline karşı)
- Kabul kriteri
- Kabul kriteri
- Kabul kriteri
- Kabul kriteri
- RLS politikaları
- RLS politikaları
- RLS politikaları
- Tablolar
- Tablolar
- Tablolar
- s
- OGLEDEN_SONRA
- SABAH
- PuanKullanim

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 82 edges
2. `useSession()` - 51 edges
3. `supabase` - 41 edges
4. `uyari()` - 28 edges
5. `Yukleniyor()` - 23 edges
6. `tl()` - 17 edges
7. `expo` - 16 edges
8. `UyariKatmani()` - 15 edges
9. `yukle()` - 15 edges
10. `urunGorselUrl()` - 14 edges

## Surprising Connections (you probably didn't know these)
- `KampanyalarSekmesi()` --calls--> `useTheme()`  [EXTRACTED]
  app/(main)/kampanyalar.tsx → src/theme/ThemeContext.tsx
- `SubelerScreen()` --calls--> `useTheme()`  [EXTRACTED]
  app/(yonetim)/subeler.tsx → src/theme/ThemeContext.tsx
- `KvkkScreen()` --calls--> `useTheme()`  [EXTRACTED]
  app/kvkk.tsx → src/theme/ThemeContext.tsx
- `MainLayout()` --calls--> `useTheme()`  [EXTRACTED]
  app/(main)/_layout.tsx → src/theme/ThemeContext.tsx
- `HizmetlerSekmesi()` --calls--> `useTheme()`  [EXTRACTED]
  app/(main)/hizmetler.tsx → src/theme/ThemeContext.tsx

## Import Cycles
- None detected.

## Communities (100 total, 65 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.10
Nodes (20): DURUM_ETIKET, s, SONRAKI, AbonelikDurum, AppNotification, AppointmentChange, DegisiklikDurum, DegisiklikTip (+12 more)

### Community 1 - "Paket Bagimliliklari (npm)"
Cohesion: 0.06
Nodes (31): Abonelik mantığı (Edge Functions), Auth görevleri (e-posta + şifre — e-posta doğrulamalı), Faz 0 — Proje kurulumu, Faz 1 — Temel iskelet, Faz 2 — Randevu akışı (yayınlanabilir MVP), Faz 3 — Abonelik + ödeme, Faz 4 — Zenginleştirme + KVKK tamamlama, Fiyat hesabı (Edge Function — `fiyat-hesapla`) (+23 more)

### Community 3 - "Supabase Istemci & Ana Ekranlar"
Cohesion: 0.08
Nodes (24): s, s, s, s, s, BOLUMLER, KvkkScreen(), s (+16 more)

### Community 4 - "Kimlik Dogrulama Ekranlari"
Cohesion: 0.06
Nodes (27): cors, Girdi, cors, Girdi, cors, cors, IndirGovde, PrivateBucket (+19 more)

### Community 5 - "Tipler & Randevu/Paket Akisi"
Cohesion: 0.22
Nodes (9): expo-device, expo-linking, expo-modules-core, @opentelemetry/api, dependencies, expo-device, expo-linking, expo-modules-core (+1 more)

### Community 6 - "Community 6"
Cohesion: 0.07
Nodes (26): @expo/ngrok, devDependencies, @expo/ngrok, sharp, ts-node, @types/node, @types/react, typescript (+18 more)

### Community 7 - "Hizmet Yonetimi & Calisma Duzeni"
Cohesion: 0.05
Nodes (36): backgroundColor, foregroundImage, monochromeImage, adaptiveIcon, blockedPermissions, googleServicesFile, package, permissions (+28 more)

### Community 8 - "Expo Yapilandirmasi (app.json)"
Cohesion: 0.10
Nodes (29): MagazaScreen(), s, s, UrunDetayScreen(), admin, assert(), run(), temizle() (+21 more)

### Community 9 - "Community 9"
Cohesion: 0.11
Nodes (25): AnaSayfa(), buDonem(), s, selamlama(), SIGORTA_BANNER, WORDMARK, KampanyalarSekmesi(), s (+17 more)

### Community 10 - "Proje Talimatlari (CLAUDE.md)"
Cohesion: 0.15
Nodes (12): Bağlam dosyaları, graphify (token tasarrufu — scope-first zorunlu), Güncel tutma, Kod ve çalışma konvansiyonları, Komut rehberi, KVKK kararları (şemaya gömülü, baştan uygulanır), Mutlak kurallar (asla ihlal etme), OTONBU GARAGE — Proje Talimatları (+4 more)

### Community 11 - "Urun Ozellikleri Dokumani"
Cohesion: 0.14
Nodes (13): 1. Genel Bakış, 2.1 Özellikler, 2.2 Abonelik Paketleri, 2.3 Kurallar, 2.4 Müşteri Akış Diyagramı, 2. Müşteri Tarafı, 3.1 Franchise Yapısı ve Roller, 3.2 Panel Bölümleri (+5 more)

### Community 12 - "Obsidian Export Script"
Cohesion: 0.17
Nodes (9): byId, fileEdges, files, g, GRAPH, idx, OUT, outgoing (+1 more)

### Community 13 - "Community 13"
Cohesion: 0.09
Nodes (35): HizmetDetayScreen(), s, tl(), HizmetlerSekmesi(), katAd(), KATEGORI_AD, s, fiyatBandi() (+27 more)

### Community 14 - "Community 14"
Cohesion: 0.16
Nodes (15): PersonelSatir, s, SubelerScreen(), s, UyariKatmani(), UyariProvider(), dinleyiciler, uyari() (+7 more)

### Community 15 - "Community 15"
Cohesion: 0.13
Nodes (15): dakikaKala(), IS_ETIKET, RANDEVU_ETIKET, RandevularimScreen(), s, gunOnce(), IS_ETIKET, Props (+7 more)

### Community 16 - "Community 16"
Cohesion: 0.15
Nodes (13): DURUM_ETIKET, s, SONRAKI, DURUM_ETIKET, s, SONRAKI, MARK, Props (+5 more)

### Community 17 - "Community 17"
Cohesion: 0.05
Nodes (62): AbonelikScreen(), BildirimlerScreen(), s, HizmetTeklifleriScreen(), RootLayout(), MainLayout(), ProfilScreen(), ROL_ADLARI (+54 more)

### Community 18 - "Community 18"
Cohesion: 0.33
Nodes (6): ASSETS, kareSvg(), MARK, png(), ROOT, svg

### Community 19 - "Community 19"
Cohesion: 0.19
Nodes (16): AraclarScreen(), s, AutocompleteInput(), Props, s, ARAC_CINSLERI, AracCinsi, aracSegment() (+8 more)

### Community 20 - "Community 20"
Cohesion: 0.29
Nodes (7): gunler(), RandevuAlScreen(), s, FiyatSonuc, MusaitSlot, OdemeYontemi, Vehicle

### Community 21 - "Community 21"
Cohesion: 0.25
Nodes (7): expo/tsconfig.base, node_modules, supabase/functions, compilerOptions, strict, exclude, extends

### Community 23 - "Community 23"
Cohesion: 0.25
Nodes (6): KADEME_ETIKET, s, aboneOl(), AboneOlSonuc, Entitlement, Subscription

### Community 24 - "Community 24"
Cohesion: 0.13
Nodes (14): 1. Google Play — Ana mağaza kaydı, 2. App Store (iOS — ileride, Apple Developer alınınca), 3. Notlar, Ad (Name) — max 30, Alt başlık (Subtitle) — max 30, Anahtar kelimeler (Keywords) — max 100 karakter, virgülle, Açıklama (Description), Grafik varlıklar (Play zorunlu) (+6 more)

### Community 28 - "Community 28"
Cohesion: 0.15
Nodes (12): 1. Demo hesabı (önce sen oluştur), 2. App Store Connect, 3. Google Play Console, 4. Data Safety (Google) / Privacy Nutrition Labels (Apple) — toplanan veri, 5.1 Content rating (IARC anketi), 5.2 Target audience & content, 5.3 Ads, 5.4 Data deletion (App content → Data safety içinde sorulur) (+4 more)

### Community 31 - "Community 31"
Cohesion: 0.36
Nodes (8): dakikaKala(), DURUM_ETIKET, gunBasligi(), gunKey(), gunler(), RandevularScreen(), s, YONETICI_ROLLER

### Community 33 - "Community 33"
Cohesion: 0.32
Nodes (7): bosForm(), KADEMELER, PaketlerScreen(), s, Plan, PlanHak, PlanKademe

## Knowledge Gaps
- **331 isolated node(s):** `name`, `slug`, `version`, `orientation`, `icon` (+326 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **65 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useTheme()` connect `Community 17` to `Community 0`, `Community 33`, `Supabase Istemci & Ana Ekranlar`, `Expo Yapilandirmasi (app.json)`, `Community 9`, `Community 13`, `Community 14`, `Community 15`, `Community 16`, `Community 19`, `Community 20`, `Community 23`, `Community 31`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Why does `supabase` connect `Community 17` to `Community 0`, `Community 33`, `Supabase Istemci & Ana Ekranlar`, `Expo Yapilandirmasi (app.json)`, `Community 9`, `Community 13`, `Community 14`, `Community 15`, `Community 16`, `Community 19`, `Community 20`, `Community 23`, `Community 31`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Why does `useSession()` connect `Community 17` to `Community 0`, `Community 33`, `Expo Yapilandirmasi (app.json)`, `Community 9`, `Community 13`, `Community 15`, `Community 16`, `Community 20`, `Community 23`, `Community 31`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **What connects `name`, `slug`, `version` to the rest of the system?**
  _331 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.09956709956709957 - nodes in this community are weakly interconnected._
- **Should `Paket Bagimliliklari (npm)` be split into smaller, more focused modules?**
  _Cohesion score 0.0625 - nodes in this community are weakly interconnected._
- **Should `Supabase Istemci & Ana Ekranlar` be split into smaller, more focused modules?**
  _Cohesion score 0.08205128205128205 - nodes in this community are weakly interconnected._