# Graph Report - .  (2026-06-23)

## Corpus Check
- 0 files · ~99,999 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 413 nodes · 703 edges · 18 communities (17 shown, 1 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Tema, Oturum & Randevu Ekranlari|Tema, Oturum & Randevu Ekranlari]]
- [[_COMMUNITY_Paket Bagimliliklari (npm)|Paket Bagimliliklari (npm)]]
- [[_COMMUNITY_Uygulama Plani (Fazlar)|Uygulama Plani (Fazlar)]]
- [[_COMMUNITY_Supabase Istemci & Ana Ekranlar|Supabase Istemci & Ana Ekranlar]]
- [[_COMMUNITY_Kimlik Dogrulama Ekranlari|Kimlik Dogrulama Ekranlari]]
- [[_COMMUNITY_Tipler & RandevuPaket Akisi|Tipler & Randevu/Paket Akisi]]
- [[_COMMUNITY_Edge Functions (iyzicoodeme)|Edge Functions (iyzico/odeme)]]
- [[_COMMUNITY_Hizmet Yonetimi & Calisma Duzeni|Hizmet Yonetimi & Calisma Duzeni]]
- [[_COMMUNITY_Expo Yapilandirmasi (app.json)|Expo Yapilandirmasi (app.json)]]
- [[_COMMUNITY_Arac Katalogu & Secim|Arac Katalogu & Secim]]
- [[_COMMUNITY_Proje Talimatlari (CLAUDE.md)|Proje Talimatlari (CLAUDE.md)]]
- [[_COMMUNITY_Urun Ozellikleri Dokumani|Urun Ozellikleri Dokumani]]
- [[_COMMUNITY_Obsidian Export Script|Obsidian Export Script]]
- [[_COMMUNITY_Ikon Uretim Script|Ikon Uretim Script]]
- [[_COMMUNITY_RLS Test Script|RLS Test Script]]
- [[_COMMUNITY_TypeScript Yapilandirmasi|TypeScript Yapilandirmasi]]
- [[_COMMUNITY_Claude Code Ayarlari|Claude Code Ayarlari]]

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 42 edges
2. `useSession()` - 27 edges
3. `supabase` - 23 edges
4. `expo` - 12 edges
5. `Yukleniyor()` - 12 edges
6. `OTONBU GARAGE — Proje Talimatları` - 10 edges
7. `scripts` - 9 edges
8. `OTONBU GARAGE — Uygulama Planı` - 9 edges
9. `Faz 2 — Randevu akışı (yayınlanabilir MVP)` - 9 edges
10. `Faz 3 — Abonelik + ödeme` - 9 edges

## Surprising Connections (you probably didn't know these)
- `AraclarScreen()` --calls--> `useTheme()`  [EXTRACTED]
  app/(main)/araclar.tsx → src/theme/ThemeContext.tsx
- `SubelerScreen()` --calls--> `useTheme()`  [EXTRACTED]
  app/(yonetim)/subeler.tsx → src/theme/ThemeContext.tsx
- `MainLayout()` --calls--> `useTheme()`  [EXTRACTED]
  app/(main)/_layout.tsx → src/theme/ThemeContext.tsx
- `AnaSayfa()` --calls--> `useSession()`  [EXTRACTED]
  app/(main)/index.tsx → src/hooks/useSession.ts
- `AnaSayfa()` --calls--> `useTheme()`  [EXTRACTED]
  app/(main)/index.tsx → src/theme/ThemeContext.tsx

## Import Cycles
- None detected.

## Communities (18 total, 1 thin omitted)

### Community 0 - "Tema, Oturum & Randevu Ekranlari"
Cohesion: 0.06
Nodes (44): KADEME_ETIKET, s, PERSONEL_ROLLER, RootLayout(), gunListesi(), IS_ETIKET, IslerListesi(), s (+36 more)

### Community 1 - "Paket Bagimliliklari (npm)"
Cohesion: 0.07
Nodes (39): HizmetDetayScreen(), s, GUNLER, OGLEDEN_SONRA, saatDk(), saatGecerli(), SABAH, TUM_GUNLER (+31 more)

### Community 2 - "Uygulama Plani (Fazlar)"
Cohesion: 0.05
Nodes (42): Abonelik mantığı (Edge Functions), Auth görevleri (e-posta + şifre — e-posta doğrulamalı), Auth görevleri (SMS suistimaline karşı), Faz 0 — Proje kurulumu, Faz 1 — Temel iskelet, Faz 2 — Randevu akışı (yayınlanabilir MVP), Faz 3 — Abonelik + ödeme, Faz 4 — Zenginleştirme + KVKK tamamlama (+34 more)

### Community 3 - "Supabase Istemci & Ana Ekranlar"
Cohesion: 0.08
Nodes (29): gunler(), RandevuAlScreen(), s, AutocompleteInput(), Props, s, MARK, Props (+21 more)

### Community 4 - "Kimlik Dogrulama Ekranlari"
Cohesion: 0.10
Nodes (22): AbonelikScreen(), Bilgi(), BilgiProps, Etiket(), EtiketProps, s, UstBosluk(), MainLayout() (+14 more)

### Community 5 - "Tipler & Randevu/Paket Akisi"
Cohesion: 0.11
Nodes (19): s, s, s, s, CaptchaWidget(), HTML(), Props, s (+11 more)

### Community 6 - "Edge Functions (iyzico/odeme)"
Cohesion: 0.11
Nodes (18): cors, Girdi, cors, Girdi, authHeader(), checkoutBaslat(), CheckoutBaslatGirdi, CheckoutBaslatSonuc (+10 more)

### Community 7 - "Hizmet Yonetimi & Calisma Duzeni"
Cohesion: 0.08
Nodes (26): dependencies, expo, expo-asset, expo-constants, expo-font, expo-image-picker, expo-linking, @expo/metro-runtime (+18 more)

### Community 8 - "Expo Yapilandirmasi (app.json)"
Cohesion: 0.09
Nodes (21): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, predictiveBackGestureEnabled, expo, android (+13 more)

### Community 9 - "Arac Katalogu & Secim"
Cohesion: 0.10
Nodes (20): devDependencies, @expo/ngrok, sharp, ts-node, @types/node, @types/react, typescript, main (+12 more)

### Community 10 - "Proje Talimatlari (CLAUDE.md)"
Cohesion: 0.14
Nodes (13): Bağlam dosyaları, graphify, graphify (token tasarrufu — scope-first zorunlu), Güncel tutma, Kod ve çalışma konvansiyonları, Komut rehberi, KVKK kararları (şemaya gömülü, baştan uygulanır), Mutlak kurallar (asla ihlal etme) (+5 more)

### Community 11 - "Urun Ozellikleri Dokumani"
Cohesion: 0.14
Nodes (13): 1. Genel Bakış, 2.1 Özellikler, 2.2 Abonelik Paketleri, 2.3 Kurallar, 2.4 Müşteri Akış Diyagramı, 2. Müşteri Tarafı, 3.1 Franchise Yapısı ve Roller, 3.2 Panel Bölümleri (+5 more)

### Community 12 - "Obsidian Export Script"
Cohesion: 0.17
Nodes (9): byId, fileEdges, files, g, GRAPH, idx, OUT, outgoing (+1 more)

### Community 13 - "Ikon Uretim Script"
Cohesion: 0.33
Nodes (6): ASSETS, kareSvg(), MARK, png(), ROOT, svg

### Community 14 - "RLS Test Script"
Cohesion: 0.60
Nodes (4): admin, assert(), run(), temizle()

### Community 15 - "TypeScript Yapilandirmasi"
Cohesion: 0.40
Nodes (4): compilerOptions, strict, exclude, extends

## Knowledge Gaps
- **214 isolated node(s):** `PreToolUse`, `name`, `slug`, `version`, `orientation` (+209 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useTheme()` connect `Kimlik Dogrulama Ekranlari` to `Tema, Oturum & Randevu Ekranlari`, `Paket Bagimliliklari (npm)`, `Supabase Istemci & Ana Ekranlar`, `Tipler & Randevu/Paket Akisi`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Why does `supabase` connect `Tema, Oturum & Randevu Ekranlari` to `Paket Bagimliliklari (npm)`, `Supabase Istemci & Ana Ekranlar`, `Kimlik Dogrulama Ekranlari`, `Tipler & Randevu/Paket Akisi`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `useSession()` connect `Tema, Oturum & Randevu Ekranlari` to `Paket Bagimliliklari (npm)`, `Supabase Istemci & Ana Ekranlar`, `Kimlik Dogrulama Ekranlari`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **What connects `PreToolUse`, `name`, `slug` to the rest of the system?**
  _214 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Tema, Oturum & Randevu Ekranlari` be split into smaller, more focused modules?**
  _Cohesion score 0.05625 - nodes in this community are weakly interconnected._
- **Should `Paket Bagimliliklari (npm)` be split into smaller, more focused modules?**
  _Cohesion score 0.07265306122448979 - nodes in this community are weakly interconnected._
- **Should `Uygulama Plani (Fazlar)` be split into smaller, more focused modules?**
  _Cohesion score 0.046511627906976744 - nodes in this community are weakly interconnected._