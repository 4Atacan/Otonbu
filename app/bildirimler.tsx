import { useEffect, useMemo, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../src/lib/supabase';
import { useSession } from '../src/hooks/useSession';
import { useBildirim } from '../src/context/BildirimContext';
import { Yukleniyor } from '../src/components/Yukleniyor';
import { useTheme } from '../src/theme/ThemeContext';
import { PERSONEL_ROLLER, AppNotification } from '../src/types';

// Bildirim merkezi — navbar zilinden açılır. Liste açılınca hepsi okundu
// sayılır (rozet sıfırlanır). Bildirime dokununca ref'ine göre ilgili
// ekrana gider (randevu → müşteri/personel ayrımıyla).
export default function BildirimlerScreen() {
  const { renkler } = useTheme();
  const { session, profile } = useSession();
  const { yenile } = useBildirim();
  const router = useRouter();
  const [liste, setListe] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [tazeleniyor, setTazeleniyor] = useState(false);

  const headerOpts = useMemo(() => ({
    title: 'Bildirimler',
    headerShown: true,
    headerStyle: { backgroundColor: renkler.card },
    headerTitleStyle: { color: renkler.text },
    headerTintColor: renkler.primary,
    headerShadowVisible: false,
  }), [renkler]);

  async function yukle() {
    const uid = session?.user?.id;
    if (!uid) { setListe([]); setLoading(false); return; }
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(50);
    setListe((data as AppNotification[]) ?? []);
    setLoading(false);

    // Açılınca hepsini okundu işaretle → navbar rozeti sıfırlanır
    await supabase
      .from('notifications')
      .update({ okundu_mu: true })
      .eq('user_id', uid)
      .eq('okundu_mu', false);
    yenile();
  }

  useEffect(() => { yukle(); }, [session?.user?.id]);

  // ref önekine göre ilgili ekran: personel yönetim tarafına, müşteri kendi
  // ekranlarına gider. Eşleşme yoksa listede kalır.
  function ac(b: AppNotification) {
    const personel = profile && PERSONEL_ROLLER.includes(profile.rol);
    const tip = b.ref?.split(':')[0];
    switch (tip) {
      case 'randevu':
        router.push(personel ? '/(yonetim)/randevular' : '/randevularim'); break;
      case 'teklif':
        if (personel) router.push('/hizmet-teklifleri'); break;
      case 'sigorta':
        if (personel) router.push('/teklifler'); break;
      case 'siparis':
        router.push('/siparisler'); break;
    }
  }

  function zaman(iso: string): string {
    const fark = (Date.now() - new Date(iso).getTime()) / 60000; // dk
    if (fark < 1) return 'şimdi';
    if (fark < 60) return `${Math.floor(fark)} dk önce`;
    if (fark < 60 * 24) return `${Math.floor(fark / 60)} sa önce`;
    return new Date(iso).toLocaleDateString('tr-TR');
  }

  return (
    <View style={[s.container, { backgroundColor: renkler.bg }]}>
      <Stack.Screen options={headerOpts} />
      {loading ? <Yukleniyor /> : (
        <FlatList
          data={liste}
          keyExtractor={b => b.id}
          contentContainerStyle={s.icerik}
          refreshControl={
            <RefreshControl
              refreshing={tazeleniyor}
              onRefresh={async () => { setTazeleniyor(true); await yukle(); setTazeleniyor(false); }}
              tintColor={renkler.primary}
            />
          }
          ListEmptyComponent={
            <View style={s.bos}>
              <Ionicons name="notifications-off-outline" size={44} color={renkler.subtext} />
              <Text style={[s.bosText, { color: renkler.subtext }]}>Henüz bildirimin yok.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[s.kart, { backgroundColor: renkler.card }]}
              activeOpacity={0.7}
              onPress={() => ac(item)}
            >
              {/* Okunmamışsa soldaki nokta dolu */}
              <View style={[
                s.nokta,
                { backgroundColor: item.okundu_mu ? 'transparent' : renkler.primary },
              ]} />
              <View style={{ flex: 1 }}>
                <Text style={[s.baslik, { color: renkler.text }]}>{item.baslik}</Text>
                <Text style={[s.govde, { color: renkler.subtext }]}>{item.govde}</Text>
                <Text style={[s.zaman, { color: renkler.subtext }]}>{zaman(item.created_at)}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={renkler.subtext} />
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  icerik: { padding: 14, gap: 10, flexGrow: 1 },
  bos: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  bosText: { fontSize: 15 },
  kart: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 14, padding: 14,
  },
  nokta: { width: 8, height: 8, borderRadius: 4 },
  baslik: { fontSize: 15, fontWeight: '700' },
  govde: { fontSize: 13, marginTop: 2, lineHeight: 18 },
  zaman: { fontSize: 11, marginTop: 4 },
});
