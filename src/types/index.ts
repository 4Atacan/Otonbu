export type Rol = 'musteri' | 'sube_sahibi' | 'kasa' | 'usta' | 'admin';

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

export interface TimeSlot {
  id: string;
  branch_id: string;
  baslangic: string;
  kapasite: number;
}

export type RandevuDurum = 'beklemede' | 'onayli' | 'iptal';

export interface Appointment {
  id: string;
  branch_id: string;
  user_id: string;
  vehicle_id: string;
  service_id: string;
  slot_id: string | null;
  durum: RandevuDurum;
  created_at: string;
  // PostgREST embed'leri (select '*, users(...), vehicles(...), ...')
  users?: { ad_soyad: string | null; telefon: string | null } | null;
  vehicles?: { plaka: string; marka: string | null; model: string | null } | null;
  services?: { ad: string } | null;
  time_slots?: { baslangic: string } | null;
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

export interface Service {
  id: string;
  ad: string;
  kategori: string;
  taban_fiyat: number;
  oynama_orani: number;
  aktif: boolean;
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
