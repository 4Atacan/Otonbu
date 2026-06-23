export type Rol = 'musteri' | 'sube_sahibi' | 'kasa' | 'usta' | 'admin';

// Bu roller yönetici paneline erişir (müşteri paneline de geçebilirler)
export const PERSONEL_ROLLER: Rol[] = ['admin', 'sube_sahibi', 'kasa', 'usta'];

export interface UserProfile {
  id: string;
  branch_id: string | null;
  email: string | null;    // KİŞİSEL VERİ (auth kanalı)
  telefon: string | null;  // KİŞİSEL VERİ (iletişim, opsiyonel)
  rol: Rol;
  ad_soyad: string | null; // KİŞİSEL VERİ
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

export interface Appointment {
  id: string;
  branch_id: string;
  user_id: string;
  vehicle_id: string;
  service_id: string;
  slot_id: string | null;     // (eski model — artık kullanılmıyor)
  baslangic: string | null;   // randevu başlangıç zamanı (timestamptz)
  durum: RandevuDurum;
  created_at: string;
  // PostgREST embed'leri (select '*, users(...), vehicles(...), ...')
  users?: { ad_soyad: string | null; telefon: string | null } | null;
  vehicles?: { plaka: string; marka: string | null; model: string | null } | null;
  services?: { ad: string; sure_dk?: number } | null;
  time_slots?: { baslangic: string } | null;
  branches?: { ad: string } | null;
  jobs?: Job[];
  appointment_changes?: AppointmentChange[];
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

export interface Campaign {
  id: string;
  branch_id: string | null;   // null = tüm şubelerde geçerli
  baslik: string;
  aciklama: string | null;
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
  aktif: boolean;
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

export interface Vehicle {
  id: string;
  user_id: string;
  plaka: string;         // KİŞİSEL VERİ
  arac_cinsi: string | null;   // sedan, suv, ... (arac-katalogu.ts)
  marka: string | null;
  model: string | null;
  segment: string;       // fiyatlama Faz 2+ kararı; formdan sorulmaz
  created_at: string;
}
