import { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, SectionList,
  TouchableOpacity, ImageBackground,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../src/lib/supabase';
import { useTheme } from '../../src/theme/ThemeContext';
import { Service, Campaign } from '../../src/types';
import { fiyatMetni, gorselUrl, indirimliMetni } from '../../src/lib/hizmet';
import { Logo } from '../../src/components/Logo';
import { Yukleniyor } from '../../src/components/Yukleniyor';

export default function AnaSayfa() {
  const { renkler } = useTheme();
  const router = useRouter();
  const [hizmetler, setHizmetler] = useState<Service[]>([]);
  const [kampanyalar, setKampanyalar] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    supabase
      .from('services')
      .select('*')
      .eq('aktif', true)
      .order('kategori')
      .order('ad')
      .then(({ data, error }) => {
        if (!error && data) setHizmetler(data as Service[]);
        setLoading(false);
      });

    // Aktif + tarihi geçmemiş kampanyalar (bitis NULL = süresiz). Kampanya
    // sekmesi kaldırıldı; varsa ana sayfada "Kampanyalar" başlığı altında çıkar.
    const bugun = new Date().toISOString().slice(0, 10);
    supabase
      .from('campaigns')
      .select('*')
      .eq('aktif', true)
      .or(`bitis.is.null,bitis.gte.${bugun}`)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) setKampanyalar(data as Campaign[]);
      });
  }, []));

  // Kategori bazlı gruplama
  const sections = Object.entries(
    hizmetler.reduce<Record<string, Service[]>>((acc, h) => {
      if (!acc[h.kategori]) acc[h.kategori] = [];
      acc[h.kategori].push(h);
      return acc;
    }, {})
  ).map(([title, data]) => ({ title, data }));

  function tarihAraligi(k: Campaign): string | null {
    const fmt = (d: string) => new Date(d).toLocaleDateString('tr-TR');
    if (k.baslangic && k.bitis) return `${fmt(k.baslangic)} – ${fmt(k.bitis)}`;
    if (k.bitis) return `Son gün: ${fmt(k.bitis)}`;
    return null;
  }

  if (loading) return <Yukleniyor />;

  return (
    <View style={[s.container, { backgroundColor: renkler.bg }]}>
      <SectionList
        sections={sections}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingBottom: 24 }}
        ListHeaderComponent={
          <View style={s.hosgeldin}>
            <View style={s.logoKutu}>
              <Logo width={180} />
            </View>
            <Text style={[s.altSelam, { color: renkler.subtext }]}>
              Aracın için bir hizmet seç
            </Text>

            {/* Abonelik / paketler girişi */}
            <TouchableOpacity
              activeOpacity={0.85}
              style={[s.paketBanner, { backgroundColor: renkler.primary }]}
              onPress={() => router.push('/abonelik')}
            >
              <Ionicons name="ticket" size={22} color={renkler.primaryText} />
              <View style={s.paketBannerMetin}>
                <Text style={[s.paketBannerBaslik, { color: renkler.primaryText }]}>
                  Paketler & Abonelik
                </Text>
                <Text style={[s.paketBannerAlt, { color: renkler.primaryText }]}>
                  Aylık bakım haklarıyla tasarruf et
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={renkler.primaryText} />
            </TouchableOpacity>

            {kampanyalar.length > 0 && (
              <View style={s.kampanyaBolum}>
                <Text style={[s.kategori, s.kampanyaBaslik, { color: renkler.subtext }]}>
                  KAMPANYALAR
                </Text>
                {kampanyalar.map(k => (
                  <View key={k.id} style={[s.kampanyaKart, { backgroundColor: renkler.card }]}>
                    <Text style={[s.kampanyaBaslikText, { color: renkler.text }]}>{k.baslik}</Text>
                    {k.aciklama && (
                      <Text style={[s.kampanyaAciklama, { color: renkler.subtext }]}>
                        {k.aciklama}
                      </Text>
                    )}
                    {tarihAraligi(k) && (
                      <View style={[s.kampanyaRozet, { backgroundColor: renkler.rozetBg }]}>
                        <Text style={[s.kampanyaRozetText, { color: renkler.primary }]}>
                          {tarihAraligi(k)}
                        </Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={s.bosKutu}>
            <Text style={[s.bos, { color: renkler.subtext }]}>
              Hizmetler çok yakında burada olacak.
            </Text>
          </View>
        }
        renderSectionHeader={({ section }) => (
          <Text style={[s.kategori, { color: renkler.subtext }]}>
            {section.title.toUpperCase()}
          </Text>
        )}
        renderItem={({ item }) => {
          const uri = gorselUrl(item.gorsel);
          const indirimli = indirimliMetni(item);
          const yildiz = item.kampanya_tip === 'yildiz';
          return (
            <TouchableOpacity
              activeOpacity={0.85}
              style={s.kart}
              onPress={() => router.push({
                pathname: '/hizmet-detay',
                params: { serviceId: item.id },
              })}
            >
              <ImageBackground
                source={uri ? { uri } : undefined}
                style={[s.gorsel, { backgroundColor: renkler.card }]}
                imageStyle={s.gorselRadius}
              >
                {!uri && (
                  <View style={s.gorselBos}>
                    <Ionicons name="car-sport-outline" size={40} color={renkler.subtext} />
                  </View>
                )}
                {/* Kampanya rozeti — yıldız (öne çıkan) veya yüzde indirim */}
                {item.kampanya_tip && (
                  <View style={[s.kampanyaEtiket, { backgroundColor: yildiz ? '#f59e0b' : '#dc2626' }]}>
                    <Ionicons name={yildiz ? 'star' : 'pricetag'} size={12} color="#fff" />
                    <Text style={s.kampanyaEtiketText}>
                      {yildiz ? 'Öne çıkan' : `%${item.kampanya_indirim_yuzde} indirim`}
                    </Text>
                  </View>
                )}
                {/* Okunabilirlik için alt karartma */}
                <View style={s.altKaplama} />
                <View style={s.kartIcerik}>
                  <Text style={s.ad} numberOfLines={1}>{item.ad}</Text>
                  <View style={s.altSatir}>
                    {indirimli ? (
                      <View style={s.fiyatGrup}>
                        <Text style={[s.fiyat, s.fiyatEski]}>{fiyatMetni(item)}</Text>
                        <Text style={s.fiyat}>{indirimli}</Text>
                      </View>
                    ) : (
                      <Text style={s.fiyat}>{fiyatMetni(item)}</Text>
                    )}
                    <View style={[s.detayRozet, { backgroundColor: renkler.primary }]}>
                      <Text style={[s.detayRozetText, { color: renkler.primaryText }]}>Detay</Text>
                      <Ionicons name="chevron-forward" size={14} color={renkler.primaryText} />
                    </View>
                  </View>
                </View>
              </ImageBackground>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  hosgeldin: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 },
  logoKutu: { alignItems: 'center', paddingTop: 4, paddingBottom: 8 },
  altSelam: { fontSize: 14, marginTop: 4, textAlign: 'center' },
  paketBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 12, padding: 14, marginTop: 14,
  },
  paketBannerMetin: { flex: 1 },
  paketBannerBaslik: { fontSize: 15, fontWeight: '800' },
  paketBannerAlt: { fontSize: 12, marginTop: 2, opacity: 0.9 },
  kampanyaBolum: { marginTop: 8 },
  kampanyaBaslik: { paddingHorizontal: 0 },
  kampanyaKart: {
    padding: 16, borderRadius: 12, marginBottom: 10,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  kampanyaBaslikText: { fontSize: 16, fontWeight: '700' },
  kampanyaAciklama: { fontSize: 14, marginTop: 6, lineHeight: 20 },
  kampanyaRozet: {
    alignSelf: 'flex-start', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 4, marginTop: 10,
  },
  kampanyaRozetText: { fontSize: 12, fontWeight: '600' },
  bosKutu: { paddingTop: 48, alignItems: 'center' },
  bos: { fontSize: 15, textAlign: 'center', paddingHorizontal: 32, lineHeight: 22 },
  kategori: {
    fontSize: 11, fontWeight: '700',
    paddingHorizontal: 16, paddingTop: 20, paddingBottom: 6,
    letterSpacing: 1,
  },
  kart: { marginHorizontal: 12, marginBottom: 12, borderRadius: 14 },
  gorsel: { height: 170, borderRadius: 14, justifyContent: 'flex-end', overflow: 'hidden' },
  gorselRadius: { borderRadius: 14 },
  gorselBos: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  altKaplama: {
    ...StyleSheet.absoluteFillObject,
    top: '55%', borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  kartIcerik: { padding: 14 },
  ad: { fontSize: 19, fontWeight: '800', color: '#fff' },
  altSatir: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginTop: 6,
  },
  fiyat: { fontSize: 15, fontWeight: '700', color: '#fff' },
  fiyatGrup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fiyatEski: { textDecorationLine: 'line-through', opacity: 0.7, fontWeight: '600' },
  kampanyaEtiket: {
    position: 'absolute', top: 10, left: 10,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8,
  },
  kampanyaEtiketText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  detayRozet: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    paddingVertical: 5, paddingHorizontal: 10, borderRadius: 16,
  },
  detayRozetText: { fontSize: 13, fontWeight: '700' },
});
