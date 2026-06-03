import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '../../src/lib/supabase';

export default function OtpScreen() {
  const { telefon } = useLocalSearchParams<{ telefon: string }>();
  const [kod, setKod] = useState('');
  const [loading, setLoading] = useState(false);

  async function dogrula() {
    if (kod.length < 4) { Alert.alert('Hata', 'Geçersiz kod'); return; }
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      phone: telefon,
      token: kod,
      type: 'sms',
    });
    setLoading(false);
    if (error) Alert.alert('Hata', error.message);
    // Başarılıysa _layout.tsx onAuthStateChange ile (main)'e yönlendirir
  }

  return (
    <View style={s.container}>
      <Text style={s.baslik}>Doğrulama Kodu</Text>
      <Text style={s.aciklama}>
        <Text style={{ fontWeight: '600' }}>{telefon}</Text> numarasına SMS gönderdik.
      </Text>

      <TextInput
        style={s.input}
        placeholder="6 haneli kod"
        keyboardType="number-pad"
        maxLength={6}
        value={kod}
        onChangeText={setKod}
        autoFocus
      />

      <TouchableOpacity style={s.btn} onPress={dogrula} disabled={loading}>
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={s.btnText}>Giriş Yap</Text>}
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  baslik: { fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  aciklama: { color: '#555', marginBottom: 32, lineHeight: 22 },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 10,
    padding: 14, fontSize: 24, textAlign: 'center',
    letterSpacing: 8, marginBottom: 16,
  },
  btn: {
    backgroundColor: '#1a56db', borderRadius: 10,
    padding: 16, alignItems: 'center',
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
