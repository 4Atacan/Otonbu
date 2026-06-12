<!-- converted from OTONBU_Uygulama_Ozellikleri.docx -->

OTONBU GARAGE Mobil Uygulama
Özellik Tanımı ve Akış Diyagramları
Sakarya genelinde franchise araç koruma ve bakım hizmetleri · Müşteri ve yönetim tarafı
# 1. Genel Bakış
Bu belge, OTONBU GARAGE için geliştirilecek mobil uygulamanın (iOS/Android) müşteri ve yönetim tarafındaki özelliklerini ve kullanım akışlarını tanımlar. Uygulama franchise modeliyle çalışan, birbirinden bağımsız şubelere sahip bir yapıyı destekler. Her şube kendi cirosu, personeli, stoğu ve müşteri ilişkisiyle ayrı bir işletme gibi yönetilir; OTONBU merkezi ise katalog, fiyat politikası ve teknik bakım üzerinden marka bütünlüğünü korur.
Belge, daha önce netleştirilen kararları üç akış diyagramıyla birlikte sunar: müşteri akışı, franchise rol ve fiyat yapısı, ve yöneticinin günlük kullanım akışı.
# 2. Müşteri Tarafı
## 2.1 Özellikler
- Kayıt ve giriş: telefon numarası ve SMS doğrulamasıyla hızlı giriş.
- Araç profili ve servis geçmişi: plaka, marka, model, yıl ve segment bilgisiyle birden fazla araç; her araca ait geçmiş kayıtları ve bakım/koruma hatırlatmaları.
- Hizmet kataloğu ve fiyatlandırma: tüm hizmetler, araç segmentine göre fiyat farkları.
- Anlık teklif / fiyat hesaplama: seçilen hizmet ve araç segmentine göre tahmini fiyatın anında gösterimi.
- Tek seferlik randevu: hizmet seçimi, müsait slot seçimi ve uygulama içi ödeme.
- Aylık abonelik: üç kademeli paket (Temel / Orta / Üst), uygulama içi tekrarlayan ödeme, hak temelli kullanım.
- Sadakat ve puan sistemi: abonelik dışı işlemlerde puan kazanımı, indirim olarak kullanım.
- İşlem takibi: başladı → tamamlandı → teslime hazır durum güncellemeleri ve önce/sonra fotoğrafları.
- Değerlendirme ve geri bildirim: işlem sonrası puan ve geri bildirim.
- Bildirimler ve iletişim: randevu hatırlatma, durum güncellemeleri, kampanyalar; WhatsApp / arama.
## 2.2 Abonelik Paketleri
Paketler artan değer mantığıyla kademelenir; her üst paket bir altını kapsar ve üstüne ekleme yapar. Haklar aylıktır ve ay sonunda sıfırlanır (devir yoktur). Abonelik, satın alındığı şubeye bağlı kalır ve hakları yalnızca o şubede kullanılır.
- Temel: ayda 1 dış + iç yıkama.
- Orta: ayda 1 dış + iç yıkama ek olarak periyodik bakım (motor temizleme, jant-lastik, far parlatma gibi).
- Üst: yüksek/sınırsız yıkama hakkı, ayda 1 iç temizlik ve dönemsel koruma uygulamaları (seramik tazeleme, boya koruma gibi).
Abonelik hesaba bağlı çalışır: birden fazla aracı olan bir müşteri Orta veya Üst paketteki çoklu yıkama hakkını farklı araçlarına dağıtarak kullanabilir.
## 2.3 Kurallar
- Randevu, müşteri işlemden 2 saat öncesine kadar iptal edebilir.
- Randevular otomatik onaylanır; çünkü müşteri yalnızca yöneticinin önceden tanımladığı müsait slotları görür.
- Aylık abonelik haklarında kullanılmayan haklar bir sonraki aya devretmez.

## 2.4 Müşteri Akış Diyagramı

# 3. Yönetim Tarafı
## 3.1 Franchise Yapısı ve Roller
Yönetim, franchise modeline uygun olarak iki ana kavram etrafında kurulur: sistem yönetimi (admin) ve şube operasyonu. Admin operasyona karışmaz; yalnızca kurulum ve sorun çözümü için tam erişime sahiptir.
- Sistem admini (OTONBU merkez): şube oluşturma, hesap ve veri düzeltme, genel ayarlar, merkezi katalog ve fiyat politikası. Teknik bakım amaçlı tam erişim.
- Şube sahibi / yöneticisi: yalnızca kendi şubesi; personel, randevu, stok, görev, yerel fiyat ayarı ve kendi ciro raporu.
- Resepsiyon / kasa (opsiyonel): kendi şubesinde randevu ve ödeme alır, müşteri kaydeder; personel yönetemez.
- Personel / usta: yalnızca kendine atanan görevler, işlem durumu güncelleme ve fotoğraf yükleme.
## 3.2 Panel Bölümleri
- Randevu ve işlem takibi: gelen randevuların yönetimi, durum güncelleme, önce/sonra fotoğrafları.
- Takvim ve kapasite: çalışma saatleri ve aynı anda alınabilecek araç sayısının tanımı; slot üretiminin kaynağı.
- Personel ve görev: rol, yetki atama ve görev dağıtımı.
- Stok: perakende ürün ve kullanılan sarf malzeme takibi, düşük stok uyarısı.
- Gelir ve raporlama: ciro, hizmet bazlı satış, abonelik durumu (aktif, yenilenen, iptal).
- Hizmet ve fiyat: katalog ve yerel fiyat ayarı (merkezi politika çerçevesinde).
- Kampanya ve bildirim: kampanya tanımı ve müşterilere toplu duyuru.
- Müşteri ve abonelik: müşteri listesi, geçmiş ve abone yönetimi.
## 3.3 Fiyat Politikası
OTONBU merkezi, hizmet kataloğunu ve segment bazlı taban fiyatları belirler; ayrıca her hizmet için ayrı bir oynama sınırı tanımlar (örneğin seramik ±%10, yıkama ±%5). Şube yalnızca bu izin verilen aralıkta kendi yerel fiyatını belirleyebilir. Abonelik paketlerinin içeriği markanın kontrolündedir ve şube tarafından değiştirilemez. Müşteri, gittiği şubenin yerel fiyatını, kendi araç segmentine göre hesaplanmış olarak görür.

## 3.4 Franchise Rol ve Fiyat Yapısı Diyagramı

## 3.5 Yönetici Günlük Akış Diyagramı

# 4. Özet Karar Tablosu
- Platform: mobil uygulama (iOS/Android), hem müşteri hem yönetim tarafı uygulama içinde.
- Şube modeli: franchise; bağımsız şubeler, merkezi admin.
- Ödeme: uygulama içi, abonelikte tekrarlayan tahsilat.
- Abonelik: 3 paket, hak temelli, aylık sıfırlanır, satın alınan şubeye bağlı, hesaba bağlı çoklu araç kullanımı.
- Puan: abonelik dışı işlemlerde kazanılır, aboneliği tamamlar.
- Randevu: önceden tanımlı slotlar üzerinden otomatik onay; sıkıntıda yönetici saat değiştirme teklifi; 2 saat öncesine dek iptal.
- Fiyat: merkez taban + hizmet bazlı oynama sınırı; şube yerel ayar yapar, paket içeriği sabit.
- Stok: perakende ve sarf malzeme ayrı; düşük stok uyarısı.