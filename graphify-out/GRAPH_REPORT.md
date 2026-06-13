# Graph Report - Otonbu  (2026-06-13)

## Corpus Check
- 55 files · ~44,469 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 298 nodes · 468 edges · 16 communities (15 shown, 1 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `74e8be5c`
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
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 33 edges
2. `useSession()` - 21 edges
3. `supabase` - 21 edges
4. `expo` - 12 edges
5. `OTONBU GARAGE — Proje Talimatları` - 9 edges
6. `OTONBU GARAGE — Uygulama Planı` - 9 edges
7. `Faz 2 — Randevu akışı (yayınlanabilir MVP)` - 9 edges
8. `Faz 3 — Abonelik + ödeme` - 9 edges
9. `scripts` - 8 edges
10. `Faz 1 — Temel iskelet` - 8 edges

## Surprising Connections (you probably didn't know these)
- `AraclarScreen()` --calls--> `useTheme()`  [EXTRACTED]
  app/(main)/araclar.tsx → src/theme/ThemeContext.tsx
- `KampanyalarScreen()` --calls--> `useTheme()`  [EXTRACTED]
  app/(main)/kampanyalar.tsx → src/theme/ThemeContext.tsx
- `RandevularScreen()` --calls--> `useTheme()`  [EXTRACTED]
  app/(yonetim)/randevular.tsx → src/theme/ThemeContext.tsx
- `SubelerScreen()` --calls--> `useTheme()`  [EXTRACTED]
  app/(yonetim)/subeler.tsx → src/theme/ThemeContext.tsx
- `MainLayout()` --calls--> `useTheme()`  [EXTRACTED]
  app/(main)/_layout.tsx → src/theme/ThemeContext.tsx

## Import Cycles
- None detected.

## Communities (16 total, 1 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.20
Nodes (9): Bağlam dosyaları, graphify, Kod ve çalışma konvansiyonları, KVKK kararları (şemaya gömülü, baştan uygulanır), Mutlak kurallar (asla ihlal etme), OTONBU GARAGE — Proje Talimatları, Teknoloji yığını, Yapı (+1 more)

### Community 1 - "Community 1"
Cohesion: 0.08
Nodes (26): gunler(), RandevuAlScreen(), s, KampanyalarScreen(), s, IS_ETIKET, RANDEVU_ETIKET, RandevularimScreen() (+18 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (34): Abonelik mantığı (Edge Functions), Faz 0 — Proje kurulumu, Faz 2 — Randevu akışı (yayınlanabilir MVP), Faz 3 — Abonelik + ödeme, Faz 4 — Zenginleştirme + KVKK tamamlama, Fiyat hesabı (Edge Function — `fiyat-hesapla`), Görevler, iyzico ödeme akışı (Edge Functions) (+26 more)

### Community 3 - "Community 3"
Cohesion: 0.12
Nodes (19): s, s, s, s, s, CaptchaWidget(), HTML(), Props (+11 more)

### Community 4 - "Community 4"
Cohesion: 0.07
Nodes (35): PERSONEL_ROLLER, RootLayout(), useSession(), initSentry(), AnaSayfa(), s, MainLayout(), ProfilScreen() (+27 more)

### Community 5 - "Community 5"
Cohesion: 0.21
Nodes (12): AutocompleteInput(), Props, s, ARAC_CINSLERI, AracCinsi, cinsLabel(), filtrele(), MARKA_ADLARI (+4 more)

### Community 6 - "Community 6"
Cohesion: 0.05
Nodes (43): dependencies, expo, expo-asset, expo-constants, expo-font, expo-image-picker, expo-linking, @expo/metro-runtime (+35 more)

### Community 8 - "Community 8"
Cohesion: 0.09
Nodes (21): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, predictiveBackGestureEnabled, expo, android (+13 more)

### Community 10 - "Community 10"
Cohesion: 0.14
Nodes (13): 1. Genel Bakış, 2.1 Özellikler, 2.2 Abonelik Paketleri, 2.3 Kurallar, 2.4 Müşteri Akış Diyagramı, 2. Müşteri Tarafı, 3.1 Franchise Yapısı ve Roller, 3.2 Panel Bölümleri (+5 more)

### Community 11 - "Community 11"
Cohesion: 0.60
Nodes (4): admin, assert(), run(), temizle()

### Community 12 - "Community 12"
Cohesion: 0.31
Nodes (6): cors, Girdi, captureEdgeException(), ParsedDsn, parseDsn(), parseStack()

### Community 13 - "Community 13"
Cohesion: 0.40
Nodes (4): compilerOptions, strict, exclude, extends

### Community 15 - "Community 15"
Cohesion: 0.28
Nodes (7): gunlukSlotSaatleri(), OGLEDEN_SONRA, SABAH, TimeSlot, gunler(), s, SlotlarScreen()

### Community 16 - "Community 16"
Cohesion: 0.25
Nodes (8): Auth görevleri (e-posta + şifre — e-posta doğrulamalı), Auth görevleri (SMS suistimaline karşı), Faz 1 — Temel iskelet, Kabul kriteri, Kabul kriteri, Ortak yardımcılar (önce bunlar), RLS politikaları, Tablolar

## Knowledge Gaps
- **166 isolated node(s):** `PreToolUse`, `name`, `slug`, `version`, `orientation` (+161 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `supabase` connect `Community 3` to `Community 1`, `Community 4`, `Community 5`, `Community 15`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Why does `useTheme()` connect `Community 4` to `Community 1`, `Community 5`, `Community 15`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **What connects `PreToolUse`, `name`, `slug` to the rest of the system?**
  _166 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.05714285714285714 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.11931818181818182 - nodes in this community are weakly interconnected._
- **Should `Community 4` be split into smaller, more focused modules?**
  _Cohesion score 0.07372549019607844 - nodes in this community are weakly interconnected._