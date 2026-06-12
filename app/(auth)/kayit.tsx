import { useState } from 'react';
import {
  ActivityIndicator, Alert, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { Logo } from '../../src/components/Logo';
import { CaptchaWidget } from '../../src/components/CaptchaWidget';
import { PhoneInput, toE164, isValidTrPhone } from '../../src/components/PhoneInput';

const CAPTCHA_SITE_KEY = process.env.EXPO_PUBLIC_HCAPTCHA_SITE_KEY;
const EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const SIFRE_MIN = 8;

export default function KayitScreen() {
  const [adSoyad, setAdSoyad] = useState('');
  const [telefon, setTelefon] = useState('');         // 10 hane ham rakam
  const [email, setEmail] = useState('');
  const [sifre, setSifre] = useState('');
  const [sifre2, setSifre2] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaKey, setCaptchaKey] = useState(0);    // token tek kullanımlık; hatada remount
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function kaydol() {
    const ad = adSoyad.trim();
    const mail = email.trim().toLowerCase();

    if (ad.length < 3) { Alert.alert('Hata', 'Ad Soyad zorunlu'); return; }
    if (!isValidTrPhone(telefon)) { Alert.alert('Hata', 'Telefon 5XX XXX XX XX formatında olmalı'); return; }
    if (!EMAIL_REGEX.test(mail)) { Alert.alert('Hata', 'Geçerli bir e-posta girin'); return; }
    if (sifre.length < SIFRE_MIN) { Alert.alert('Hata', `Şifre en az ${SIFRE_MIN} karakter olmalı`); return; }
    if (!/[A-Za-z]/.test(sifre) || !/\d/.test(sifre)) {
      Alert.alert('Hata', 'Şifre harf ve rakam içermeli'); return;
    }
    if (sifre !== sifre2) {
      Alert.alert('Hata', 'Şifreler eşleşmiyor'); return;
    }
    if (CAPTCHA_SITE_KEY && !captchaToken) {
      Alert.alert('Doğrulama', 'CAPTCHA doğrulamasını tamamlayın'); return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: mail,
      password: sifre,
      options: {
        data: { ad_soyad: ad, telefon: toE164(telefon) },  // handle_new_user trigger kullanır
        ...(captchaToken ? { captchaToken } : {}),
      },
    });
    setLoading(false);

    if (error) {
      setCaptchaToken(null);
      setCaptchaKey(k => k + 1);
      Alert.alert('Kayıt başarısız', error.message);
      return;
    }
    // E-posta doğrulama linki gönderildi
    router.replace({ pathname: '/(auth)/onay-bekliyor', params: { email: mail } });
  }

  return (
    <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
      <Logo width={160} showTagline={false} />
      <Text style={s.baslik}>Hesap Oluştur</Text>
      <Text style={s.alt}>OTONBU GARAGE'a hoş geldin</Text>

      <Text style={s.label}>Ad Soyad</Text>
      <TextInput
        style={s.input}
        placeholder="Ahmet Yılmaz"
        autoCapitalize="words"
        value={adSoyad}
        onChangeText={setAdSoyad}
      />

      <Text style={s.label}>Telefon</Text>
      <PhoneInput value={telefon} onChange={setTelefon} />

      <Text style={s.label}>E-posta</Text>
      <TextInput
        style={s.input}
        placeholder="ornek@email.com"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />

      <Text style={s.label}>Şifre</Text>
      <TextInput
        style={s.input}
        placeholder={`En az ${SIFRE_MIN} karakter, harf + rakam`}
        secureTextEntry
        value={sifre}
        onChangeText={setSifre}
      />

      <Text style={s.label}>Şifre (Tekrar)</Text>
      <TextInput
        style={[s.input, sifre2.length > 0 && sifre !== sifre2 && s.inputError]}
        placeholder="Şifreyi tekrar girin"
        secureTextEntry
        value={sifre2}
        onChangeText={setSifre2}
      />
      {sifre2.length > 0 && sifre !== sifre2 && (
        <Text style={s.errorText}>Şifreler eşleşmiyor</Text>
      )}

      {CAPTCHA_SITE_KEY ? (
        <CaptchaWidget
          key={captchaKey}
          siteKey={CAPTCHA_SITE_KEY}
          onToken={setCaptchaToken}
          onError={() => setCaptchaToken(null)}
        />
      ) : null}

      <TouchableOpacity style={s.btn} onPress={kaydol} disabled={loading}>
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={s.btnText}>Kayıt Ol</Text>}
      </TouchableOpacity>

      <Link href="/(auth)" asChild>
        <TouchableOpacity style={s.link}>
          <Text style={s.linkText}>Hesabın var mı? <Text style={s.linkStrong}>Giriş Yap</Text></Text>
        </TouchableOpacity>
      </Link>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, paddingTop: 40, backgroundColor: '#fff' },
  baslik: { fontSize: 22, fontWeight: '800', textAlign: 'center', color: '#0f172a' },
  alt: { textAlign: 'center', color: '#64748b', marginBottom: 28, marginTop: 4 },
  label: { fontSize: 13, color: '#475569', marginBottom: 6, marginTop: 4 },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 10,
    padding: 14, fontSize: 16, marginBottom: 16, backgroundColor: '#fff',
  },
  inputError: { borderColor: '#dc2626' },
  errorText: { color: '#dc2626', fontSize: 12, marginTop: -10, marginBottom: 12 },
  btn: {
    backgroundColor: '#1a56db', borderRadius: 10,
    padding: 16, alignItems: 'center', marginTop: 8,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  link: { alignItems: 'center', paddingVertical: 16 },
  linkText: { color: '#475569', fontSize: 14 },
  linkStrong: { color: '#1a56db', fontWeight: '700' },
});
