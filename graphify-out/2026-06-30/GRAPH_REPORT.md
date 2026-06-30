# Graph Report - Otonbu  (2026-06-30)

## Corpus Check
- 124 files · ~200,671 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 527 nodes · 1047 edges · 28 communities (27 shown, 1 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `198d2778`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Paket Bagimliliklari (npm)|Paket Bagimliliklari (npm)]]
- [[_COMMUNITY_Community 2|Community 2]]
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
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 27|Community 27]]

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 76 edges
2. `useSession()` - 45 edges
3. `supabase` - 38 edges
4. `Yukleniyor()` - 22 edges
5. `expo` - 12 edges
6. `OTONBU GARAGE — Proje Talimatları` - 10 edges
7. `scripts` - 9 edges
8. `OTONBU GARAGE — Uygulama Planı` - 9 edges
9. `Faz 2 — Randevu akışı (yayınlanabilir MVP)` - 9 edges
10. `Faz 3 — Abonelik + ödeme` - 9 edges

## Surprising Connections (you probably didn't know these)
- `KampanyalarSekmesi()` --calls--> `useTheme()`  [EXTRACTED]
  app/(main)/kampanyalar.tsx → src/theme/ThemeContext.tsx
- `SubelerScreen()` --calls--> `useTheme()`  [EXTRACTED]
  app/(yonetim)/subeler.tsx → src/theme/ThemeContext.tsx
- `RootLayout()` --calls--> `useSession()`  [EXTRACTED]
  app/_layout.tsx → src/hooks/useSession.ts
- `AraclarScreen()` --calls--> `useTheme()`  [EXTRACTED]
  app/araclar.tsx → src/theme/ThemeContext.tsx
- `MainLayout()` --calls--> `useTheme()`  [EXTRACTED]
  app/(main)/_layout.tsx → src/theme/ThemeContext.tsx

## Import Cycles
- None detected.

## Communities (28 total, 1 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.14
Nodes (16): gunler(), RandevuAlScreen(), s, AbonelikDurum, AppointmentChange, DegisiklikDurum, DegisiklikTip, FiyatSonuc (+8 more)

### Community 1 - "Paket Bagimliliklari (npm)"
Cohesion: 0.05
Nodes (42): Abonelik mantığı (Edge Functions), Auth görevleri (e-posta + şifre — e-posta doğrulamalı), Auth görevleri (SMS suistimaline karşı), Faz 0 — Proje kurulumu, Faz 1 — Temel iskelet, Faz 2 — Randevu akışı (yayınlanabilir MVP), Faz 3 — Abonelik + ödeme, Faz 4 — Zenginleştirme + KVKK tamamlama (+34 more)

### Community 2 - "Community 2"
Cohesion: 0.17
Nodes (17): s, UrunDetayScreen(), Ctx, SepetKalem, SepetProvider(), SepetState, useSepet(), IndirimHaritasi (+9 more)

### Community 3 - "Supabase Istemci & Ana Ekranlar"
Cohesion: 0.10
Nodes (22): s, s, s, s, CaptchaWidget(), HTML(), Props, s (+14 more)

### Community 4 - "Kimlik Dogrulama Ekranlari"
Cohesion: 0.11
Nodes (18): cors, Girdi, cors, Girdi, authHeader(), checkoutBaslat(), CheckoutBaslatGirdi, CheckoutBaslatSonuc (+10 more)

### Community 5 - "Tipler & Randevu/Paket Akisi"
Cohesion: 0.04
Nodes (46): dependencies, expo, expo-asset, expo-constants, expo-font, expo-image-picker, expo-linking, @expo/metro-runtime (+38 more)

### Community 6 - "Edge Functions (iyzico/odeme)"
Cohesion: 0.06
Nodes (39): BOLUMLER, KvkkScreen(), s, RootLayout(), OdemeScreen(), s, GeriLogo(), LOGO (+31 more)

### Community 7 - "Hizmet Yonetimi & Calisma Duzeni"
Cohesion: 0.09
Nodes (21): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, predictiveBackGestureEnabled, expo, android (+13 more)

### Community 8 - "Expo Yapilandirmasi (app.json)"
Cohesion: 0.19
Nodes (15): KAMPANYA_RENK, KampanyaKart(), Props, s, kampanyaGorselUrl(), kampanyaRozet(), kampanyaTarih(), KampanyalarSekmesi() (+7 more)

### Community 9 - "Arac Katalogu & Secim"
Cohesion: 0.11
Nodes (22): AraclarScreen(), s, s, TeklifAlScreen(), AutocompleteInput(), Props, s, ARAC_CINSLERI (+14 more)

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
Nodes (20): Bilgi(), BilgiProps, Etiket(), EtiketProps, s, GUNLER, OGLEDEN_SONRA, saatDk() (+12 more)

### Community 14 - "Community 14"
Cohesion: 0.21
Nodes (9): s, StokScreen(), useSession(), StockItem, UserProfile, PANEL_ADI, PanelScreen(), ROL_ADLARI (+1 more)

### Community 15 - "Community 15"
Cohesion: 0.29
Nodes (7): Plan, PlanHak, PlanKademe, bosForm(), KADEMELER, PaketlerScreen(), s

### Community 16 - "Community 16"
Cohesion: 0.11
Nodes (23): HizmetDetayScreen(), s, MARK, Props, styles, Yukleniyor(), fiyatAraligi(), fiyatMetni() (+15 more)

### Community 17 - "Community 17"
Cohesion: 0.29
Nodes (5): AbonelikScreen(), KADEME_ETIKET, s, Entitlement, Subscription

### Community 18 - "Community 18"
Cohesion: 0.33
Nodes (6): ASSETS, kareSvg(), MARK, png(), ROOT, svg

### Community 19 - "Community 19"
Cohesion: 0.09
Nodes (19): IS_ETIKET, RANDEVU_ETIKET, RandevularimScreen(), s, gunOnce(), IS_ETIKET, Props, RANDEVU_ETIKET (+11 more)

### Community 20 - "Community 20"
Cohesion: 0.60
Nodes (4): admin, assert(), run(), temizle()

### Community 21 - "Community 21"
Cohesion: 0.40
Nodes (4): compilerOptions, strict, exclude, extends

### Community 22 - "Community 22"
Cohesion: 0.29
Nodes (6): DURUM_ETIKET, HizmetTeklifleriScreen(), s, SONRAKI, ServiceQuote, SigortaDurum

### Community 23 - "Community 23"
Cohesion: 0.29
Nodes (6): DURUM_ETIKET, s, SiparislerScreen(), SONRAKI, Order, SiparisDurum

### Community 24 - "Community 24"
Cohesion: 0.33
Nodes (5): DURUM_ETIKET, s, SONRAKI, TekliflerScreen(), InsuranceRequest

### Community 27 - "Community 27"
Cohesion: 0.33
Nodes (4): Branch, PersonelSatir, s, SubelerScreen()

## Knowledge Gaps
- **253 isolated node(s):** `PreToolUse`, `name`, `slug`, `version`, `orientation` (+248 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useTheme()` connect `Edge Functions (iyzico/odeme)` to `Community 0`, `Community 2`, `Supabase Istemci & Ana Ekranlar`, `Expo Yapilandirmasi (app.json)`, `Arac Katalogu & Secim`, `Community 13`, `Community 14`, `Community 15`, `Community 16`, `Community 17`, `Community 19`, `Community 22`, `Community 23`, `Community 24`, `Community 27`?**
  _High betweenness centrality (0.085) - this node is a cross-community bridge._
- **Why does `supabase` connect `Supabase Istemci & Ana Ekranlar` to `Community 0`, `Community 2`, `Edge Functions (iyzico/odeme)`, `Expo Yapilandirmasi (app.json)`, `Arac Katalogu & Secim`, `Community 13`, `Community 14`, `Community 15`, `Community 16`, `Community 17`, `Community 19`, `Community 22`, `Community 23`, `Community 24`, `Community 27`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Why does `useSession()` connect `Community 14` to `Community 0`, `Community 2`, `Edge Functions (iyzico/odeme)`, `Expo Yapilandirmasi (app.json)`, `Arac Katalogu & Secim`, `Community 13`, `Community 15`, `Community 16`, `Community 17`, `Community 19`, `Community 22`, `Community 23`, `Community 24`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **What connects `PreToolUse`, `name`, `slug` to the rest of the system?**
  _253 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.13725490196078433 - nodes in this community are weakly interconnected._
- **Should `Paket Bagimliliklari (npm)` be split into smaller, more focused modules?**
  _Cohesion score 0.046511627906976744 - nodes in this community are weakly interconnected._
- **Should `Supabase Istemci & Ana Ekranlar` be split into smaller, more focused modules?**
  _Cohesion score 0.09841269841269841 - nodes in this community are weakly interconnected._