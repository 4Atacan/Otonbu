# Graph Report - Otonbu  (2026-07-03)

## Corpus Check
- 139 files · ~254,055 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 573 nodes · 1246 edges · 21 communities (20 shown, 1 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `80ca3eb3`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Paket Bagimliliklari (npm)|Paket Bagimliliklari (npm)]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Supabase Istemci & Ana Ekranlar|Supabase Istemci & Ana Ekranlar]]
- [[_COMMUNITY_Kimlik Dogrulama Ekranlari|Kimlik Dogrulama Ekranlari]]
- [[_COMMUNITY_Tipler & RandevuPaket Akisi|Tipler & Randevu/Paket Akisi]]
- [[_COMMUNITY_Hizmet Yonetimi & Calisma Duzeni|Hizmet Yonetimi & Calisma Duzeni]]
- [[_COMMUNITY_Expo Yapilandirmasi (app.json)|Expo Yapilandirmasi (app.json)]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Proje Talimatlari (CLAUDE.md)|Proje Talimatlari (CLAUDE.md)]]
- [[_COMMUNITY_Urun Ozellikleri Dokumani|Urun Ozellikleri Dokumani]]
- [[_COMMUNITY_Obsidian Export Script|Obsidian Export Script]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 25|Community 25]]

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 83 edges
2. `useSession()` - 47 edges
3. `supabase` - 40 edges
4. `uyari()` - 28 edges
5. `Yukleniyor()` - 22 edges
6. `expo` - 16 edges
7. `UyariKatmani()` - 14 edges
8. `KlavyeKapsa()` - 13 edges
9. `urunGorselUrl()` - 10 edges
10. `tl()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `HizmetlerSekmesi()` --calls--> `useTheme()`  [EXTRACTED]
  app/(main)/hizmetler.tsx → src/theme/ThemeContext.tsx
- `KampanyalarSekmesi()` --calls--> `useTheme()`  [EXTRACTED]
  app/(main)/kampanyalar.tsx → src/theme/ThemeContext.tsx
- `SubelerScreen()` --calls--> `useTheme()`  [EXTRACTED]
  app/(yonetim)/subeler.tsx → src/theme/ThemeContext.tsx
- `RootLayout()` --calls--> `useSession()`  [EXTRACTED]
  app/_layout.tsx → src/hooks/useSession.ts
- `AraclarScreen()` --calls--> `useTheme()`  [EXTRACTED]
  app/araclar.tsx → src/theme/ThemeContext.tsx

## Import Cycles
- None detected.

## Communities (21 total, 1 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (35): DURUM_ETIKET, HizmetTeklifleriScreen(), s, SONRAKI, DURUM_ETIKET, s, SONRAKI, TekliflerScreen() (+27 more)

### Community 1 - "Paket Bagimliliklari (npm)"
Cohesion: 0.05
Nodes (42): Abonelik mantığı (Edge Functions), Auth görevleri (e-posta + şifre — e-posta doğrulamalı), Auth görevleri (SMS suistimaline karşı), Faz 0 — Proje kurulumu, Faz 1 — Temel iskelet, Faz 2 — Randevu akışı (yayınlanabilir MVP), Faz 3 — Abonelik + ödeme, Faz 4 — Zenginleştirme + KVKK tamamlama (+34 more)

### Community 2 - "Community 2"
Cohesion: 0.11
Nodes (22): HizmetDetayScreen(), s, fiyatAraligi(), fiyatMetni(), gorselUrl(), indirimliMetni(), KampanyaPick, sureMetni() (+14 more)

### Community 3 - "Supabase Istemci & Ana Ekranlar"
Cohesion: 0.11
Nodes (20): s, s, s, s, CaptchaWidget(), HTML(), Props, s (+12 more)

### Community 4 - "Kimlik Dogrulama Ekranlari"
Cohesion: 0.10
Nodes (19): cors, Girdi, cors, Girdi, cors, authHeader(), checkoutBaslat(), CheckoutBaslatGirdi (+11 more)

### Community 5 - "Tipler & Randevu/Paket Akisi"
Cohesion: 0.04
Nodes (47): dependencies, expo, expo-asset, expo-constants, expo-font, expo-image-picker, expo-linking, @expo/metro-runtime (+39 more)

### Community 7 - "Hizmet Yonetimi & Calisma Duzeni"
Cohesion: 0.06
Nodes (30): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, permissions, predictiveBackGestureEnabled, projectId (+22 more)

### Community 8 - "Expo Yapilandirmasi (app.json)"
Cohesion: 0.07
Nodes (34): AraclarScreen(), s, s, TeklifAlScreen(), AutocompleteInput(), Props, s, s (+26 more)

### Community 9 - "Community 9"
Cohesion: 0.16
Nodes (18): KAMPANYA_RENK, KampanyaKart(), Props, s, IndirimHaritasi, kampanyaGorselUrl(), kampanyaIndirimHaritasi(), kampanyaPuanHaritasi() (+10 more)

### Community 10 - "Proje Talimatlari (CLAUDE.md)"
Cohesion: 0.14
Nodes (13): Bağlam dosyaları, graphify, graphify (token tasarrufu — scope-first zorunlu), Güncel tutma, Kod ve çalışma konvansiyonları, Komut rehberi, KVKK kararları (şemaya gömülü, baştan uygulanır), Mutlak kurallar (asla ihlal etme) (+5 more)

### Community 11 - "Urun Ozellikleri Dokumani"
Cohesion: 0.14
Nodes (13): 1. Genel Bakış, 2.1 Özellikler, 2.2 Abonelik Paketleri, 2.3 Kurallar, 2.4 Müşteri Akış Diyagramı, 2. Müşteri Tarafı, 3.1 Franchise Yapısı ve Roller, 3.2 Panel Bölümleri (+5 more)

### Community 12 - "Obsidian Export Script"
Cohesion: 0.17
Nodes (9): byId, fileEdges, files, g, GRAPH, idx, OUT, outgoing (+1 more)

### Community 13 - "Community 13"
Cohesion: 0.10
Nodes (21): Bilgi(), BilgiProps, Etiket(), EtiketProps, s, SEGMENTLER, GUNLER, OGLEDEN_SONRA (+13 more)

### Community 15 - "Community 15"
Cohesion: 0.06
Nodes (62): Kupon, PuanMagazaScreen(), s, gunler(), RandevuAlScreen(), s, IS_ETIKET, RANDEVU_ETIKET (+54 more)

### Community 17 - "Community 17"
Cohesion: 0.07
Nodes (34): BOLUMLER, KvkkScreen(), s, RootLayout(), OdemeScreen(), s, GeriLogo(), LOGO (+26 more)

### Community 18 - "Community 18"
Cohesion: 0.33
Nodes (6): ASSETS, kareSvg(), MARK, png(), ROOT, svg

### Community 20 - "Community 20"
Cohesion: 0.60
Nodes (4): admin, assert(), run(), temizle()

### Community 21 - "Community 21"
Cohesion: 0.40
Nodes (4): compilerOptions, strict, exclude, extends

### Community 22 - "Community 22"
Cohesion: 0.11
Nodes (14): AbonelikScreen(), KADEME_ETIKET, s, AMBLEM, PuanLogo(), aboneOl(), AboneOlSonuc, avatarUrl() (+6 more)

## Knowledge Gaps
- **271 isolated node(s):** `PreToolUse`, `name`, `slug`, `version`, `orientation` (+266 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useTheme()` connect `Community 17` to `Community 0`, `Community 2`, `Supabase Istemci & Ana Ekranlar`, `Expo Yapilandirmasi (app.json)`, `Community 9`, `Community 13`, `Community 15`, `Community 22`?**
  _High betweenness centrality (0.082) - this node is a cross-community bridge._
- **Why does `supabase` connect `Community 15` to `Community 0`, `Community 2`, `Supabase Istemci & Ana Ekranlar`, `Expo Yapilandirmasi (app.json)`, `Community 9`, `Community 13`, `Community 17`, `Community 22`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Why does `useSession()` connect `Community 15` to `Community 0`, `Community 2`, `Expo Yapilandirmasi (app.json)`, `Community 9`, `Community 13`, `Community 17`, `Community 22`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **What connects `PreToolUse`, `name`, `slug` to the rest of the system?**
  _271 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.0620782726045884 - nodes in this community are weakly interconnected._
- **Should `Paket Bagimliliklari (npm)` be split into smaller, more focused modules?**
  _Cohesion score 0.046511627906976744 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.11088709677419355 - nodes in this community are weakly interconnected._