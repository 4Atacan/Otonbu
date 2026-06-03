import { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator, SectionList,
} from 'react-native';
import { supabase } from '../../src/lib/supabase';
import { Service } from '../../src/types';

export default function KatalogScreen() {
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

  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

  return (
    <View style={s.container}>
      <SectionList
        sections={sections}
        keyExtractor={item => item.id}
        ListEmptyComponent={
          <Text style={s.bos}>Henüz hizmet eklenmedi.</Text>
        }
        renderSectionHeader={({ section }) => (
          <Text style={s.kategori}>{section.title.toUpperCase()}</Text>
        )}
        renderItem={({ item }) => (
          <View style={s.kart}>
            <Text style={s.ad}>{item.ad}</Text>
            <Text style={s.fiyat}>
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
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  bos: { textAlign: 'center', color: '#aaa', marginTop: 60, fontSize: 16 },
  kategori: {
    fontSize: 11, fontWeight: '700', color: '#888',
    paddingHorizontal: 16, paddingTop: 20, paddingBottom: 6,
    letterSpacing: 1,
  },
  kart: {
    backgroundColor: '#fff', marginHorizontal: 12, marginBottom: 2,
    padding: 16, flexDirection: 'row', justifyContent: 'space-between',
    borderRadius: 10,
  },
  ad: { fontSize: 15, color: '#222', flex: 1 },
  fiyat: { fontSize: 15, fontWeight: '700', color: '#1a56db' },
});
