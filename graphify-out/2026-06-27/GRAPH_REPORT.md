# Graph Report - .  (2026-06-26)

## Corpus Check
- 107 files · ~99,999 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 444 nodes · 648 edges · 29 communities (25 shown, 4 thin omitted)
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
- [[_COMMUNITY_Auth Layout|Auth Layout]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 34 edges
2. `useSession()` - 19 edges
3. `supabase` - 18 edges
4. `expo` - 12 edges
5. `OTONBU GARAGE — Proje Talimatları` - 10 edges
6. `scripts` - 9 edges
7. `Yukleniyor()` - 9 edges
8. `OTONBU GARAGE — Uygulama Planı` - 9 edges
9. `Faz 2 — Randevu akışı (yayınlanabilir MVP)` - 9 edges
10. `Faz 3 — Abonelik + ödeme` - 9 edges

## Surprising Connections (you probably didn't know these)
- `MainLayout()` --calls--> `useTheme()`  [EXTRACTED]
  app/(main)/_layout.tsx → src/theme/ThemeContext.tsx
- `HizmetlerScreen()` --calls--> `useSession()`  [EXTRACTED]
  app/(yonetim)/hizmetler.tsx → src/hooks/useSession.ts
- `HizmetlerScreen()` --calls--> `useTheme()`  [EXTRACTED]
  app/(yonetim)/hizmetler.tsx → src/theme/ThemeContext.tsx
- `SubelerScreen()` --calls--> `useTheme()`  [EXTRACTED]
  app/(yonetim)/subeler.tsx → src/theme/ThemeContext.tsx
- `HizmetDetayScreen()` --calls--> `useTheme()`  [EXTRACTED]
  app/hizmet-detay.tsx → src/theme/ThemeContext.tsx

## Import Cycles
- None detected.

## Communities (29 total, 4 thin omitted)

### Community 0 - "Tema, Oturum & Randevu Ekranlari"
Cohesion: 0.06
Nodes (49): AbonelikScreen(), KADEME_ETIKET, s, gunListesi(), IS_ETIKET, IslerListesi(), s, SONRAKI (+41 more)

### Community 1 - "Paket Bagimliliklari (npm)"
Cohesion: 0.05
Nodes (42): Abonelik mantığı (Edge Functions), Auth görevleri (e-posta + şifre — e-posta doğrulamalı), Auth görevleri (SMS suistimaline karşı), Faz 0 — Proje kurulumu, Faz 1 — Temel iskelet, Faz 2 — Randevu akışı (yayınlanabilir MVP), Faz 3 — Abonelik + ödeme, Faz 4 — Zenginleştirme + KVKK tamamlama (+34 more)

### Community 2 - "Uygulama Plani (Fazlar)"
Cohesion: 0.10
Nodes (26): HizmetDetayScreen(), s, Bilgi(), BilgiProps, Etiket(), EtiketProps, s, GUNLER (+18 more)

### Community 3 - "Supabase Istemci & Ana Ekranlar"
Cohesion: 0.11
Nodes (19): s, s, s, s, CaptchaWidget(), HTML(), Props, s (+11 more)

### Community 4 - "Kimlik Dogrulama Ekranlari"
Cohesion: 0.11
Nodes (18): cors, Girdi, cors, Girdi, authHeader(), checkoutBaslat(), CheckoutBaslatGirdi, CheckoutBaslatSonuc (+10 more)

### Community 5 - "Tipler & Randevu/Paket Akisi"
Cohesion: 0.08
Nodes (26): dependencies, expo, expo-asset, expo-constants, expo-font, expo-image-picker, expo-linking, @expo/metro-runtime (+18 more)

### Community 6 - "Edge Functions (iyzico/odeme)"
Cohesion: 0.08
Nodes (25): AbonelikDurum, Appointment, AppointmentChange, BranchPrice, CalismaPenceresi, Campaign, DegisiklikDurum, DegisiklikTip (+17 more)

### Community 7 - "Hizmet Yonetimi & Calisma Duzeni"
Cohesion: 0.09
Nodes (21): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, predictiveBackGestureEnabled, expo, android (+13 more)

### Community 8 - "Expo Yapilandirmasi (app.json)"
Cohesion: 0.10
Nodes (20): devDependencies, @expo/ngrok, sharp, ts-node, @types/node, @types/react, typescript, main (+12 more)

### Community 9 - "Arac Katalogu & Secim"
Cohesion: 0.14
Nodes (11): AutocompleteInput(), Props, s, ARAC_CINSLERI, AracCinsi, BUYUK_CINSLER, filtrele(), MARKA_ADLARI (+3 more)

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
Cohesion: 0.36
Nodes (7): s, UrunlerScreen(), tl(), urunGorselUrl(), MagazaScreen(), s, Product

### Community 14 - "RLS Test Script"
Cohesion: 0.29
Nodes (5): DURUM_ETIKET, s, SONRAKI, Order, SiparisDurum

### Community 15 - "TypeScript Yapilandirmasi"
Cohesion: 0.29
Nodes (5): DURUM_ETIKET, s, SONRAKI, InsuranceRequest, SigortaDurum

### Community 16 - "Claude Code Ayarlari"
Cohesion: 0.29
Nodes (5): s, TIPLER, Branch, SigortaTip, Vehicle

### Community 17 - "Auth Layout"
Cohesion: 0.29
Nodes (3): IS_ETIKET, RANDEVU_ETIKET, s

### Community 18 - "Community 18"
Cohesion: 0.33
Nodes (6): ASSETS, kareSvg(), MARK, png(), ROOT, svg

### Community 19 - "Community 19"
Cohesion: 0.40
Nodes (5): gunler(), RandevuAlScreen(), s, FiyatSonuc, MusaitSlot

### Community 20 - "Community 20"
Cohesion: 0.60
Nodes (4): admin, assert(), run(), temizle()

### Community 21 - "Community 21"
Cohesion: 0.40
Nodes (4): compilerOptions, strict, exclude, extends

## Knowledge Gaps
- **241 isolated node(s):** `PreToolUse`, `name`, `slug`, `version`, `orientation` (+236 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useTheme()` connect `Tema, Oturum & Randevu Ekranlari` to `Arac Katalogu & Secim`, `Uygulama Plani (Fazlar)`, `Supabase Istemci & Ana Ekranlar`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Why does `supabase` connect `Tema, Oturum & Randevu Ekranlari` to `Uygulama Plani (Fazlar)`, `Supabase Istemci & Ana Ekranlar`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Tipler & Randevu/Paket Akisi` to `Expo Yapilandirmasi (app.json)`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **What connects `PreToolUse`, `name`, `slug` to the rest of the system?**
  _241 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Tema, Oturum & Randevu Ekranlari` be split into smaller, more focused modules?**
  _Cohesion score 0.056842105263157895 - nodes in this community are weakly interconnected._
- **Should `Paket Bagimliliklari (npm)` be split into smaller, more focused modules?**
  _Cohesion score 0.046511627906976744 - nodes in this community are weakly interconnected._
- **Should `Uygulama Plani (Fazlar)` be split into smaller, more focused modules?**
  _Cohesion score 0.09915966386554621 - nodes in this community are weakly interconnected._