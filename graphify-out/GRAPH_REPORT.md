# Graph Report - Otonbu  (2026-06-02)

## Corpus Check
- 3 files · ~3,143 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 45 nodes · 42 edges · 8 communities (7 shown, 1 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]

## God Nodes (most connected - your core abstractions)
1. `OTONBU GARAGE — Proje Talimatları` - 9 edges
2. `OTONBU GARAGE — Uygulama Planı` - 9 edges
3. `Faz 1 — Temel iskelet` - 6 edges
4. `Faz 2 — Randevu akışı (yayınlanabilir MVP)` - 6 edges
5. `Faz 3 — Abonelik + ödeme` - 6 edges
6. `Faz 4 — Zenginleştirme + KVKK tamamlama` - 5 edges
7. `Faz 0 — Proje kurulumu` - 4 edges
8. `hooks` - 2 edges
9. `PreToolUse` - 1 edges
10. `Ürün özeti` - 1 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Import Cycles
- None detected.

## Communities (8 total, 1 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.20
Nodes (9): Bağlam dosyaları, graphify, Kod ve çalışma konvansiyonları, KVKK kararları (şemaya gömülü, baştan uygulanır), Mutlak kurallar (asla ihlal etme), OTONBU GARAGE — Proje Talimatları, Teknoloji yığını, Yapı (+1 more)

### Community 1 - "Community 1"
Cohesion: 0.33
Nodes (6): Abonelik mantığı (Edge Functions), Faz 3 — Abonelik + ödeme, iyzico ödeme akışı (Edge Functions), Kabul kriteri, RLS politikaları, Tablolar

### Community 2 - "Community 2"
Cohesion: 0.33
Nodes (6): Auth görevleri (SMS suistimaline karşı), Faz 1 — Temel iskelet, Kabul kriteri, Ortak yardımcılar (önce bunlar), RLS politikaları, Tablolar

### Community 3 - "Community 3"
Cohesion: 0.33
Nodes (6): Faz 2 — Randevu akışı (yayınlanabilir MVP), Fiyat hesabı (Edge Function — `fiyat-hesapla`), Kabul kriteri, RLS politikaları, Storage görevleri (önce/sonra foto), Tablolar

### Community 4 - "Community 4"
Cohesion: 0.40
Nodes (4): Operasyon (tüm fazlar boyunca), OTONBU GARAGE — Uygulama Planı, Tekrarlayan kontrol — her yeni tablo için, Çalışma sırası (özet)

### Community 5 - "Community 5"
Cohesion: 0.40
Nodes (5): Faz 4 — Zenginleştirme + KVKK tamamlama, Kabul kriteri, KVKK görevleri, RLS politikaları, Tablolar

### Community 6 - "Community 6"
Cohesion: 0.50
Nodes (4): Faz 0 — Proje kurulumu, Görevler, Kabul kriteri, Ortam değişkenleri yerleşimi (kritik)

## Knowledge Gaps
- **34 isolated node(s):** `PreToolUse`, `Ürün özeti`, `Teknoloji yığını`, `Mutlak kurallar (asla ihlal etme)`, `KVKK kararları (şemaya gömülü, baştan uygulanır)` (+29 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `OTONBU GARAGE — Uygulama Planı` connect `Community 4` to `Community 1`, `Community 2`, `Community 3`, `Community 5`, `Community 6`?**
  _High betweenness centrality (0.427) - this node is a cross-community bridge._
- **Why does `Faz 1 — Temel iskelet` connect `Community 2` to `Community 4`?**
  _High betweenness centrality (0.148) - this node is a cross-community bridge._
- **Why does `Faz 2 — Randevu akışı (yayınlanabilir MVP)` connect `Community 3` to `Community 4`?**
  _High betweenness centrality (0.148) - this node is a cross-community bridge._
- **What connects `PreToolUse`, `Ürün özeti`, `Teknoloji yığını` to the rest of the system?**
  _34 weakly-connected nodes found - possible documentation gaps or missing edges._