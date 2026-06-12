import { useCallback, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../src/lib/supabase';
import { useTheme } from '../../src/theme/ThemeContext';
import { Campaign } from '../../src/types';

export default function KampanyalarScreen() {
  const { renkler } = useTheme();
  const [kampanyalar, setKampanyalar] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [yenileniyor, setYenileniyor] = useState(false);

  async function yukle() {
    const bugun = new Date().toISOString().slice(0, 10);
    // Aktif + tarihi geçmemiş kampanyalar (bitis NULL = süresiz)
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('aktif', true)
      .or(`bitis.is.null,bitis.gte.${bugun}`)
      .order('created_at', { ascending: false });
    if (!error && data) setKampanyalar(data);
    setLoading(false);
  }

  // Sekme her açıldığında tazele (admin panelden eklenince görünsün)
  useFocusEffect(useCallback(() => { yukle(); }, []));

  async function elleYenile() {
    setYenileniyor(true);
    await yukle();
    setYenileniyor(false);
  }

  function tarihAraligi(k: Campaign): string | null {
    const fmt = (d: string) => new Date(d).toLocaleDateString('tr-TR');
    if (k.baslangic && k.bitis) return `${fmt(k.baslangic)} – ${fmt(k.bitis)}`;
    if (k.bitis) return `Son gün: ${fmt(k.bitis)}`;
    return null;
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color={renkler.primary} />;

  return (
    <View style={[s.container, { backgroundColor: renkler.bg }]}>
      <FlatList
        data={kampanyalar}
        keyExtractor={k => k.id}
        refreshControl={
          <RefreshControl refreshing={yenileniyor} onRefresh={elleYenile} />
        }
        contentContainerStyle={kampanyalar.length === 0 && s.bosContainer}
        ListEmptyComponent={
          <View style={s.bosKutu}>
            <Ionicons name="pricetags-outline" size={48} color={renkler.subtext} />
            <Text style={[s.bosBaslik, { color: renkler.text }]}>
              Şu an aktif kampanya yok
            </Text>
            <Text style={[s.bosAlt, { color: renkler.subtext }]}>
              Yeni kampanyalar burada görünecek, ara sıra göz at!
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[s.kart, { backgroundColor: renkler.card }]}>
            <Text style={[s.baslik, { color: renkler.text }]}>{item.baslik}</Text>
            {item.aciklama && (
              <Text style={[s.aciklama, { color: renkler.subtext }]}>
                {item.aciklama}
              </Text>
            )}
            {tarihAraligi(item) && (
              <View style={[s.rozet, { backgroundColor: renkler.rozetBg }]}>
                <Text style={[s.rozetText, { color: renkler.primary }]}>
                  {tarihAraligi(item)}
                </Text>
              </View>
            )}
          </View>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  bosContainer: { flexGrow: 1, justifyContent: 'center' },
  bosKutu: { alignItems: 'center', padding: 32 },
  bosBaslik: { fontSize: 17, fontWeight: '700', marginTop: 16 },
  bosAlt: { fontSize: 14, textAlign: 'center', marginTop: 6, lineHeight: 20 },
  kart: {
    margin: 12, marginBottom: 0, padding: 16, borderRadius: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  baslik: { fontSize: 16, fontWeight: '700' },
  aciklama: { fontSize: 14, marginTop: 6, lineHeight: 20 },
  rozet: {
    alignSelf: 'flex-start', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 4, marginTop: 10,
  },
  rozetText: { fontSize: 12, fontWeight: '600' },
});
