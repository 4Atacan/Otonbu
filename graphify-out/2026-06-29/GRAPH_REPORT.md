# Graph Report - Otonbu  (2026-06-29)

## Corpus Check
- 110 files · ~192,882 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 479 nodes · 898 edges · 19 communities (18 shown, 1 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `198d2778`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Paket Bagimliliklari (npm)|Paket Bagimliliklari (npm)]]
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
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 25|Community 25]]

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 64 edges
2. `useSession()` - 43 edges
3. `supabase` - 32 edges
4. `Yukleniyor()` - 18 edges
5. `expo` - 12 edges
6. `OTONBU GARAGE — Proje Talimatları` - 10 edges
7. `scripts` - 9 edges
8. `OTONBU GARAGE — Uygulama Planı` - 9 edges
9. `Faz 2 — Randevu akışı (yayınlanabilir MVP)` - 9 edges
10. `Faz 3 — Abonelik + ödeme` - 9 edges

## Surprising Connections (you probably didn't know these)
- `SubelerScreen()` --calls--> `useTheme()`  [EXTRACTED]
  app/(yonetim)/subeler.tsx → src/theme/ThemeContext.tsx
- `RootLayout()` --calls--> `useSession()`  [EXTRACTED]
  app/_layout.tsx → src/hooks/useSession.ts
- `AraclarScreen()` --calls--> `useTheme()`  [EXTRACTED]
  app/araclar.tsx → src/theme/ThemeContext.tsx
- `MainLayout()` --calls--> `useTheme()`  [EXTRACTED]
  app/(main)/_layout.tsx → src/theme/ThemeContext.tsx
- `AnaSayfa()` --calls--> `useSession()`  [EXTRACTED]
  app/(main)/index.tsx → src/hooks/useSession.ts

## Import Cycles
- None detected.

## Communities (19 total, 1 thin omitted)

### Community 1 - "Paket Bagimliliklari (npm)"
Cohesion: 0.05
Nodes (42): Abonelik mantığı (Edge Functions), Auth görevleri (e-posta + şifre — e-posta doğrulamalı), Auth görevleri (SMS suistimaline karşı), Faz 0 — Proje kurulumu, Faz 1 — Temel iskelet, Faz 2 — Randevu akışı (yayınlanabilir MVP), Faz 3 — Abonelik + ödeme, Faz 4 — Zenginleştirme + KVKK tamamlama (+34 more)

### Community 3 - "Supabase Istemci & Ana Ekranlar"
Cohesion: 0.11
Nodes (19): s, s, s, s, CaptchaWidget(), HTML(), Props, s (+11 more)

### Community 4 - "Kimlik Dogrulama Ekranlari"
Cohesion: 0.11
Nodes (18): cors, Girdi, cors, Girdi, authHeader(), checkoutBaslat(), CheckoutBaslatGirdi, CheckoutBaslatSonuc (+10 more)

### Community 5 - "Tipler & Randevu/Paket Akisi"
Cohesion: 0.04
Nodes (46): dependencies, expo, expo-asset, expo-constants, expo-font, expo-image-picker, expo-linking, @expo/metro-runtime (+38 more)

### Community 6 - "Edge Functions (iyzico/odeme)"
Cohesion: 0.07
Nodes (30): BOLUMLER, KvkkScreen(), s, RootLayout(), OdemeScreen(), s, Bilgi(), BilgiProps (+22 more)

### Community 7 - "Hizmet Yonetimi & Calisma Duzeni"
Cohesion: 0.09
Nodes (21): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, predictiveBackGestureEnabled, expo, android (+13 more)

### Community 8 - "Expo Yapilandirmasi (app.json)"
Cohesion: 0.14
Nodes (19): HizmetDetayScreen(), s, fiyatAraligi(), fiyatMetni(), gorselUrl(), indirimliMetni(), KampanyaPick, sureMetni() (+11 more)

### Community 9 - "Arac Katalogu & Secim"
Cohesion: 0.16
Nodes (14): AraclarScreen(), s, AutocompleteInput(), Props, s, ARAC_CINSLERI, AracCinsi, BUYUK_CINSLER (+6 more)

### Community 10 - "Proje Talimatlari (CLAUDE.md)"
Cohesion: 0.14
Nodes (13): Bağlam dosyaları, graphify, graphify (token tasarrufu — scope-first zorunlu), Güncel tutma, Kod ve çalışma konvansiyonları, Komut rehberi, KVKK kararları (şemaya gömülü, baştan uygulanır), Mutlak kurallar (asla ihlal etme) (+5 more)

### Community 11 - "Urun Ozellikleri Dokumani"
Cohesion: 0.14
Nodes (13): 1. Genel Bakış, 2.1 Özellikler, 2.2 Abonelik Paketleri, 2.3 Kurallar, 2.4 Müşteri Akış Diyagramı, 2. Müşteri Tarafı, 3.1 Franchise Yapısı ve Roller, 3.2 Panel Bölümleri (+5 more)

### Community 12 - "Obsidian Export Script"
Cohesion: 0.17
Nodes (9): byId, fileEdges, files, g, GRAPH, idx, OUT, outgoing (+1 more)

### Community 15 - "Community 15"
Cohesion: 0.06
Nodes (54): AbonelikScreen(), KADEME_ETIKET, s, DURUM_ETIKET, HizmetTeklifleriScreen(), s, SONRAKI, gunler() (+46 more)

### Community 16 - "Community 16"
Cohesion: 0.06
Nodes (35): GUNLER, OGLEDEN_SONRA, saatDk(), saatGecerli(), SABAH, TUM_GUNLER, VARSAYILAN_PENCERELER, AbonelikDurum (+27 more)

### Community 18 - "Community 18"
Cohesion: 0.33
Nodes (6): ASSETS, kareSvg(), MARK, png(), ROOT, svg

### Community 19 - "Community 19"
Cohesion: 0.06
Nodes (30): IS_ETIKET, RANDEVU_ETIKET, RandevularimScreen(), s, gunListesi(), IS_ETIKET, IslerListesi(), s (+22 more)

### Community 20 - "Community 20"
Cohesion: 0.60
Nodes (4): admin, assert(), run(), temizle()

### Community 21 - "Community 21"
Cohesion: 0.40
Nodes (4): compilerOptions, strict, exclude, extends

## Knowledge Gaps
- **237 isolated node(s):** `PreToolUse`, `name`, `slug`, `version`, `orientation` (+232 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useTheme()` connect `Edge Functions (iyzico/odeme)` to `Supabase Istemci & Ana Ekranlar`, `Expo Yapilandirmasi (app.json)`, `Arac Katalogu & Secim`, `Community 15`, `Community 16`, `Community 19`?**
  _High betweenness centrality (0.069) - this node is a cross-community bridge._
- **Why does `supabase` connect `Community 15` to `Supabase Istemci & Ana Ekranlar`, `Edge Functions (iyzico/odeme)`, `Expo Yapilandirmasi (app.json)`, `Arac Katalogu & Secim`, `Community 16`, `Community 19`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Why does `useSession()` connect `Community 15` to `Expo Yapilandirmasi (app.json)`, `Community 16`, `Community 19`, `Edge Functions (iyzico/odeme)`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **What connects `PreToolUse`, `name`, `slug` to the rest of the system?**
  _237 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Paket Bagimliliklari (npm)` be split into smaller, more focused modules?**
  _Cohesion score 0.046511627906976744 - nodes in this community are weakly interconnected._
- **Should `Supabase Istemci & Ana Ekranlar` be split into smaller, more focused modules?**
  _Cohesion score 0.1053763440860215 - nodes in this community are weakly interconnected._
- **Should `Kimlik Dogrulama Ekranlari` be split into smaller, more focused modules?**
  _Cohesion score 0.1111111111111111 - nodes in this community are weakly interconnected._