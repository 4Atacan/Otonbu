import { useState } from 'react';
import {
  ActivityIndicator, Alert, ScrollView, StyleSheet, Switch,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { Link } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { supabase } from '../../src/lib/supabase';
import { Logo } from '../../src/components/Logo';
import { CaptchaWidget } from '../../src/components/CaptchaWidget';

const CAPTCHA_SITE_KEY = process.env.EXPO_PUBLIC_HCAPTCHA_SITE_KEY;
const REMEMBER_KEY = 'otonbu_remember_me';
const EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// Personel girişi: aynı auth, ayrı kapı. Girişten sonra root layout
// rolüne göre yönlendirir — personel yönetici paneline düşer; personel
// olmayan biri girerse müşteri paneline gider, yetki sızmaz (RLS).
export default function YoneticiGirisScreen() {
  const [email, setEmail] = useState('');
  const [sifre, setSifre] = useState('');
  const [beniHatirla, setBeniHatirla] = useState(true);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaKey, setCaptchaKey] = useState(0);    // token tek kullanımlık; hatada remount
  const [loading, setLoading] = useState(false);

  async function girisYap() {
    const mail = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(mail)) { Alert.alert('Hata', 'Geçerli bir e-posta girin'); return; }
    if (!sifre) { Alert.alert('Hata', 'Şifre gerekli'); return; }
    if (CAPTCHA_SITE_KEY && !captchaToken) {
      Alert.alert('Doğrulama', 'CAPTCHA doğrulamasını tamamlayın'); return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: mail,
      password: sifre,
      options: captchaToken ? { captchaToken } : undefined,
    });
    setLoading(false);

    if (error) {
      setCaptchaToken(null);
      setCaptchaKey(k => k + 1);
      Alert.alert('Giriş başarısız', error.message);
      return;
    }
    await SecureStore.setItemAsync(REMEMBER_KEY, beniHatirla ? '1' : '0');
    // Root layout rolüne göre (yonetim)/(main) yönlendirmesini yapar
  }

  return (
    <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
      <Logo width={160} showTagline={false} />
      <Text style={s.baslik}>Yönetici Girişi</Text>
      <Text style={s.alt}>OTONBU personeli ve şube yöneticileri</Text>

      <Text style={s.label}>E-posta</Text>
      <TextInput
        style={s.input}
        placeholder="ornek@otonbu.com"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />

      <Text style={s.label}>Şifre</Text>
      <TextInput
        style={s.input}
        placeholder="••••••••"
        secureTextEntry
        value={sifre}
        onChangeText={setSifre}
      />

      <View style={s.row}>
        <Switch value={beniHatirla} onValueChange={setBeniHatirla} />
        <Text style={s.rowText}>Beni hatırla</Text>
      </View>

      {CAPTCHA_SITE_KEY ? (
        <CaptchaWidget
          key={captchaKey}
          siteKey={CAPTCHA_SITE_KEY}
          onToken={setCaptchaToken}
          onError={() => setCaptchaToken(null)}
        />
      ) : null}

      <TouchableOpacity style={s.btn} onPress={girisYap} disabled={loading}>
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={s.btnText}>Giriş Yap</Text>}
      </TouchableOpacity>

      <Link href="/(auth)/sifremi-unuttum" asChild>
        <TouchableOpacity style={s.link}>
          <Text style={s.linkText}>Şifremi unuttum</Text>
        </TouchableOpacity>
      </Link>

      <Link href="/(auth)" asChild>
        <TouchableOpacity style={s.link}>
          <Text style={s.linkText}>← Müşteri girişine dön</Text>
        </TouchableOpacity>
      </Link>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, paddingTop: 48, backgroundColor: '#fff' },
  baslik: { fontSize: 22, fontWeight: '800', textAlign: 'center', color: '#0f172a' },
  alt: { textAlign: 'center', color: '#64748b', marginBottom: 28, marginTop: 4 },
  label: { fontSize: 13, color: '#475569', marginBottom: 6, marginTop: 4 },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 10,
    padding: 14, fontSize: 16, marginBottom: 16, backgroundColor: '#fff',
  },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  rowText: { marginLeft: 10, fontSize: 14, color: '#334155' },
  btn: {
    backgroundColor: '#1a56db', borderRadius: 10,
    padding: 16, alignItems: 'center', marginTop: 4,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  link: { alignItems: 'center', paddingVertical: 12 },
  linkText: { color: '#475569', fontSize: 14 },
});
