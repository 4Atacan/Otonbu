import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/lib/supabase';

export default function TelefonScreen() {
  const [telefon, setTelefon] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function otpGonder() {
    const temiz = telefon.replace(/\s/g, '');
    if (!temiz.startsWith('+')) {
      Alert.alert('Hata', 'Telefon numarası +90 ile başlamalı (örn. +905551234567)');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ phone: temiz });
    setLoading(false);
    if (error) { Alert.alert('Hata', error.message); return; }
    router.push({ pathname: '/(auth)/otp', params: { telefon: temiz } });
  }

  return (
    <View style={s.container}>
      <Text style={s.logo}>OTONBU GARAGE</Text>
      <Text style={s.alt}>Araç korumanın adresi</Text>

      <Text style={s.label}>Telefon numaranız</Text>
      <TextInput
        style={s.input}
        placeholder="+90 555 123 4567"
        keyboardType="phone-pad"
        value={telefon}
        onChangeText={setTelefon}
        autoComplete="tel"
      />

      <TouchableOpacity style={s.btn} onPress={otpGonder} disabled={loading}>
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={s.btnText}>Devam Et</Text>}
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  logo: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 4 },
  alt: { textAlign: 'center', color: '#888', marginBottom: 40 },
  label: { fontSize: 14, color: '#333', marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 10,
    padding: 14, fontSize: 16, marginBottom: 16,
  },
  btn: {
    backgroundColor: '#1a56db', borderRadius: 10,
    padding: 16, alignItems: 'center',
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
