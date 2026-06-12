import { useCallback, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, RefreshControl,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../src/lib/supabase';
import { useTheme } from '../../src/theme/ThemeContext';
import { Appointment, RandevuDurum } from '../../src/types';

const DURUM_ETIKET: Record<RandevuDurum, string> = {
  beklemede: 'Beklemede',
  onayli: 'Onaylı',
  iptal: 'İptal',
};

export default function RandevularScreen() {
  const { renkler } = useTheme();
  const [randevular, setRandevular] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [yenileniyor, setYenileniyor] = useState(false);

  useFocusEffect(useCallback(() => { yukle(); }, []));

  async function yukle() {
    // RLS: personel şubesininkini, admin hepsini görür
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        users (ad_soyad, telefon),
        vehicles (plaka, marka, model),
        services (ad),
        time_slots (baslangic)
      `)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) Alert.alert('Hata', error.message);
    else setRandevular((data as Appointment[]) ?? []);
    setLoading(false);
  }

  async function elleYenile() {
    setYenileniyor(true);
    await yukle();
    setYenileniyor(false);
  }

  function durumDegistirOnayi(r: Appointment, yeni: RandevuDurum) {
    Alert.alert(
      'Durum Değişikliği',
      `Randevu "${DURUM_ETIKET[yeni]}" yapılacak. Emin misin?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Evet',
          onPress: async () => {
            const { error } = await supabase
              .from('appointments')
              .update({ durum: yeni })
              .eq('id', r.id);
            if (error) Alert.alert('Hata', error.message);
            else yukle();
          },
        },
      ],
    );
  }

  function durumRenk(durum: RandevuDurum): string {
    if (durum === 'onayli') return '#16a34a';
    if (durum === 'iptal') return renkler.danger;
    return '#d97706';
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color={renkler.primary} />;

  return (
    <View style={[s.container, { backgroundColor: renkler.bg }]}>
      <FlatList
        data={randevular}
        keyExtractor={r => r.id}
        refreshControl={
          <RefreshControl refreshing={yenileniyor} onRefresh={elleYenile} />
        }
        contentContainerStyle={randevular.length === 0 && s.bosContainer}
        ListEmptyComponent={
          <View style={s.bosKutu}>
            <Ionicons name="calendar-outline" size={48} color={renkler.subtext} />
            <Text style={[s.bosBaslik, { color: renkler.text }]}>Henüz randevu yok</Text>
            <Text style={[s.bosAlt, { color: renkler.subtext }]}>
              Müşteriler randevu aldıkça burada listelenecek.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const slot = item.time_slots?.baslangic
            ? new Date(item.time_slots.baslangic) : null;
          return (
            <View style={[s.kart, { backgroundColor: renkler.card }]}>
              <View style={s.kartUst}>
                <Text style={[s.saat, { color: renkler.text }]}>
                  {slot
                    ? slot.toLocaleString('tr-TR', {
                        day: 'numeric', month: 'short',
                        hour: '2-digit', minute: '2-digit',
                      })
                    : 'Slot yok'}
                </Text>
                <View style={[s.durumRozet, { backgroundColor: renkler.rozetBg }]}>
                  <Text style={[s.durumText, { color: durumRenk(item.durum) }]}>
                    {DURUM_ETIKET[item.durum]}
                  </Text>
                </View>
              </View>

              <Text style={[s.hizmet, { color: renkler.primary }]}>
                {item.services?.ad ?? 'Hizmet'}
              </Text>
              <Text style={[s.detay, { color: renkler.text }]}>
                {item.users?.ad_soyad ?? 'Müşteri'}
                {item.users?.telefon ? ` · ${item.users.telefon}` : ''}
              </Text>
              <Text style={[s.detay, { color: renkler.subtext }]}>
                {item.vehicles?.plaka ?? ''}
                {item.vehicles ? `  ${[item.vehicles.marka, item.vehicles.model].filter(Boolean).join(' ')}` : ''}
              </Text>

              {item.durum !== 'iptal' && (
                <View style={s.eylemler}>
                  {item.durum === 'beklemede' && (
                    <TouchableOpacity
                      style={[s.eylemBtn, { borderColor: '#16a34a' }]}
                      onPress={() => durumDegistirOnayi(item, 'onayli')}
                    >
                      <Text style={[s.eylemText, { color: '#16a34a' }]}>Onayla</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[s.eylemBtn, { borderColor: renkler.danger }]}
                    onPress={() => durumDegistirOnayi(item, 'iptal')}
                  >
                    <Text style={[s.eylemText, { color: renkler.danger }]}>İptal Et</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        }}
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
  kart: { margin: 12, marginBottom: 0, padding: 16, borderRadius: 12 },
  kartUst: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 8,
  },
  saat: { fontSize: 16, fontWeight: '700' },
  durumRozet: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  durumText: { fontSize: 12, fontWeight: '700' },
  hizmet: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  detay: { fontSize: 14, marginTop: 2 },
  eylemler: { flexDirection: 'row', gap: 10, marginTop: 12 },
  eylemBtn: {
    borderWidth: 1, borderRadius: 8,
    paddingVertical: 8, paddingHorizontal: 16,
  },
  eylemText: { fontSize: 13, fontWeight: '600' },
});
