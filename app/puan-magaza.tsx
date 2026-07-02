import { useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity,
} from 'react-native';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../src/lib/supabase';
import { useSession } from '../src/hooks/useSession';
import { useTheme, Renkler } from '../src/theme/ThemeContext';
import { Service } from '../src/types';
import { gorselUrl as hizmetGorselUrl } from '../src/lib/hizmet';
import { Yukleniyor } from '../src/components/Yukleniyor';
import { PuanLogo } from '../src/components/PuanLogo';

// Puan Mağazası — katalog. Müşteri kazandığı OTONBU puanıyla hangi hizmeti kaç
// puana alabileceğini görür. Alım burada DEĞİL: hizmete dokununca randevu akışına
// gider, ödeme adımında "Puanla Al" ile alır (puan_ile RPC değil, randevu_olustur
// p_odeme_yontemi='puan'). Kupon/kod mekanizması yok.
export default function PuanMagazaScreen() {
  const { renkler } = useTheme();
  const { session } = useSession();
  const router = useRouter();

  const [puan, setPuan] = useState(0);
  const [hizmetler, setHizmetler] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  const headerOpts = useMemo(() => ({
    title: 'Puan Mağazası',
    headerShown: true,
    headerStyle: { backgroundColor: renkler.card },
    headerTitleStyle: { color: renkler.text },
    headerTintColor: renkler.primary,
    headerShadowVisible: false,
  }), [renkler]);

  useFocusEffect(useCallback(() => {
    let iptal = false;
    const uid = session?.user?.id;
    Promise.all([
      supabase.from('services').select('*').eq('aktif', true).gt('puan_bedeli', 0).order('puan_bedeli'),
      uid
        ? supabase.from('loyalty_ledger').select('puan_degisim').eq('user_id', uid)
        : Promise.resolve({ data: [] as { puan_degisim: number }[] }),
    ]).then(([hizRes, puanRes]) => {
      if (iptal) return;
      setHizmetler((hizRes.data as Service[]) ?? []);
      setPuan(((puanRes.data as { puan_degisim: number }[]) ?? [])
        .reduce((a, r) => a + (r.puan_degisim ?? 0), 0));
      setLoading(false);
    });
    return () => { iptal = true; };
  }, [session?.user?.id]));

  if (loading) {
    return (
      <>
        <Stack.Screen options={headerOpts} />
        <Yukleniyor />
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={headerOpts} />
      <ScrollView
        style={{ backgroundColor: renkler.bg }}
        contentContainerStyle={s.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Bakiye kartı */}
        <View style={[s.bakiye, { backgroundColor: renkler.primary }]}>
          <PuanLogo size={140} renk="#fff" style={s.bakiyeDeco} />
          <Text style={s.bakiyeUst}>OTONBU PUANIN</Text>
          <Text style={s.bakiyeSayi}>{puan}</Text>
          <Text style={s.bakiyeAlt}>Puanınla hizmet al — randevu ödeme adımında "Puanla Al"</Text>
        </View>

        {hizmetler.length === 0 ? (
          <View style={s.bosKutu}>
            <Ionicons name="gift-outline" size={40} color={renkler.subtext} />
            <Text style={[s.bosText, { color: renkler.subtext }]}>
              Henüz puanla alınabilir hizmet tanımlı değil. Yakında burada olacak.
            </Text>
          </View>
        ) : (
          <>
            <Baslik title="Puanla Alınabilir Hizmetler" renkler={renkler} />
            {hizmetler.map(h => {
              const yeterli = puan >= h.puan_bedeli;
              const uri = hizmetGorselUrl(h.gorsel);
              return (
                <TouchableOpacity
                  key={h.id}
                  style={[s.satir, { backgroundColor: renkler.card }]}
                  activeOpacity={0.85}
                  onPress={() => router.push({
                    pathname: '/randevu-al',
                    params: { serviceId: h.id, serviceAd: h.ad },
                  })}
                >
                  {uri ? (
                    <Image source={{ uri }} style={s.gorsel} resizeMode="cover" />
                  ) : (
                    <View style={[s.gorsel, s.gorselBos, { backgroundColor: renkler.rozetBg }]}>
                      <Ionicons name="car-sport-outline" size={22} color={renkler.subtext} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={[s.satirAd, { color: renkler.text }]} numberOfLines={2}>{h.ad}</Text>
                    <View style={s.puanRow}>
                      <PuanLogo size={20} renk={renkler.primary} />
                      <Text style={[s.puanText, { color: renkler.primary }]}>{h.puan_bedeli} puan</Text>
                    </View>
                  </View>
                  <View style={[
                    s.durum,
                    { backgroundColor: yeterli ? renkler.rozetBg : 'transparent',
                      borderColor: yeterli ? 'transparent' : renkler.border },
                  ]}>
                    <Text style={[s.durumText, { color: yeterli ? renkler.primary : renkler.subtext }]}>
                      {yeterli ? 'Randevu Al ›' : `${h.puan_bedeli - puan} puan daha`}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
            <Text style={[s.dipnot, { color: renkler.subtext }]}>
              Hizmete dokun, randevu al; ödeme adımında "Puanla Al" ile puanınla öde.
            </Text>
          </>
        )}
      </ScrollView>
    </>
  );
}

function Baslik({ title, renkler }: { title: string; renkler: Renkler }) {
  return (
    <View style={s.baslikRow}>
      <View style={[s.baslikBar, { backgroundColor: renkler.accent }]} />
      <Text style={[s.baslik, { color: renkler.text }]}>{title}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },

  bakiye: { borderRadius: 18, padding: 20, overflow: 'hidden' },
  bakiyeDeco: { position: 'absolute', right: -14, top: -10, opacity: 0.16 },
  bakiyeUst: { color: '#fff', fontSize: 11, fontWeight: '700', letterSpacing: 1, opacity: 0.85 },
  bakiyeSayi: { color: '#fff', fontSize: 44, fontWeight: '800', lineHeight: 50, marginTop: 2 },
  bakiyeAlt: { color: '#fff', fontSize: 13, marginTop: 4, opacity: 0.92 },

  baslikRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 26, marginBottom: 12 },
  baslikBar: { width: 4, height: 18, borderRadius: 2 },
  baslik: { fontSize: 18, fontWeight: '800' },

  satir: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 14, padding: 10, marginBottom: 10,
  },
  gorsel: { width: 56, height: 56, borderRadius: 10 },
  gorselBos: { alignItems: 'center', justifyContent: 'center' },
  satirAd: { fontSize: 15, fontWeight: '600' },
  puanRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  puanText: { fontSize: 14, fontWeight: '800' },
  durum: {
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8,
    borderWidth: 1, maxWidth: 104, alignItems: 'center',
  },
  durumText: { fontSize: 11, fontWeight: '700', textAlign: 'center' },

  bosKutu: { alignItems: 'center', gap: 12, paddingVertical: 48 },
  bosText: { fontSize: 14, textAlign: 'center', lineHeight: 20, paddingHorizontal: 24 },

  dipnot: { fontSize: 12, textAlign: 'center', marginTop: 18, lineHeight: 18 },
});
