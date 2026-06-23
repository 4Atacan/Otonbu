# Graph Report - Otonbu  (2026-06-22)

## Corpus Check
- 82 files · ~163,640 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 416 nodes · 711 edges · 18 communities (17 shown, 1 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c0612367`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 22|Community 22]]

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 42 edges
2. `useSession()` - 27 edges
3. `supabase` - 24 edges
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
- `HizmetlerScreen()` --calls--> `useSession()`  [EXTRACTED]
  app/(yonetim)/hizmetler.tsx → src/hooks/useSession.ts
- `HizmetlerScreen()` --calls--> `useTheme()`  [EXTRACTED]
  app/(yonetim)/hizmetler.tsx → src/theme/ThemeContext.tsx

## Import Cycles
- None detected.

## Communities (18 total, 1 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.14
Nodes (13): Bağlam dosyaları, graphify, graphify (token tasarrufu — scope-first zorunlu), Güncel tutma, Kod ve çalışma konvansiyonları, Komut rehberi, KVKK kararları (şemaya gömülü, baştan uygulanır), Mutlak kurallar (asla ihlal etme) (+5 more)

### Community 1 - "Community 1"
Cohesion: 0.33
Nodes (6): ASSETS, kareSvg(), MARK, png(), ROOT, svg

### Community 2 - "Community 2"
Cohesion: 0.05
Nodes (42): Abonelik mantığı (Edge Functions), Auth görevleri (e-posta + şifre — e-posta doğrulamalı), Auth görevleri (SMS suistimaline karşı), Faz 0 — Proje kurulumu, Faz 1 — Temel iskelet, Faz 2 — Randevu akışı (yayınlanabilir MVP), Faz 3 — Abonelik + ödeme, Faz 4 — Zenginleştirme + KVKK tamamlama (+34 more)

### Community 3 - "Community 3"
Cohesion: 0.10
Nodes (20): s, s, s, s, s, CaptchaWidget(), HTML(), Props (+12 more)

### Community 4 - "Community 4"
Cohesion: 0.12
Nodes (25): AbonelikScreen(), KADEME_ETIKET, s, HizmetDetayScreen(), s, MARK, Props, styles (+17 more)

### Community 5 - "Community 5"
Cohesion: 0.15
Nodes (16): AutocompleteInput(), Props, s, ARAC_CINSLERI, AracCinsi, BUYUK_CINSLER, cinsLabel(), filtrele() (+8 more)

### Community 6 - "Community 6"
Cohesion: 0.04
Nodes (46): dependencies, expo, expo-asset, expo-constants, expo-font, expo-image-picker, expo-linking, @expo/metro-runtime (+38 more)

### Community 8 - "Community 8"
Cohesion: 0.09
Nodes (21): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, predictiveBackGestureEnabled, expo, android (+13 more)

### Community 9 - "Community 9"
Cohesion: 0.17
Nodes (9): byId, fileEdges, files, g, GRAPH, idx, OUT, outgoing (+1 more)

### Community 10 - "Community 10"
Cohesion: 0.14
Nodes (13): 1. Genel Bakış, 2.1 Özellikler, 2.2 Abonelik Paketleri, 2.3 Kurallar, 2.4 Müşteri Akış Diyagramı, 2. Müşteri Tarafı, 3.1 Franchise Yapısı ve Roller, 3.2 Panel Bölümleri (+5 more)

### Community 11 - "Community 11"
Cohesion: 0.60
Nodes (4): admin, assert(), run(), temizle()

### Community 12 - "Community 12"
Cohesion: 0.11
Nodes (18): cors, Girdi, cors, Girdi, authHeader(), checkoutBaslat(), CheckoutBaslatGirdi, CheckoutBaslatSonuc (+10 more)

### Community 13 - "Community 13"
Cohesion: 0.40
Nodes (4): compilerOptions, strict, exclude, extends

### Community 17 - "Community 17"
Cohesion: 0.12
Nodes (17): Bilgi(), BilgiProps, Etiket(), EtiketProps, s, GUNLER, OGLEDEN_SONRA, saatDk() (+9 more)

### Community 20 - "Community 20"
Cohesion: 0.05
Nodes (50): PERSONEL_ROLLER, RootLayout(), gunListesi(), IS_ETIKET, IslerListesi(), s, SONRAKI, SONRAKI_ETIKET (+42 more)

### Community 22 - "Community 22"
Cohesion: 0.09
Nodes (26): gunler(), RandevuAlScreen(), s, AbonelikDurum, AppointmentChange, BranchPrice, Campaign, DegisiklikDurum (+18 more)

## Knowledge Gaps
- **215 isolated node(s):** `PreToolUse`, `name`, `slug`, `version`, `orientation` (+210 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useTheme()` connect `Community 20` to `Community 3`, `Community 4`, `Community 5`, `Community 17`, `Community 22`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Why does `supabase` connect `Community 4` to `Community 3`, `Community 5`, `Community 17`, `Community 20`, `Community 22`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Why does `useSession()` connect `Community 20` to `Community 17`, `Community 4`, `Community 22`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **What connects `PreToolUse`, `name`, `slug` to the rest of the system?**
  _215 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.046511627906976744 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.10227272727272728 - nodes in this community are weakly interconnected._