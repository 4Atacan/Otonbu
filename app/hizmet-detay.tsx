import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Image, Pressable, ScrollView, StyleSheet,
  Text, TouchableOpacity, View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../src/lib/supabase';
import { useTheme } from '../src/theme/ThemeContext';
import { Service } from '../src/types';
import { fiyatAraligi, fiyatMetni, gorselUrl } from '../src/lib/hizmet';
import { indirimliFiyat } from '../src/lib/kampanya';
import { Yukleniyor } from '../src/components/Yukleniyor';

const tl = (n: number) =>
  n.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 });

export default function HizmetDetayScreen() {
  const { serviceId } = useLocalSearchParams<{ serviceId: string }>();
  const { renkler } = useTheme();
  const router = useRouter();

  const [hizmet, setHizmet] = useState<Service | null>(null);
  const [kampInd, setKampInd] = useState(0);  // bu hizmete bağlı aktif kampanya indirimi %
  const [loading, setLoading] = useState(true);
  const [fiyatNotAcik, setFiyatNotAcik] = useState(false);

  useEffect(() => {
    if (!serviceId) { setLoading(false); return; }
    supabase
      .from('services')
      .select('*')
      .eq('id', serviceId)
      .maybeSingle()
      .then(({ data }) => {
        setHizmet((data as Service) ?? null);
        setLoading(false);
      });
    // Kampanya indirimi (tek doğruluk kaynağı SQL kampanya_indirim).
    supabase.rpc('kampanya_indirim', { p_hizmet: serviceId, p_urun: null })
      .then(({ data }) => setKampInd(Number(data ?? 0)));
  }, [serviceId]);

  // useMemo: her render'da yeni nesne <Stack.Screen options>'ı sürekli
  // tetiklemesin (randevu-al'daki sonsuz döngü dersi).
  const headerOpts = useMemo(() => ({
    title: hizmet?.ad ?? 'Hizmet',
    headerShown: true,
    headerStyle: { backgroundColor: renkler.card },
    headerTitleStyle: { color: renkler.text },
    headerTintColor: renkler.primary,
    headerShadowVisible: false,
  }), [hizmet?.ad, renkler]);

  const uri = hizmet ? gorselUrl(hizmet.gorsel) : null;

  return (
    <>
      <Stack.Screen options={headerOpts} />
      <View style={[s.container, { backgroundColor: renkler.bg }]}>
        {loading ? (
          <Yukleniyor />
        ) : !hizmet ? (
          <View style={s.ortala}>
            <Text style={[s.bos, { color: renkler.subtext }]}>Hizmet bulunamadı.</Text>
          </View>
        ) : (
          <>
            <ScrollView contentContainerStyle={s.icerik}>
              {uri ? (
                <Image source={{ uri }} style={s.gorsel} resizeMode="cover" />
              ) : (
                <View style={[s.gorsel, s.gorselBos, { backgroundColor: renkler.card }]}>
                  <Ionicons name="car-sport-outline" size={56} color={renkler.subtext} />
                </View>
              )}

              <View style={s.govde}>
                <Text style={[s.kategori, { color: renkler.subtext }]}>
                  {hizmet.kategori.toUpperCase()}
                </Text>
                <Text style={[s.ad, { color: renkler.text }]}>{hizmet.ad}</Text>

                {hizmet.teklif_usulu ? (
                  <View style={[s.fiyatKutu, { backgroundColor: renkler.card }]}>
                    <View style={s.teklifBasSatir}>
                      <Ionicons name="chatbubble-ellipses-outline" size={18} color={renkler.accent} />
                      <Text style={[s.teklifBaslik, { color: renkler.text }]}>Araca özel fiyat</Text>
                    </View>
                    <Text style={[s.fiyatNot, { color: renkler.subtext }]}>
                      Bu hizmette fiyat aracına göre değişir. Bilgilerini bırak, en uygun
                      teklifi hazırlayıp sana dönelim.
                    </Text>
                  </View>
                ) : (
                  <View style={[s.fiyatKutu, { backgroundColor: renkler.card }]}>
                    <Pressable
                      style={s.fiyatBasSatir}
                      onPress={() => setFiyatNotAcik(a => !a)}
                      hitSlop={6}
                    >
                      <Text style={[s.fiyatLabel, { color: renkler.subtext }]}>Fiyat</Text>
                      <Ionicons
                        name={fiyatNotAcik ? 'information-circle' : 'information-circle-outline'}
                        size={16}
                        color={renkler.subtext}
                      />
                    </Pressable>
                    {(() => {
                      // Hizmetin kendi 'fiyat' kampanyası + bağlı kampanya indirimi → büyük olan (stacklemez).
                      const ownPct = hizmet.kampanya_tip === 'fiyat' ? (hizmet.kampanya_indirim_yuzde ?? 0) : 0;
                      const effPct = Math.max(ownPct, kampInd);
                      if (effPct <= 0) {
                        return <Text style={[s.fiyat, { color: renkler.primary }]}>{fiyatMetni(hizmet)}</Text>;
                      }
                      const { min, max, tekil } = fiyatAraligi(hizmet);
                      const dMin = indirimliFiyat(min, effPct);
                      const dMax = indirimliFiyat(max, effPct);
                      const indMetni = tekil ? tl(dMin) : `${tl(dMin)} – ${tl(dMax)}`;
                      return (
                        <View style={s.fiyatSatir}>
                          <Text style={[s.fiyatEski, { color: renkler.subtext }]}>{fiyatMetni(hizmet)}</Text>
                          <Text style={[s.fiyat, { color: renkler.primary }]}>{indMetni}</Text>
                          <View style={s.indirimRozet}>
                            <Text style={s.indirimRozetText}>%{effPct} indirim</Text>
                          </View>
                        </View>
                      );
                    })()}
                    {fiyatNotAcik && (
                      <Text style={[s.fiyatNot, { color: renkler.subtext }]}>
                        Araç boyutuna göre değişir · kesin fiyat aracını seçince
                      </Text>
                    )}
                  </View>
                )}

                <Text style={[s.baslik, { color: renkler.text }]}>Bu hizmette neler yapıyoruz?</Text>
                <Text style={[s.aciklama, { color: renkler.subtext }]}>
                  {hizmet.aciklama?.trim()
                    ? hizmet.aciklama
                    : 'Bu hizmet için henüz açıklama eklenmedi.'}
                </Text>
              </View>
            </ScrollView>

            <View style={[s.altBar, { backgroundColor: renkler.card, borderColor: renkler.border }]}>
              <TouchableOpacity
                style={[s.randevuBtn, { backgroundColor: renkler.primary }]}
                onPress={() => router.push({
                  pathname: hizmet.teklif_usulu ? '/teklif-al' : '/randevu-al',
                  params: { serviceId: hizmet.id, serviceAd: hizmet.ad },
                })}
              >
                <Text style={[s.randevuText, { color: renkler.primaryText }]}>
                  {hizmet.teklif_usulu ? 'Teklif Al' : 'Randevu Al'}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  ortala: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  bos: { fontSize: 15 },
  icerik: { paddingBottom: 24 },
  gorsel: { width: '100%', height: 220 },
  gorselBos: { alignItems: 'center', justifyContent: 'center' },
  govde: { padding: 16 },
  kategori: { fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  ad: { fontSize: 24, fontWeight: '800', marginTop: 4 },
  fiyatKutu: { borderRadius: 12, padding: 16, marginTop: 16 },
  fiyatBasSatir: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  fiyatLabel: { fontSize: 13 },
  fiyatSatir: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2, flexWrap: 'wrap' },
  fiyatEski: { fontSize: 16, fontWeight: '600', textDecorationLine: 'line-through' },
  indirimRozet: { backgroundColor: '#dc2626', borderRadius: 6, paddingVertical: 2, paddingHorizontal: 8 },
  indirimRozetText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  fiyat: { fontSize: 22, fontWeight: '800', marginTop: 2 },
  fiyatNot: { fontSize: 12, marginTop: 6, lineHeight: 17 },
  teklifBasSatir: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  teklifBaslik: { fontSize: 17, fontWeight: '800' },
  baslik: { fontSize: 17, fontWeight: '700', marginTop: 24, marginBottom: 8 },
  aciklama: { fontSize: 15, lineHeight: 23 },
  altBar: { borderTopWidth: 1, padding: 16, paddingBottom: 28 },
  randevuBtn: { borderRadius: 12, padding: 16, alignItems: 'center' },
  randevuText: { fontSize: 16, fontWeight: '700' },
});
