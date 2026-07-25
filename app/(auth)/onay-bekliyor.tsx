import { uyari } from '../../src/lib/uyari';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Link, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { Logo } from '../../src/components/Logo';

export default function OnayBekliyorScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const [gonderiliyor, setGonderiliyor] = useState(false);

  async function tekrarGonder() {
    if (!email) return;
    setGonderiliyor(true);
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
    });
    setGonderiliyor(false);
    if (error) uyari('Hata', error.message);
    else uyari('Gönderildi', 'Doğrulama e-postası tekrar gönderildi');
  }

  return (
    <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
      <View style={{ alignItems: 'center', marginBottom: 18 }}><Logo width={150} sabitAcik /></View>
      <Text style={s.baslik}>E-postanı Doğrula</Text>
      <Text style={s.aciklama}>
        <Text style={s.bold}>{email}</Text> adresine bir doğrulama linki gönderdik.
        Linke tıkladıktan sonra giriş yapabilirsin.
      </Text>

      <TouchableOpacity style={s.btn} onPress={tekrarGonder} disabled={gonderiliyor}>
        <Text style={s.btnText}>{gonderiliyor ? 'Gönderiliyor…' : 'Tekrar Gönder'}</Text>
      </TouchableOpacity>

      <Link href="/(auth)" asChild>
        <TouchableOpacity style={s.link}>
          <Text style={s.linkText}>Giriş ekranına dön</Text>
        </TouchableOpacity>
      </Link>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, paddingTop: 80, alignItems: 'center', backgroundColor: '#fff' },
  baslik: { fontSize: 22, fontWeight: '800', color: '#0f172a', marginBottom: 12 },
  aciklama: { fontSize: 14, color: '#475569', textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  bold: { fontWeight: '700', color: '#0f172a' },
  btn: {
    borderWidth: 1, borderColor: '#0b7bb5', borderRadius: 10,
    paddingVertical: 12, paddingHorizontal: 24,
  },
  btnText: { color: '#0b7bb5', fontWeight: '700' },
  link: { marginTop: 20, padding: 12 },
  linkText: { color: '#64748b' },
});
