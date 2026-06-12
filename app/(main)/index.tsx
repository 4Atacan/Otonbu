import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, SectionList,
} from 'react-native';
import { supabase } from '../../src/lib/supabase';
import { useSession } from '../../src/hooks/useSession';
import { useTheme } from '../../src/theme/ThemeContext';
import { Service } from '../../src/types';

export default function AnaSayfa() {
  const { profile } = useSession();
  const { renkler } = useTheme();
  const [hizmetler, setHizmetler] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('services')
      .select('*')
      .eq('aktif', true)
      .order('kategori')
      .order('ad')
      .then(({ data, error }) => {
        if (!error && data) setHizmetler(data);
        setLoading(false);
      });
  }, []);

  // Kategori bazlı gruplama
  const sections = Object.entries(
    hizmetler.reduce<Record<string, Service[]>>((acc, h) => {
      if (!acc[h.kategori]) acc[h.kategori] = [];
      acc[h.kategori].push(h);
      return acc;
    }, {})
  ).map(([title, data]) => ({ title, data }));

  const ad = profile?.ad_soyad?.split(' ')[0];

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color={renkler.primary} />;

  return (
    <View style={[s.container, { backgroundColor: renkler.bg }]}>
      <SectionList
        sections={sections}
        keyExtractor={item => item.id}
        ListHeaderComponent={
          <View style={s.hosgeldin}>
            <Text style={[s.selam, { color: renkler.text }]}>
              {ad ? `Merhaba, ${ad} 👋` : 'Merhaba 👋'}
            </Text>
            <Text style={[s.altSelam, { color: renkler.subtext }]}>
              Aracın için bir hizmet seç
            </Text>
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
        renderItem={({ item }) => (
          <View style={[s.kart, { backgroundColor: renkler.card }]}>
            <Text style={[s.ad, { color: renkler.text }]}>{item.ad}</Text>
            <Text style={[s.fiyat, { color: renkler.primary }]}>
              {item.taban_fiyat.toLocaleString('tr-TR', {
                style: 'currency', currency: 'TRY',
              })}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  hosgeldin: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 4 },
  selam: { fontSize: 22, fontWeight: '800' },
  altSelam: { fontSize: 14, marginTop: 4 },
  bosKutu: { paddingTop: 48, alignItems: 'center' },
  bos: { fontSize: 15, textAlign: 'center', paddingHorizontal: 32, lineHeight: 22 },
  kategori: {
    fontSize: 11, fontWeight: '700',
    paddingHorizontal: 16, paddingTop: 20, paddingBottom: 6,
    letterSpacing: 1,
  },
  kart: {
    marginHorizontal: 12, marginBottom: 2,
    padding: 16, flexDirection: 'row', justifyContent: 'space-between',
    borderRadius: 10,
  },
  ad: { fontSize: 15, flex: 1 },
  fiyat: { fontSize: 15, fontWeight: '700' },
});
