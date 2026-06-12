import { useCallback, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../src/lib/supabase';
import { useSession } from '../../src/hooks/useSession';
import { useTheme } from '../../src/theme/ThemeContext';
import { TimeSlot } from '../../src/types';
import { gunlukSlotSaatleri } from '../../src/data/calisma-duzeni';

const GUN_SAYISI = 14;  // bugünden itibaren seçilebilir gün

function gunler(): Date[] {
  return Array.from({ length: GUN_SAYISI }, (_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + i);
    return d;
  });
}

export default function SlotlarScreen() {
  const { profile } = useSession();
  const { renkler } = useTheme();
  const [secilenGun, setSecilenGun] = useState<Date>(gunler()[0]);
  const [slotlar, setSlotlar] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [islem, setIslem] = useState(false);

  useFocusEffect(useCallback(() => {
    if (profile?.branch_id) yukle(secilenGun);
  }, [profile?.branch_id, secilenGun]));

  async function yukle(gun: Date) {
    if (!profile?.branch_id) return;
    setLoading(true);
    const bas = new Date(gun);
    const son = new Date(gun); son.setHours(23, 59, 59, 999);
    const { data, error } = await supabase
      .from('time_slots')
      .select('*')
      .eq('branch_id', profile.branch_id)
      .gte('baslangic', bas.toISOString())
      .lte('baslangic', son.toISOString())
      .order('baslangic');
    if (error) Alert.alert('Hata', error.message);
    else setSlotlar(data ?? []);
    setLoading(false);
  }

  async function uret() {
    if (!profile?.branch_id) return;
    setIslem(true);
    const satirlar = gunlukSlotSaatleri(secilenGun).map(t => ({
      branch_id: profile.branch_id!,
      baslangic: t.toISOString(),
      kapasite: 1,
    }));
    // Daha önce üretilmiş saatler atlanır (unique index branch_id+baslangic)
    const { error } = await supabase
      .from('time_slots')
      .upsert(satirlar, { onConflict: 'branch_id,baslangic', ignoreDuplicates: true });
    setIslem(false);
    if (error) { Alert.alert('Hata', error.message); return; }
    yukle(secilenGun);
  }

  function silOnayi(slot: TimeSlot) {
    const saat = new Date(slot.baslangic).toLocaleTimeString('tr-TR', {
      hour: '2-digit', minute: '2-digit',
    });
    Alert.alert('Slotu Sil', `${saat} slotu silinecek. Emin misin?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil', style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('time_slots').delete().eq('id', slot.id);
          // Randevusu olan slot FK nedeniyle silinemez — bilgilendir
          if (error) Alert.alert('Silinemedi',
            'Bu slota bağlı randevu olabilir. Önce randevuyu iptal et.');
          else yukle(secilenGun);
        },
      },
    ]);
  }

  if (!profile?.branch_id) {
    return (
      <View style={[s.ortala, { backgroundColor: renkler.bg }]}>
        <Text style={[s.bos, { color: renkler.subtext }]}>
          Hesabına bağlı bir şube yok. Slot yönetimi için şube ataması gerekli.
        </Text>
      </View>
    );
  }

  return (
    <View style={[s.container, { backgroundColor: renkler.bg }]}>
      {/* Gün seçici */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.gunSeridi}
        contentContainerStyle={s.gunSeridiIcerik}
      >
        {gunler().map(gun => {
          const aktif = gun.getTime() === secilenGun.getTime();
          return (
            <TouchableOpacity
              key={gun.toISOString()}
              style={[
                s.gunBtn,
                { backgroundColor: renkler.card, borderColor: renkler.border },
                aktif && { backgroundColor: renkler.primary, borderColor: renkler.primary },
              ]}
              onPress={() => setSecilenGun(gun)}
            >
              <Text style={[s.gunUst, { color: aktif ? renkler.primaryText : renkler.subtext }]}>
                {gun.toLocaleDateString('tr-TR', { weekday: 'short' })}
              </Text>
              <Text style={[s.gunAlt, { color: aktif ? renkler.primaryText : renkler.text }]}>
                {gun.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} color={renkler.primary} />
      ) : slotlar.length === 0 ? (
        <View style={s.ortala}>
          <Ionicons name="time-outline" size={48} color={renkler.subtext} />
          <Text style={[s.bos, { color: renkler.subtext }]}>
            Bu gün için slot tanımlı değil.
          </Text>
          <TouchableOpacity
            style={[s.uretBtn, { backgroundColor: renkler.primary }]}
            onPress={uret}
            disabled={islem}
          >
            {islem
              ? <ActivityIndicator color={renkler.primaryText} />
              : (
                <Text style={[s.uretText, { color: renkler.primaryText }]}>
                  Günlük Şablonla Üret
                </Text>
              )}
          </TouchableOpacity>
          <Text style={[s.sablonNot, { color: renkler.subtext }]}>
            09:00–12:20 ve 13:40–17:00 arası 40 dk aralıkla 12 slot
          </Text>
        </View>
      ) : (
        <FlatList
          data={slotlar}
          keyExtractor={sl => sl.id}
          contentContainerStyle={s.liste}
          renderItem={({ item }) => (
            <View style={[s.slotKart, { backgroundColor: renkler.card }]}>
              <Text style={[s.slotSaat, { color: renkler.text }]}>
                {new Date(item.baslangic).toLocaleTimeString('tr-TR', {
                  hour: '2-digit', minute: '2-digit',
                })}
              </Text>
              <Text style={[s.slotKapasite, { color: renkler.subtext }]}>
                Kapasite: {item.kapasite}
              </Text>
              <TouchableOpacity onPress={() => silOnayi(item)} hitSlop={8}>
                <Ionicons name="trash-outline" size={20} color={renkler.danger} />
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  gunSeridi: { flexGrow: 0 },
  gunSeridiIcerik: { padding: 12, gap: 8 },
  gunBtn: {
    borderWidth: 1, borderRadius: 10,
    paddingVertical: 8, paddingHorizontal: 14, alignItems: 'center',
  },
  gunUst: { fontSize: 12 },
  gunAlt: { fontSize: 14, fontWeight: '700', marginTop: 2 },
  ortala: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  bos: { fontSize: 15, textAlign: 'center', marginTop: 12, lineHeight: 22 },
  uretBtn: { borderRadius: 10, paddingVertical: 14, paddingHorizontal: 28, marginTop: 20 },
  uretText: { fontSize: 15, fontWeight: '700' },
  sablonNot: { fontSize: 12, marginTop: 12, textAlign: 'center' },
  liste: { padding: 12, paddingBottom: 32 },
  slotKart: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 10, padding: 14, marginBottom: 8,
  },
  slotSaat: { fontSize: 17, fontWeight: '700', width: 70 },
  slotKapasite: { flex: 1, fontSize: 13 },
});
