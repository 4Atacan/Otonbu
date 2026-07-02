import { useCallback, useState } from 'react';
import { Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useSession } from '../hooks/useSession';
import { useTheme } from '../theme/ThemeContext';
import { PuanLogo } from './PuanLogo';

// Müşteri panelinde alt navbarın sol üstünde SABİT duran "OTONBU Puanı" butonu.
// (main) layout'ta Tabs'ın üstüne overlay olarak biner → her sekmede görünür.
// Dokununca puan mağazasını açar. Bakiyeyi loyalty_ledger toplamından alır.
export function PuanRozeti() {
  const { renkler } = useTheme();
  const { session } = useSession();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [puan, setPuan] = useState(0);

  // Her odaklanışta tazele — iş/sipariş tamamlanınca kazanılan puan güncel kalsın.
  useFocusEffect(useCallback(() => {
    let iptal = false;
    const uid = session?.user?.id;
    if (!uid) { setPuan(0); return; }
    supabase.from('loyalty_ledger').select('puan_degisim').eq('user_id', uid)
      .then(({ data }) => {
        if (iptal) return;
        setPuan((data ?? []).reduce((a, r) => a + (r.puan_degisim ?? 0), 0));
      });
    return () => { iptal = true; };
  }, [session?.user?.id]));

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => router.push('/puan-magaza')}
      // Tab bar (~49) + güvenli alt boşluk üstünde, sol köşede sabit dur.
      style={[
        s.rozet,
        { backgroundColor: renkler.primary, bottom: 49 + insets.bottom + 12 },
      ]}
    >
      <PuanLogo size={22} renk={renkler.primaryText} />
      <Text style={[s.label, { color: renkler.primaryText }]} numberOfLines={1}>
        {puan} <Text style={s.labelAlt}>OTONBU Puanı</Text>
      </Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  rozet: {
    position: 'absolute',
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 22,
    // Hafif gölge — tab bar üstünde yüzer görünsün.
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },
  label: { fontSize: 14, fontWeight: '800' },
  labelAlt: { fontSize: 12, fontWeight: '700' },
});
