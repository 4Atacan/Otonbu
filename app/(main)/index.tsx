import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { supabase } from '../../src/lib/supabase';
import { useSession } from '../../src/hooks/useSession';

export default function AnaSayfa() {
  const { profile } = useSession();

  async function cikisYap() {
    await supabase.auth.signOut();
  }

  return (
    <View style={s.container}>
      <Text style={s.baslik}>Hoş Geldiniz</Text>
      {profile && (
        <>
          <Text style={s.bilgi}>
            {profile.ad_soyad ?? profile.email ?? profile.telefon ?? '—'}
          </Text>
          <Text style={s.rol}>Rol: {profile.rol}</Text>
        </>
      )}
      <TouchableOpacity style={s.cikis} onPress={cikisYap}>
        <Text style={s.cikisText}>Çıkış Yap</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  baslik: { fontSize: 26, fontWeight: 'bold', marginBottom: 12 },
  bilgi: { fontSize: 18, marginBottom: 4 },
  rol: { fontSize: 14, color: '#888', marginBottom: 40 },
  cikis: {
    borderWidth: 1, borderColor: '#e00', borderRadius: 10,
    paddingVertical: 12, paddingHorizontal: 32,
  },
  cikisText: { color: '#e00', fontWeight: '600' },
});
