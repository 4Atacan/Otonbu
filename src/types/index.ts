export type Rol = 'musteri' | 'sube_sahibi' | 'kasa' | 'usta' | 'admin';

export interface UserProfile {
  id: string;
  branch_id: string | null;
  telefon: string;       // KİŞİSEL VERİ
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
  marka_model: string | null;
  segment: string;
}
