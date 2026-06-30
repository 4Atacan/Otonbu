import { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Dimensions,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../src/lib/supabase';
import { useTheme } from '../../src/theme/ThemeContext';
import { Campaign } from '../../src/types';
import { KampanyaKart } from '../../src/components/KampanyaKart';
import { Yukleniyor } from '../../src/components/Yukleniyor';

const GENISLIK = Dimensions.get('window').width - 32;  // 16px kenar boşluğu

// Müşteri "Kampanyalar" sekmesi: aktif kampanyaların büyük banner listesi.
// İndirim/puan kampanyası bağlı bir hizmete dokununca o hizmetin detayına gider.
export default function KampanyalarSekmesi() {
  const { renkler } = useTheme();
  const router = useRouter();
  const [kampanyalar, setKampanyalar] = useState<Campaign[]>([]);
  const [hizmetAd, setHizmetAd] = useState<Record<string, string>>({});
  const [urun, setUrun] = useState<Record<string, { ad: string; branch_id: string }>>({});
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    let iptal = false;
    const bugun = new Date().toISOString().slice(0, 10);
    Promise.all([
      supabase.from('campaigns').select('*').eq('aktif', true)
        .or(`bitis.is.null,bitis.gte.${bugun}`).order('created_at', { ascending: false }),
      supabase.from('services').select('id, ad'),
      supabase.from('products').select('id, ad, branch_id').eq('silindi_mi', false),
    ]).then(([kampRes, hizRes, urunRes]) => {
      if (iptal) return;
      setKampanyalar((kampRes.data as Campaign[]) ?? []);
      const h: Record<string, string> = {};
      ((hizRes.data as { id: string; ad: string }[]) ?? []).forEach(x => { h[x.id] = x.ad; });
      setHizmetAd(h);
      const u: Record<string, { ad: string; branch_id: string }> = {};
      ((urunRes.data as { id: string; ad: string; branch_id: string }[]) ?? [])
        .forEach(x => { u[x.id] = { ad: x.ad, branch_id: x.branch_id }; });
      setUrun(u);
      setLoading(false);
    });
    return () => { iptal = true; };
  }, []));

  if (loading) return <Yukleniyor />;

  function bas(k: Campaign) {
    if (k.hizmet_id) {
      router.push({ pathname: '/hizmet-detay', params: { serviceId: k.hizmet_id } });
    } else if (k.urun_id && urun[k.urun_id]) {
      router.push({ pathname: '/magaza', params: { sube: urun[k.urun_id].branch_id } });
    }
  }

  // Banner'da gösterilecek hedef adı (hizmet veya ürün)
  function hedefAd(k: Campaign): string | null {
    if (k.hizmet_id) return hizmetAd[k.hizmet_id] ?? null;
    if (k.urun_id) return urun[k.urun_id]?.ad ?? null;
    return null;
  }

  return (
    <View style={[s.container, { backgroundColor: renkler.bg }]}>
      <ScrollView
        contentContainerStyle={{ paddingTop: 14, paddingBottom: 28 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[s.baslik, { color: renkler.text }]}>Kampanyalar</Text>

        {kampanyalar.length === 0 ? (
          <View style={s.bosKutu}>
            <Ionicons name="pricetags-outline" size={44} color={renkler.subtext} />
            <Text style={[s.bos, { color: renkler.subtext }]}>
              Şu an aktif bir kampanya yok. Yakında burada olacak!
            </Text>
          </View>
        ) : (
          <View style={s.liste}>
            {kampanyalar.map((k, i) => (
              <KampanyaKart
                key={k.id}
                kampanya={k}
                renkler={renkler}
                genislik={GENISLIK}
                renkIdx={i}
                hizmetAd={hedefAd(k)}
                onPress={() => bas(k)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  baslik: { fontSize: 26, fontWeight: '800', paddingHorizontal: 16, marginBottom: 16 },
  liste: { paddingHorizontal: 16, gap: 16 },
  bosKutu: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  bos: { fontSize: 15, textAlign: 'center', marginTop: 14, lineHeight: 22 },
});
