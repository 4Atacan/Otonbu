# Graph Report - Otonbu  (2026-06-12)

## Corpus Check
- 47 files · ~37,894 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 262 nodes · 373 edges · 17 communities (16 shown, 1 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0b9106b1`
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
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 25 edges
2. `supabase` - 16 edges
3. `useSession()` - 13 edges
4. `expo` - 12 edges
5. `OTONBU GARAGE — Proje Talimatları` - 9 edges
6. `OTONBU GARAGE — Uygulama Planı` - 9 edges
7. `Faz 2 — Randevu akışı (yayınlanabilir MVP)` - 9 edges
8. `Faz 3 — Abonelik + ödeme` - 9 edges
9. `scripts` - 8 edges
10. `Faz 1 — Temel iskelet` - 8 edges

## Surprising Connections (you probably didn't know these)
- `MainLayout()` --calls--> `useTheme()`  [EXTRACTED]
  app/(main)/_layout.tsx → src/theme/ThemeContext.tsx
- `AraclarScreen()` --calls--> `useTheme()`  [EXTRACTED]
  app/(main)/araclar.tsx → src/theme/ThemeContext.tsx
- `KampanyalarScreen()` --calls--> `useTheme()`  [EXTRACTED]
  app/(main)/kampanyalar.tsx → src/theme/ThemeContext.tsx
- `HizmetlerScreen()` --calls--> `useTheme()`  [EXTRACTED]
  app/(yonetim)/hizmetler.tsx → src/theme/ThemeContext.tsx
- `RandevularScreen()` --calls--> `useTheme()`  [EXTRACTED]
  app/(yonetim)/randevular.tsx → src/theme/ThemeContext.tsx

## Import Cycles
- None detected.

## Communities (17 total, 1 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.20
Nodes (9): Bağlam dosyaları, graphify, Kod ve çalışma konvansiyonları, KVKK kararları (şemaya gömülü, baştan uygulanır), Mutlak kurallar (asla ihlal etme), OTONBU GARAGE — Proje Talimatları, Teknoloji yığını, Yapı (+1 more)

### Community 1 - "Community 1"
Cohesion: 0.25
Nodes (8): Auth görevleri (e-posta + şifre — e-posta doğrulamalı), Auth görevleri (SMS suistimaline karşı), Faz 1 — Temel iskelet, Kabul kriteri, Kabul kriteri, Ortak yardımcılar (önce bunlar), RLS politikaları, Tablolar

### Community 2 - "Community 2"
Cohesion: 0.08
Nodes (25): Faz 0 — Proje kurulumu, Faz 2 — Randevu akışı (yayınlanabilir MVP), Faz 4 — Zenginleştirme + KVKK tamamlama, Fiyat hesabı (Edge Function — `fiyat-hesapla`), Görevler, Kabul kriteri, Kabul kriteri, Kabul kriteri (+17 more)

### Community 3 - "Community 3"
Cohesion: 0.12
Nodes (17): s, s, s, s, CaptchaWidget(), HTML(), Props, s (+9 more)

### Community 4 - "Community 4"
Cohesion: 0.07
Nodes (41): PERSONEL_ROLLER, RootLayout(), useSession(), initSentry(), supabase, AraclarScreen(), AnaSayfa(), s (+33 more)

### Community 5 - "Community 5"
Cohesion: 0.23
Nodes (11): AutocompleteInput(), Props, s, ARAC_CINSLERI, AracCinsi, cinsLabel(), filtrele(), MARKA_ADLARI (+3 more)

### Community 6 - "Community 6"
Cohesion: 0.08
Nodes (24): dependencies, expo, expo-asset, expo-constants, expo-font, expo-linking, @expo/metro-runtime, expo-modules-core (+16 more)

### Community 8 - "Community 8"
Cohesion: 0.09
Nodes (21): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, predictiveBackGestureEnabled, expo, android (+13 more)

### Community 9 - "Community 9"
Cohesion: 0.11
Nodes (18): devDependencies, @expo/ngrok, ts-node, @types/node, @types/react, typescript, main, name (+10 more)

### Community 10 - "Community 10"
Cohesion: 0.14
Nodes (13): 1. Genel Bakış, 2.1 Özellikler, 2.2 Abonelik Paketleri, 2.3 Kurallar, 2.4 Müşteri Akış Diyagramı, 2. Müşteri Tarafı, 3.1 Franchise Yapısı ve Roller, 3.2 Panel Bölümleri (+5 more)

### Community 11 - "Community 11"
Cohesion: 0.60
Nodes (4): admin, assert(), run(), temizle()

### Community 12 - "Community 12"
Cohesion: 0.60
Nodes (4): captureEdgeException(), ParsedDsn, parseDsn(), parseStack()

### Community 13 - "Community 13"
Cohesion: 0.40
Nodes (4): compilerOptions, strict, exclude, extends

### Community 15 - "Community 15"
Cohesion: 0.28
Nodes (7): gunlukSlotSaatleri(), OGLEDEN_SONRA, SABAH, TimeSlot, gunler(), s, SlotlarScreen()

### Community 16 - "Community 16"
Cohesion: 0.22
Nodes (9): Abonelik mantığı (Edge Functions), Faz 3 — Abonelik + ödeme, iyzico ödeme akışı (Edge Functions), Kabul kriteri, Kabul kriteri, RLS politikaları, RLS politikaları, Tablolar (+1 more)

## Knowledge Gaps
- **151 isolated node(s):** `PreToolUse`, `name`, `slug`, `version`, `orientation` (+146 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `supabase` connect `Community 4` to `Community 3`, `Community 5`, `Community 15`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Why does `useTheme()` connect `Community 4` to `Community 5`, `Community 15`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Why does `OTONBU GARAGE — Uygulama Planı` connect `Community 2` to `Community 16`, `Community 1`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **What connects `PreToolUse`, `name`, `slug` to the rest of the system?**
  _151 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.07692307692307693 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.12169312169312169 - nodes in this community are weakly interconnected._
- **Should `Community 4` be split into smaller, more focused modules?**
  _Cohesion score 0.07130333138515488 - nodes in this community are weakly interconnected._