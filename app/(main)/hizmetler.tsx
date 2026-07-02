import { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ImageBackground,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../src/lib/supabase';
import { useTheme } from '../../src/theme/ThemeContext';
import { Service } from '../../src/types';
import { fiyatMetni, gorselUrl, indirimliMetni } from '../../src/lib/hizmet';
import { kampanyaPuanHaritasi } from '../../src/lib/kampanya';
import { Yukleniyor } from '../../src/components/Yukleniyor';
import { PuanLogo } from '../../src/components/PuanLogo';

// Kategori anahtarı → görünen ad (bilinmeyen için baş harf büyük)
const KATEGORI_AD: Record<string, string> = {
  yikama: 'Yıkama', kaplama: 'Kaplama', pasta: 'Pasta & Cila',
  detailing: 'Detailing', ppf: 'PPF', seramik: 'Seramik',
  boya: 'Boya Koruma', ic: 'İç Temizlik',
};
function katAd(k: string): string {
  return KATEGORI_AD[k] ?? k.charAt(0).toLocaleUpperCase('tr-TR') + k.slice(1);
}

// Müşteri "Hizmetler" sekmesi: kategori filtreli 2 sütun hizmet katalogu.
// (Eskiden ana sayfanın alt kısmıydı; ayrı sekmeye taşındı.)
export default function HizmetlerSekmesi() {
  const { renkler } = useTheme();
  const router = useRouter();
  const [hizmetler, setHizmetler] = useState<Service[]>([]);
  // service_id → aktif 'puan' kampanyasının ekstra bonus puanı (toplam gösterimi için)
  const [puanBonus, setPuanBonus] = useState<Record<string, number>>({});
  const [kategori, setKategori] = useState<string>('hepsi');
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    let iptal = false;
    Promise.all([
      supabase.from('services').select('*').eq('aktif', true).order('kategori').order('ad'),
      kampanyaPuanHaritasi(),
    ]).then(([{ data }, puanHarita]) => {
      if (iptal) return;
      setHizmetler((data as Service[]) ?? []);
      setPuanBonus(puanHarita);
      setLoading(false);
    });
    return () => { iptal = true; };
  }, []));

  if (loading) return <Yukleniyor />;

  const kategoriler = Array.from(new Set(hizmetler.map(h => h.kategori)));
  const gosterilen = kategori === 'hepsi'
    ? hizmetler
    : hizmetler.filter(h => h.kategori === kategori);

  return (
    <View style={[s.container, { backgroundColor: renkler.bg }]}>
      <ScrollView
        contentContainerStyle={{ paddingTop: 14, paddingBottom: 28 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[s.baslik, { color: renkler.text }]}>Hizmetler</Text>

        {kategoriler.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.cipSerit}
          >
            {['hepsi', ...kategoriler].map(k => {
              const aktif = kategori === k;
              return (
                <TouchableOpacity
                  key={k}
                  onPress={() => setKategori(k)}
                  style={[
                    s.cip,
                    { backgroundColor: aktif ? renkler.primary : renkler.card, borderColor: aktif ? renkler.primary : renkler.border },
                  ]}
                >
                  <Text style={[s.cipText, { color: aktif ? renkler.primaryText : renkler.text }]}>
                    {k === 'hepsi' ? 'Tümü' : katAd(k)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {gosterilen.length === 0 ? (
          <View style={s.bosKutu}>
            <Ionicons name="car-sport-outline" size={44} color={renkler.subtext} />
            <Text style={[s.bos, { color: renkler.subtext }]}>
              Hizmetler çok yakında burada olacak.
            </Text>
          </View>
        ) : (
          <View style={s.grid}>
            {gosterilen.map(item => {
              const uri = gorselUrl(item.gorsel);
              const indirimli = indirimliMetni(item);
              const yildiz = item.kampanya_tip === 'yildiz';
              const bonus = puanBonus[item.id] ?? 0;
              const toplamPuan = item.puan + bonus;
              return (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.85}
                  style={[s.hizmetKart, { backgroundColor: renkler.card }]}
                  onPress={() => router.push({
                    pathname: '/hizmet-detay',
                    params: { serviceId: item.id },
                  })}
                >
                  <ImageBackground
                    source={uri ? { uri } : undefined}
                    style={[s.hizmetGorsel, { backgroundColor: renkler.rozetBg }]}
                  >
                    {!uri && (
                      <View style={s.hizmetGorselBos}>
                        <Ionicons name="car-sport-outline" size={34} color={renkler.subtext} />
                      </View>
                    )}
                    {item.kampanya_tip && (
                      <View style={[s.hizmetEtiket, { backgroundColor: yildiz ? '#f59e0b' : renkler.danger }]}>
                        <Ionicons name={yildiz ? 'star' : 'pricetag'} size={11} color="#fff" />
                        <Text style={s.hizmetEtiketText}>
                          {yildiz ? 'Öne çıkan' : `%${item.kampanya_indirim_yuzde}`}
                        </Text>
                      </View>
                    )}
                    {/* Sol üst: kazandıracağı OTONBU Puanı. Kampanya bonusu varsa
                        TOPLAM puanı "+" ile ve accent renkte göster (öne çıksın). */}
                    {toplamPuan > 0 && (
                      <View style={[
                        s.puanRozet,
                        { backgroundColor: renkler.card },
                        bonus > 0 && { borderWidth: 1.5, borderColor: renkler.accent },
                      ]}>
                        <PuanLogo size={13} renk={bonus > 0 ? renkler.accent : renkler.primary} />
                        <Text style={[s.puanRozetText, { color: bonus > 0 ? renkler.accent : renkler.primary }]}>
                          {bonus > 0 ? `+${toplamPuan}` : item.puan}
                        </Text>
                      </View>
                    )}
                  </ImageBackground>
                  <View style={s.hizmetBody}>
                    <Text style={[s.hizmetAd, { color: renkler.text }]} numberOfLines={2}>
                      {item.ad}
                    </Text>
                    {item.teklif_usulu ? (
                      <View style={s.teklifChip}>
                        <Ionicons name="chatbubble-ellipses-outline" size={13} color={renkler.accent} />
                        <Text style={[s.teklifChipText, { color: renkler.accent }]}>Teklif al</Text>
                      </View>
                    ) : indirimli ? (
                      <View style={s.fiyatGrup}>
                        <Text style={[s.fiyatEski, { color: renkler.subtext }]}>{fiyatMetni(item)}</Text>
                        <Text style={[s.fiyat, { color: renkler.primary }]}>{indirimli}</Text>
                      </View>
                    ) : (
                      <Text style={[s.fiyat, { color: renkler.primary }]}>{fiyatMetni(item)}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  baslik: { fontSize: 26, fontWeight: '800', paddingHorizontal: 16, marginBottom: 14 },
  cipSerit: { paddingHorizontal: 16, gap: 8, paddingBottom: 16 },
  cip: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  cipText: { fontSize: 13, fontWeight: '700' },
  grid: { paddingHorizontal: 16 },
  // Tek sütun, 16:9 geniş kapak
  hizmetKart: { width: '100%', borderRadius: 16, marginBottom: 14, overflow: 'hidden' },
  hizmetGorsel: { width: '100%', aspectRatio: 16 / 9, justifyContent: 'flex-start' },
  hizmetGorselBos: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  // Kampanya etiketi sağ üste alındı; sol üst puan rozetine bırakıldı.
  hizmetEtiket: {
    position: 'absolute', top: 8, right: 8,
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingVertical: 3, paddingHorizontal: 7, borderRadius: 8,
  },
  hizmetEtiketText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  puanRozet: {
    position: 'absolute', top: 8, left: 8,
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingVertical: 3, paddingHorizontal: 7, borderRadius: 8,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 }, elevation: 2,
  },
  puanRozetText: { fontSize: 12, fontWeight: '800' },
  hizmetBody: { padding: 11 },
  hizmetAd: { fontSize: 15, fontWeight: '700', minHeight: 38 },
  fiyat: { fontSize: 15, fontWeight: '800', marginTop: 4 },
  fiyatGrup: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 4 },
  fiyatEski: { fontSize: 12, fontWeight: '600', textDecorationLine: 'line-through' },
  teklifChip: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 },
  teklifChipText: { fontSize: 13, fontWeight: '700' },
  bosKutu: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  bos: { fontSize: 15, textAlign: 'center', marginTop: 14, lineHeight: 22 },
});
