import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../src/lib/supabase';
import { useSession } from '../../src/hooks/useSession';
import { useTheme } from '../../src/theme/ThemeContext';
import { RaporModal } from '../../src/components/RaporModal';

// Panel kimliği: admin AYRI bir paneldir (merkez), yönetici/çalışan şube tarafı.
const PANEL_ADI: Record<string, string> = {
  admin: 'Admin Paneli',
  yonetici: 'Yönetici Paneli',
  calisan: 'Çalışan Paneli',
};

const ROL_ADLARI: Record<string, string> = {
  admin: 'Admin',
  yonetici: 'Yönetici',
  calisan: 'Çalışan',
};

export default function PanelScreen() {
  const { profile } = useSession();
  const { renkler } = useTheme();
  const router = useRouter();
  const [subeAd, setSubeAd] = useState<string | null>(null);
  const [bugunRandevu, setBugunRandevu] = useState(0);
  const [bekleyen, setBekleyen] = useState(0);
  const [dusukStok, setDusukStok] = useState(0);
  const [raporAcik, setRaporAcik] = useState(false);
  const rol = profile?.rol;
  const raporGoster = rol === 'admin' || rol === 'yonetici';
  // Ürün/sipariş/teklif yönetimi yalnızca yönetici (+admin). Çalışan görmez.
  const urunGoster = rol === 'yonetici';
  const siparisGoster = rol === 'yonetici' || rol === 'admin';
  const teklifGoster = rol === 'yonetici' || rol === 'admin';

  useFocusEffect(useCallback(() => {
    if (!profile) return;
    yukle();
  }, [profile?.id, profile?.branch_id]));

  async function yukle() {
    if (profile?.branch_id) {
      const { data } = await supabase
        .from('branches').select('ad').eq('id', profile.branch_id).single();
      setSubeAd(data?.ad ?? null);
    }

    // Bugünün randevuları (baslangic bugüne düşen, iptal-dışı). Admin tüm
    // şubeleri görür; şube filtresi varsa uygulanır.
    const bas = new Date(); bas.setHours(0, 0, 0, 0);
    const son = new Date(); son.setHours(23, 59, 59, 999);
    let randevuSorgu = supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .gte('baslangic', bas.toISOString())
      .lte('baslangic', son.toISOString())
      .neq('durum', 'iptal');
    if (profile?.branch_id) randevuSorgu = randevuSorgu.eq('branch_id', profile.branch_id);
    const { count: rcount } = await randevuSorgu;
    setBugunRandevu(rcount ?? 0);

    // Onay bekleyen randevular
    let bekSorgu = supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('durum', 'beklemede');
    if (profile?.branch_id) bekSorgu = bekSorgu.eq('branch_id', profile.branch_id);
    const { count: bcount } = await bekSorgu;
    setBekleyen(bcount ?? 0);

    // Düşük stok (ürün): sütun-sütun karşılaştırma PostgREST'te zor → azıcık veri
    // çekip JS'te say. Yalnız şubeli yönetici için anlamlı. (Sarf stoğu kaldırıldı;
    // tüm stok artık tek yerde — Ürünler sekmesi.)
    if (profile?.branch_id) {
      const { data: prods } = await supabase.from('products').select('stok, min_esik')
        .eq('branch_id', profile.branch_id).eq('silindi_mi', false);
      const dusuk = ((prods as { stok: number; min_esik: number }[]) ?? [])
        .filter(p => p.min_esik > 0 && p.stok <= p.min_esik).length;
      setDusukStok(dusuk);
    } else {
      setDusukStok(0);
    }
  }

  return (
    <ScrollView style={{ backgroundColor: renkler.bg }} contentContainerStyle={s.container}>
      <Text style={[s.panelAd, { color: renkler.primary }]}>
        {PANEL_ADI[rol ?? ''] ?? 'Panel'}
      </Text>
      <Text style={[s.selam, { color: renkler.text }]}>
        {profile?.ad_soyad ? `Merhaba, ${profile.ad_soyad.split(' ')[0]}` : 'Merhaba'}
      </Text>
      <Text style={[s.rol, { color: renkler.subtext }]}>
        {ROL_ADLARI[profile?.rol ?? ''] ?? ''}
        {subeAd ? ` · ${subeAd}` : profile?.rol === 'admin' ? ' · Tüm şubeler' : ''}
      </Text>

      <View style={s.kartRow}>
        <View style={[s.kart, { backgroundColor: renkler.card }]}>
          <Ionicons name="calendar-outline" size={22} color={renkler.primary} />
          <Text style={[s.sayi, { color: renkler.text }]}>{bugunRandevu}</Text>
          <Text style={[s.kartAlt, { color: renkler.subtext }]}>Bugünkü randevu</Text>
        </View>
        <View style={[s.kart, { backgroundColor: renkler.card }]}>
          <Ionicons name="hourglass-outline" size={22} color={renkler.primary} />
          <Text style={[s.sayi, { color: renkler.text }]}>{bekleyen}</Text>
          <Text style={[s.kartAlt, { color: renkler.subtext }]}>Onay bekleyen</Text>
        </View>
      </View>

      {raporGoster && (
        <TouchableOpacity
          style={[s.raporBtn, { backgroundColor: renkler.card }]}
          onPress={() => setRaporAcik(true)}
        >
          <Ionicons name="bar-chart-outline" size={24} color={renkler.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[s.raporBaslik, { color: renkler.text }]}>Raporlar</Text>
            <Text style={[s.raporAlt, { color: renkler.subtext }]}>
              Tarih aralığı seç, işleri gör, Excel'e aktar
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={renkler.subtext} />
        </TouchableOpacity>
      )}

      {urunGoster && dusukStok > 0 && (
        <View style={[s.uyariKart, { backgroundColor: renkler.rozetBg, borderColor: renkler.danger }]}>
          <Ionicons name="alert-circle" size={22} color={renkler.danger} />
          <Text style={[s.uyariText, { color: renkler.text }]}>
            {dusukStok} ürün düşük stokta — Ürünler sekmesinden kontrol et.
          </Text>
        </View>
      )}

      {siparisGoster && (
        <PanelKart
          ikon="receipt-outline" baslik="Siparişler"
          alt="Gelen ürün siparişlerini gör ve hazırla"
          renkler={renkler} onPress={() => router.push('/siparisler')}
        />
      )}
      {teklifGoster && (
        <PanelKart
          ikon="chatbubble-ellipses-outline" baslik="Hizmet Teklifleri"
          alt="Fiyatı araca göre değişen hizmet taleplerini takip et"
          renkler={renkler} onPress={() => router.push('/hizmet-teklifleri')}
        />
      )}
      {teklifGoster && (
        <PanelKart
          ikon="shield-checkmark-outline" baslik="Sigorta Teklifleri"
          alt="Kasko/trafik teklif taleplerini takip et"
          renkler={renkler} onPress={() => router.push('/teklifler')}
        />
      )}

      <RaporModal visible={raporAcik} onClose={() => setRaporAcik(false)} />
    </ScrollView>
  );
}

function PanelKart({
  ikon, baslik, alt, renkler, onPress,
}: {
  ikon: keyof typeof Ionicons.glyphMap;
  baslik: string;
  alt: string;
  renkler: { card: string; primary: string; text: string; subtext: string };
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={[s.raporBtn, { backgroundColor: renkler.card }]} onPress={onPress}>
      <Ionicons name={ikon} size={24} color={renkler.primary} />
      <View style={{ flex: 1 }}>
        <Text style={[s.raporBaslik, { color: renkler.text }]}>{baslik}</Text>
        <Text style={[s.raporAlt, { color: renkler.subtext }]}>{alt}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={renkler.subtext} />
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  container: { padding: 16, paddingBottom: 48 },
  panelAd: { fontSize: 13, fontWeight: '800', letterSpacing: 0.5, marginTop: 8, textTransform: 'uppercase' },
  selam: { fontSize: 22, fontWeight: '800', marginTop: 2 },
  rol: { fontSize: 14, marginTop: 4, marginBottom: 20 },
  kartRow: { flexDirection: 'row', gap: 12 },
  kart: { flex: 1, borderRadius: 12, padding: 16 },
  sayi: { fontSize: 28, fontWeight: '800', marginTop: 8 },
  kartAlt: { fontSize: 13, marginTop: 2 },
  raporBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 12, padding: 16, marginTop: 16,
  },
  raporBaslik: { fontSize: 16, fontWeight: '700' },
  raporAlt: { fontSize: 13, marginTop: 2 },
  uyariKart: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderRadius: 12, padding: 14, marginTop: 16,
  },
  uyariText: { flex: 1, fontSize: 14, fontWeight: '600' },
});
