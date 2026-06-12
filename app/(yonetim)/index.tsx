import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../src/lib/supabase';
import { useSession } from '../../src/hooks/useSession';
import { useTheme } from '../../src/theme/ThemeContext';

const ROL_ADLARI: Record<string, string> = {
  admin: 'Merkez Yönetici',
  sube_sahibi: 'Şube Sahibi',
  kasa: 'Kasa',
  usta: 'Usta',
};

export default function PanelScreen() {
  const { profile } = useSession();
  const { renkler } = useTheme();
  const [subeAd, setSubeAd] = useState<string | null>(null);
  const [bugunSlot, setBugunSlot] = useState(0);
  const [bugunRandevu, setBugunRandevu] = useState(0);

  useFocusEffect(useCallback(() => {
    if (!profile) return;
    yukle();
  }, [profile?.id, profile?.branch_id]));

  async function yukle() {
    if (profile?.branch_id) {
      const { data } = await supabase
        .from('branches').select('ad').eq('id', profile.branch_id).single();
      setSubeAd(data?.ad ?? null);
    }

    // Bugünün slotları (admin: tüm şubeler, personel için RLS zaten açık;
    // şube filtresi varsa uygula)
    const bas = new Date(); bas.setHours(0, 0, 0, 0);
    const son = new Date(); son.setHours(23, 59, 59, 999);
    let slotSorgu = supabase
      .from('time_slots')
      .select('id')
      .gte('baslangic', bas.toISOString())
      .lte('baslangic', son.toISOString());
    if (profile?.branch_id) slotSorgu = slotSorgu.eq('branch_id', profile.branch_id);
    const { data: slotlar } = await slotSorgu;
    setBugunSlot(slotlar?.length ?? 0);

    if (slotlar && slotlar.length > 0) {
      const { count } = await supabase
        .from('appointments')
        .select('id', { count: 'exact', head: true })
        .in('slot_id', slotlar.map(s2 => s2.id))
        .neq('durum', 'iptal');
      setBugunRandevu(count ?? 0);
    } else {
      setBugunRandevu(0);
    }
  }

  return (
    <ScrollView style={{ backgroundColor: renkler.bg }} contentContainerStyle={s.container}>
      <Text style={[s.selam, { color: renkler.text }]}>
        {profile?.ad_soyad ? `Merhaba, ${profile.ad_soyad.split(' ')[0]}` : 'Merhaba'}
      </Text>
      <Text style={[s.rol, { color: renkler.subtext }]}>
        {ROL_ADLARI[profile?.rol ?? ''] ?? ''}
        {subeAd ? ` · ${subeAd}` : profile?.rol === 'admin' ? ' · Tüm şubeler' : ''}
      </Text>

      <View style={s.kartRow}>
        <View style={[s.kart, { backgroundColor: renkler.card }]}>
          <Ionicons name="time-outline" size={22} color={renkler.primary} />
          <Text style={[s.sayi, { color: renkler.text }]}>{bugunSlot}</Text>
          <Text style={[s.kartAlt, { color: renkler.subtext }]}>Bugünkü slot</Text>
        </View>
        <View style={[s.kart, { backgroundColor: renkler.card }]}>
          <Ionicons name="calendar-outline" size={22} color={renkler.primary} />
          <Text style={[s.sayi, { color: renkler.text }]}>{bugunRandevu}</Text>
          <Text style={[s.kartAlt, { color: renkler.subtext }]}>Bugünkü randevu</Text>
        </View>
      </View>

      {profile?.rol === 'sube_sahibi' && bugunSlot === 0 && (
        <View style={[s.uyari, { backgroundColor: renkler.rozetBg }]}>
          <Ionicons name="information-circle-outline" size={18} color={renkler.primary} />
          <Text style={[s.uyariText, { color: renkler.primary }]}>
            Bugün için slot tanımlı değil. Slotlar sekmesinden üretebilirsin.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { padding: 16, paddingBottom: 48 },
  selam: { fontSize: 22, fontWeight: '800', marginTop: 8 },
  rol: { fontSize: 14, marginTop: 4, marginBottom: 20 },
  kartRow: { flexDirection: 'row', gap: 12 },
  kart: { flex: 1, borderRadius: 12, padding: 16 },
  sayi: { fontSize: 28, fontWeight: '800', marginTop: 8 },
  kartAlt: { fontSize: 13, marginTop: 2 },
  uyari: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 10, padding: 12, marginTop: 16,
  },
  uyariText: { fontSize: 13, flex: 1, lineHeight: 18 },
});
