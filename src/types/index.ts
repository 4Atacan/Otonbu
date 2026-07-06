// Roller:
//   admin    — OTONBU merkez (tüm şubeler, katalog, paketler) → Admin Paneli
//   yonetici — şube yöneticisi (şube başına ÇOKLU; tam yönetim paneli)
//   calisan  — saha çalışanı (yalnız randevu + iş; kısıtlı panel)
//   musteri  — son kullanıcı
export type Rol = 'musteri' | 'yonetici' | 'calisan' | 'admin';

// Bu roller yönetim/çalışan paneline erişir (müşteri paneline de geçebilirler)
export const PERSONEL_ROLLER: Rol[] = ['admin', 'yonetici', 'calisan'];

// Tam yönetim yetkisi olan roller (sipariş/sigorta/ürün/fiyat/program, randevu
// onayı, çoklu personel atama). calisan bunlara giremez.
export const YONETICI_ROLLER: Rol[] = ['admin', 'yonetici'];

export interface UserProfile {
  id: string;
  branch_id: string | null;
  email: string | null;    // KİŞİSEL VERİ (auth kanalı)
  telefon: string | null;  // KİŞİSEL VERİ (iletişim, opsiyonel)
  rol: Rol;
  ad_soyad: string | null; // KİŞİSEL VERİ
  avatar_url: string | null; // KİŞİSEL VERİ (profil foto yolu — avatars bucket)
  silindi_mi: boolean;
  created_at: string;
}

export interface Branch {
  id: string;
  ad: string;
  adres: string | null;
  aktif: boolean;
}

// (Eski model — artık yazılmaz, geriye dönük uyumluluk için tip duruyor)
export interface TimeSlot {
  id: string;
  branch_id: string;
  baslangic: string;
  kapasite: number;
}

// Bir çalışma penceresi: ilk ve son randevu saati (HH:MM, yerel)
export interface CalismaPenceresi {
  bas: string;
  son: string;
}

// Randevu programı modu: 'saatli' = saat ızgarası, 'gunluk' = gün başına bırakma
export type ProgramMod = 'saatli' | 'gunluk';

// (Şube, hizmet) başına çalışma programı
export interface ServiceSchedule {
  id: string;
  branch_id: string;
  service_id: string;
  mod: ProgramMod;
  windows: CalismaPenceresi[];
  aralik_dk: number;
  kapasite: number;
  gun_sayisi: number;        // günlük modda işin kaç gün süreceği (1-30)
  gunler: number[] | null;   // ISO gün (1=Pzt..7=Paz); null = her gün
  updated_at: string;
}

export type RandevuDurum = 'beklemede' | 'onayli' | 'iptal';

// Randevu ödeme yöntemi: şubede (nakit/kart, teslimde) | online (iyzico, ileride)
export type OdemeYontemi = 'subede' | 'online' | 'puan';

export interface Appointment {
  id: string;
  branch_id: string;
  user_id: string;
  vehicle_id: string;
  service_id: string;
  slot_id: string | null;     // (eski model — artık kullanılmıyor)
  baslangic: string | null;   // randevu başlangıç zamanı (timestamptz)
  durum: RandevuDurum;
  odeme_yontemi: OdemeYontemi;
  odeme_alindi: boolean;        // şubede ödeme tahsil edildi mi (personel işaretler)
  created_at: string;
  // PostgREST embed'leri (select '*, users(...), vehicles(...), ...')
  users?: { ad_soyad: string | null; telefon: string | null; avatar_url?: string | null } | null;
  vehicles?: { plaka: string; marka: string | null; model: string | null } | null;
  services?: { ad: string; sure_dk?: number } | null;
  time_slots?: { baslangic: string } | null;
  branches?: { ad: string } | null;
  jobs?: Job[];
  orders?: DukkanSatisOzet[];   // bu randevuya yazılan dükkan satışları (hesap)
  appointment_changes?: AppointmentChange[];
}

// İşler ekranında randevuya bağlı dükkan satışı özeti (embed)
export interface DukkanSatisOzet {
  id: string;
  toplam: number;
  kaynak: 'uygulama' | 'dukkan';
  durum: string;
  order_items?: { ad: string; adet: number }[];
}

export type DegisiklikTip = 'iptal' | 'saat';
export type DegisiklikDurum = 'beklemede' | 'onaylandi' | 'reddedildi';

// Yönetici tarafından açılan randevu değişiklik talebi (müşteri onayı bekler)
export interface AppointmentChange {
  id: string;
  appointment_id: string;
  branch_id: string;
  tip: DegisiklikTip;
  yeni_slot_id: string | null;       // (eski model — artık kullanılmıyor)
  yeni_baslangic: string | null;     // saat değişikliği talebinde önerilen yeni zaman
  durum: DegisiklikDurum;
  olusturan: string | null;
  created_at: string;
  resolved_at: string | null;
}

export type IsDurum = 'basladi' | 'tamamlandi' | 'hazir';

export interface Job {
  id: string;
  appointment_id: string;
  assigned_to: string | null;
  durum: IsDurum;
  job_photos?: JobPhoto[];
  // İşler ekranı için randevu bilgisi embed'i
  appointments?: Appointment | null;
}

export interface JobPhoto {
  id: string;
  job_id: string;
  tip: 'once' | 'sonra';
  url: string;          // storage objesi yolu (signed URL ile gösterilir)
}

export interface BranchPrice {
  id: string;
  branch_id: string;
  service_id: string;
  segment: string;
  fiyat: number;
}

// musait_slotlar RPC çıktısı: programdan türetilen aday saat + doluluk
export interface MusaitSlot {
  baslangic: string;
  kapasite: number;
  dolu: number;
  mod: ProgramMod;     // 'saatli' = saat seç, 'gunluk' = tüm gün (tek slot)
  gun_sayisi: number;  // günlük modda işin kaç gün süreceği
}

// fiyat-hesapla Edge Function yanıtı
export interface FiyatSonuc {
  fiyat: number;
  segment: string;
  kaynak: 'taban' | 'sube';
  indirim_yuzde?: number;  // 'fiyat' kampanyası uygulandıysa > 0
}

// Kampanya mekaniği: ne sunuyor (abonelikten bağımsız — yalnız pazarlama/bilgi)
//   'duyuru' = sade banner, 'indirim' = % fiyat, 'puan' = ekstra puan, 'hediye' = yan fayda
export type KampanyaKategori = 'duyuru' | 'indirim' | 'puan' | 'hediye';

export interface Campaign {
  id: string;
  branch_id: string | null;   // null = tüm şubelerde geçerli
  baslik: string;
  aciklama: string | null;
  tip: KampanyaKategori;
  hizmet_id: string | null;   // bağlı hizmet (null = genel)
  urun_id: string | null;     // bağlı ürün (null = genel); hizmet_id ile birlikte tek hedef
  indirim_yuzde: number | null;  // tip='indirim'
  bonus_puan: number | null;     // tip='puan'
  hediye: string | null;         // tip='hediye' (örn. "Cam suyu hediye")
  gorsel: string | null;         // campaign-images bucket'ındaki obje yolu
  baslangic: string | null;
  bitis: string | null;
  aktif: boolean;
  created_at: string;
}

// Hizmet bazlı kampanya tipi: 'yildiz' = öne çıkan, 'fiyat' = yüzde indirim
export type KampanyaTip = 'yildiz' | 'fiyat';

export interface Service {
  id: string;
  ad: string;
  kategori: string;
  taban_fiyat: number;
  oynama_orani: number;
  // Segment başına marka tabanı: { kucuk: 600, buyuk: 700 }. Boşsa taban_fiyat geçerli.
  segment_fiyatlari: Record<string, number>;
  aciklama: string | null;     // "bu hizmette neler yapıyoruz"
  gorsel: string | null;       // service-images bucket'ındaki obje yolu
  sure_dk: number;             // (eski model — artık randevu/slot mantığında kullanılmıyor)
  kampanya_tip: KampanyaTip | null;
  kampanya_indirim_yuzde: number | null;  // yalnızca kampanya_tip = 'fiyat'
  teklif_usulu: boolean;       // true = sabit fiyat yok; randevu yerine teklif talebi (service_quotes)
  puan: number;                // bu hizmet tamamlanınca kazandırılan sadakat puanı
  puan_bedeli: number;         // bu hizmet kaç puana alınabilir (0 = puanla alınamaz)
  aktif: boolean;
}

// Hizmet teklif talebi (teklif_usulu hizmetler için — sigorta talebiyle aynı akış).
// durum değerleri SigortaDurum ile aynı (yeni → arandi → teklif_verildi → kapandi).
export interface ServiceQuote {
  id: string;
  branch_id: string;
  user_id: string;
  service_id: string;
  vehicle_id: string | null;
  ad_soyad: string | null;   // KİŞİSEL VERİ
  telefon: string | null;    // KİŞİSEL VERİ
  plaka: string | null;      // KİŞİSEL VERİ
  arac_detay: string | null;
  musteri_not: string | null;
  durum: SigortaDurum;
  kvkk_riza_at: string | null;
  ticari_ileti_izni: boolean;
  silindi_mi: boolean;
  created_at: string;
  services?: { ad: string } | null;   // embed
  branches?: { ad: string } | null;   // embed
}

// --- Faz 3: Abonelik + paket ---
export type PlanKademe = 'temel' | 'orta' | 'ust';

export interface PlanHak {
  id: string;
  plan_id: string;
  service_id: string;
  aylik_adet: number;
  services?: { ad: string } | null;  // embed
}

export interface Plan {
  id: string;
  ad: string;
  kademe: PlanKademe;
  aylik_ucret: number;
  aciklama: string | null;
  aktif: boolean;
  plan_haklari?: PlanHak[];          // embed
}

export type AbonelikDurum = 'beklemede' | 'aktif' | 'yenilenen' | 'iptal';

export interface Subscription {
  id: string;
  user_id: string;
  branch_id: string;
  plan_id: string;
  durum: AbonelikDurum;
  baslangic: string;
  silindi_mi: boolean;
  created_at: string;
  plans?: Plan | null;               // embed
  branches?: { ad: string } | null;  // embed
}

export interface Entitlement {
  id: string;
  subscription_id: string;
  service_id: string;
  kalan_adet: number;
  donem: string;                     // ayın ilk günü (YYYY-MM-DD)
  services?: { ad: string } | null;  // embed
}

// Uygulama içi bildirim (notifications tablosu; RN'in Notification tipiyle
// çakışmasın diye App öneki)
export interface AppNotification {
  id: string;
  user_id: string;
  baslik: string;
  govde: string;
  ref: string | null;      // 'randevu:<id>', 'siparis:<id>' ... (yönlendirme)
  okundu_mu: boolean;
  created_at: string;
}

export interface Vehicle {
  id: string;
  user_id: string;
  plaka: string;         // KİŞİSEL VERİ
  arac_cinsi: string | null;   // sedan, suv, ... (arac-katalogu.ts)
  marka: string | null;
  model: string | null;
  segment: string;       // fiyatlama Faz 2+ kararı; formdan sorulmaz
  silindi_mi: boolean;   // soft delete (randevulu araç hard silinemez, FK)
  created_at: string;
}

// --- Mağaza: şube bazlı perakende ürün + sipariş ---
export interface Product {
  id: string;
  branch_id: string;
  ad: string;
  kategori: string | null;
  aciklama: string | null;
  fiyat: number;
  stok: number;
  min_esik: number;             // düşük stok eşiği (stok <= min_esik & >0 → uyarı)
  gorsel: string | null;        // product-images bucket'ındaki obje yolu
  one_cikan: boolean;           // manuel "öne çıkar" rozeti
  satis_adedi: number;          // otomatik sayaç (çok satan sıralama)
  puan: number;                 // bu ürün alınınca kazandırılan sadakat puanı
  puan_bedeli: number;          // bu ürün kaç puana alınabilir (0 = puanla alınamaz)
  aktif: boolean;
  silindi_mi: boolean;
  created_at: string;
}

// Sarf / iç malzeme stoğu (müşteriye satılmaz; serviste kullanılır)
export interface StockItem {
  id: string;
  branch_id: string;
  ad: string;
  tip: 'sarf' | 'perakende';
  miktar: number;
  min_esik: number;
  birim: string | null;
  created_at: string;
}

export type SiparisDurum = 'talep' | 'hazirlaniyor' | 'hazir' | 'teslim' | 'iptal';

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  ad: string;            // sipariş anındaki ürün adı (snapshot)
  adet: number;
  birim_fiyat: number;
}

export interface Order {
  id: string;
  branch_id: string;
  user_id: string;
  appointment_id: string | null;
  durum: SiparisDurum;
  toplam: number;
  musteri_not: string | null;
  silindi_mi: boolean;
  created_at: string;
  order_items?: OrderItem[];          // embed
  branches?: { ad: string } | null;   // embed
  users?: { ad_soyad: string | null; telefon: string | null } | null;  // embed
}

// --- Sigorta teklif talebi ---
export type SigortaTip = 'trafik' | 'kasko';
export type SigortaDurum = 'yeni' | 'arandi' | 'teklif_verildi' | 'kapandi';

export interface InsuranceRequest {
  id: string;
  branch_id: string | null;
  user_id: string;
  vehicle_id: string | null;
  tip: SigortaTip;
  ad_soyad: string | null;   // KİŞİSEL VERİ
  telefon: string | null;    // KİŞİSEL VERİ
  plaka: string | null;      // KİŞİSEL VERİ
  arac_detay: string | null;
  ruhsat_url: string | null;  // KİŞİSEL VERİ (kasko ruhsatı, vehicle-docs private bucket)
  musteri_not: string | null;
  durum: SigortaDurum;
  kvkk_riza_at: string | null;
  ticari_ileti_izni: boolean;
  silindi_mi: boolean;
  created_at: string;
  branches?: { ad: string } | null;  // embed
}
