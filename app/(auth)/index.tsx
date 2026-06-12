import { useState } from 'react';
import {
  Alert, ActivityIndicator, ScrollView, StyleSheet, Switch,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { supabase } from '../../src/lib/supabase';
import { Logo } from '../../src/components/Logo';
import { CaptchaWidget } from '../../src/components/CaptchaWidget';
import { toE164, isValidTrPhone } from '../../src/components/PhoneInput';

const CAPTCHA_SITE_KEY = process.env.EXPO_PUBLIC_HCAPTCHA_SITE_KEY;
const REMEMBER_KEY = 'otonbu_remember_me';
const EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export default function GirisScreen() {
  const [kimlik, setKimlik] = useState('');           // email VEYA "+90..." veya 10 hane
  const [sifre, setSifre] = useState('');
  const [beniHatirla, setBeniHatirla] = useState(true);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaKey, setCaptchaKey] = useState(0);    // token tek kullanımlık; hatada remount
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  function captchaSifirla() {
    setCaptchaToken(null);
    setCaptchaKey(k => k + 1);
  }

  async function girisYap() {
    const k = kimlik.trim();
    if (!k || !sifre) { Alert.alert('Hata', 'E-posta/telefon ve şifre gerekli'); return; }
    if (CAPTCHA_SITE_KEY && !captchaToken) {
      Alert.alert('Doğrulama', 'CAPTCHA doğrulamasını tamamlayın'); return;
    }

    let email: string;
    if (EMAIL_REGEX.test(k)) {
      email = k.toLowerCase();
    } else {
      // Telefon olarak yorumla: sadece rakamları al, 10 hane Türkiye numarası bekle
      const digits = k.replace(/\D/g, '').replace(/^90/, '');
      if (!isValidTrPhone(digits)) {
        Alert.alert('Hata', 'Geçerli bir e-posta veya 10 haneli telefon girin');
        return;
      }
      const tel = toE164(digits);
      setLoading(true);
      const { data, error } = await supabase.rpc('telefon_to_email', { t: tel });
      if (error || !data) {
        setLoading(false);
        Alert.alert('Hata', 'Bu telefonla kayıt bulunamadı');
        return;
      }
      email = data;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: sifre,
      options: captchaToken ? { captchaToken } : undefined,
    });
    setLoading(false);

    if (error) {
      captchaSifirla();
      Alert.alert('Giriş başarısız', error.message);
      return;
    }

    await SecureStore.setItemAsync(REMEMBER_KEY, beniHatirla ? '1' : '0');
    // Başarılıysa _layout onAuthStateChange ile (main)'e yönlendirir
  }

  return (
    <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
      <Logo />

      <Text style={s.label}>E-posta veya Telefon</Text>
      <TextInput
        style={s.input}
        placeholder="ornek@email.com  veya  +90 523 285 29 60"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        value={kimlik}
        onChangeText={setKimlik}
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

      <Link href="/(auth)/kayit" asChild>
        <TouchableOpacity style={s.link}>
          <Text style={s.linkText}>Hesabın yok mu? <Text style={s.linkStrong}>Kayıt Ol</Text></Text>
        </TouchableOpacity>
      </Link>

    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, paddingTop: 60, backgroundColor: '#fff' },
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
  link: { alignItems: 'center', paddingVertical: 16 },
  linkText: { color: '#475569', fontSize: 14 },
  linkStrong: { color: '#1a56db', fontWeight: '700' },
});
