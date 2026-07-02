# Graph Report - Otonbu  (2026-07-01)

## Corpus Check
- 137 files · ~253,199 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 560 nodes · 1232 edges · 27 communities (26 shown, 1 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `856258ef`
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
- [[_COMMUNITY_Community 9|Community 9]]
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
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 28|Community 28]]

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 83 edges
2. `useSession()` - 47 edges
3. `supabase` - 40 edges
4. `uyari()` - 28 edges
5. `Yukleniyor()` - 22 edges
6. `UyariKatmani()` - 14 edges
7. `KlavyeKapsa()` - 13 edges
8. `expo` - 12 edges
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

## Communities (27 total, 1 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.15
Nodes (12): AbonelikDurum, AppointmentChange, DegisiklikDurum, DegisiklikTip, DukkanSatisOzet, Job, JobPhoto, OrderItem (+4 more)

### Community 1 - "Paket Bagimliliklari (npm)"
Cohesion: 0.05
Nodes (42): Abonelik mantığı (Edge Functions), Auth görevleri (e-posta + şifre — e-posta doğrulamalı), Auth görevleri (SMS suistimaline karşı), Faz 0 — Proje kurulumu, Faz 1 — Temel iskelet, Faz 2 — Randevu akışı (yayınlanabilir MVP), Faz 3 — Abonelik + ödeme, Faz 4 — Zenginleştirme + KVKK tamamlama (+34 more)

### Community 2 - "Community 2"
Cohesion: 0.20
Nodes (7): Appointment, MusaitSlot, YONETICI_ROLLER, DURUM_ETIKET, gunler(), RandevularScreen(), s

### Community 3 - "Supabase Istemci & Ana Ekranlar"
Cohesion: 0.11
Nodes (20): s, s, s, s, CaptchaWidget(), HTML(), Props, s (+12 more)

### Community 4 - "Kimlik Dogrulama Ekranlari"
Cohesion: 0.11
Nodes (18): cors, Girdi, cors, Girdi, authHeader(), checkoutBaslat(), CheckoutBaslatGirdi, CheckoutBaslatSonuc (+10 more)

### Community 5 - "Tipler & Randevu/Paket Akisi"
Cohesion: 0.04
Nodes (46): dependencies, expo, expo-asset, expo-constants, expo-font, expo-image-picker, expo-linking, @expo/metro-runtime (+38 more)

### Community 6 - "Edge Functions (iyzico/odeme)"
Cohesion: 0.25
Nodes (6): DURUM_ETIKET, s, SONRAKI, TekliflerScreen(), InsuranceRequest, UserProfile

### Community 7 - "Hizmet Yonetimi & Calisma Duzeni"
Cohesion: 0.09
Nodes (21): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, predictiveBackGestureEnabled, expo, android (+13 more)

### Community 8 - "Expo Yapilandirmasi (app.json)"
Cohesion: 0.07
Nodes (44): Kupon, PuanMagazaScreen(), s, gunler(), RandevuAlScreen(), s, s, UrunDetayScreen() (+36 more)

### Community 9 - "Community 9"
Cohesion: 0.08
Nodes (31): KAMPANYA_RENK, KampanyaKart(), Props, s, MARKA, OtonbuArac(), Props, TOGG (+23 more)

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
Cohesion: 0.07
Nodes (35): HizmetDetayScreen(), s, Bilgi(), BilgiProps, Etiket(), EtiketProps, s, SEGMENTLER (+27 more)

### Community 14 - "Community 14"
Cohesion: 0.11
Nodes (21): AraclarScreen(), s, s, TeklifAlScreen(), AutocompleteInput(), Props, s, ARAC_CINSLERI (+13 more)

### Community 15 - "Community 15"
Cohesion: 0.22
Nodes (6): IS_ETIKET, RANDEVU_ETIKET, RandevularimScreen(), s, IsDurum, RandevuDurum

### Community 16 - "Community 16"
Cohesion: 0.29
Nodes (6): DURUM_ETIKET, HizmetTeklifleriScreen(), s, SONRAKI, ServiceQuote, SigortaDurum

### Community 17 - "Community 17"
Cohesion: 0.10
Nodes (25): BOLUMLER, KvkkScreen(), s, RootLayout(), OdemeScreen(), s, GeriLogo(), LOGO (+17 more)

### Community 18 - "Community 18"
Cohesion: 0.33
Nodes (6): ASSETS, kareSvg(), MARK, png(), ROOT, svg

### Community 19 - "Community 19"
Cohesion: 0.17
Nodes (12): gunOnce(), IS_ETIKET, Props, RANDEVU_ETIKET, RaporModal(), s, ymd(), useSession() (+4 more)

### Community 20 - "Community 20"
Cohesion: 0.60
Nodes (4): admin, assert(), run(), temizle()

### Community 21 - "Community 21"
Cohesion: 0.40
Nodes (4): compilerOptions, strict, exclude, extends

### Community 22 - "Community 22"
Cohesion: 0.09
Nodes (22): AbonelikScreen(), KADEME_ETIKET, s, gunListesi(), IS_ETIKET, IslerListesi(), s, SONRAKI (+14 more)

### Community 23 - "Community 23"
Cohesion: 0.29
Nodes (7): Plan, PlanHak, PlanKademe, bosForm(), KADEMELER, PaketlerScreen(), s

### Community 28 - "Community 28"
Cohesion: 0.29
Nodes (6): DURUM_ETIKET, s, SiparislerScreen(), SONRAKI, Order, SiparisDurum

## Knowledge Gaps
- **264 isolated node(s):** `PreToolUse`, `name`, `slug`, `version`, `orientation` (+259 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useTheme()` connect `Community 17` to `Community 2`, `Supabase Istemci & Ana Ekranlar`, `Edge Functions (iyzico/odeme)`, `Expo Yapilandirmasi (app.json)`, `Community 9`, `Community 13`, `Community 14`, `Community 15`, `Community 16`, `Community 19`, `Community 22`, `Community 23`, `Community 28`?**
  _High betweenness centrality (0.086) - this node is a cross-community bridge._
- **Why does `supabase` connect `Community 22` to `Community 2`, `Supabase Istemci & Ana Ekranlar`, `Edge Functions (iyzico/odeme)`, `Expo Yapilandirmasi (app.json)`, `Community 9`, `Community 13`, `Community 14`, `Community 15`, `Community 16`, `Community 17`, `Community 19`, `Community 23`, `Community 28`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Why does `useSession()` connect `Community 19` to `Community 2`, `Edge Functions (iyzico/odeme)`, `Expo Yapilandirmasi (app.json)`, `Community 9`, `Community 13`, `Community 14`, `Community 15`, `Community 16`, `Community 17`, `Community 22`, `Community 23`, `Community 28`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **What connects `PreToolUse`, `name`, `slug` to the rest of the system?**
  _264 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Paket Bagimliliklari (npm)` be split into smaller, more focused modules?**
  _Cohesion score 0.046511627906976744 - nodes in this community are weakly interconnected._
- **Should `Supabase Istemci & Ana Ekranlar` be split into smaller, more focused modules?**
  _Cohesion score 0.10606060606060606 - nodes in this community are weakly interconnected._
- **Should `Kimlik Dogrulama Ekranlari` be split into smaller, more focused modules?**
  _Cohesion score 0.1111111111111111 - nodes in this community are weakly interconnected._