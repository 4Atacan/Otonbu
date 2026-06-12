import { useState } from 'react';
import {
  ActivityIndicator, Alert, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity,
} from 'react-native';
import { Link } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { supabase } from '../../src/lib/supabase';
import { Logo } from '../../src/components/Logo';
import { CaptchaWidget } from '../../src/components/CaptchaWidget';

const CAPTCHA_SITE_KEY = process.env.EXPO_PUBLIC_HCAPTCHA_SITE_KEY;
const REMEMBER_KEY = 'otonbu_remember_me';
const EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const SIFRE_MIN = 8;

// Akış: e-posta gir → 6 haneli kod e-postayla gelir (recovery şablonu
// {{ .Token }} içerir) → kod + yeni şifre → verifyOtp oturum açar,
// updateUser şifreyi değiştirir. Deep link gerekmez.
export default function SifremiUnuttumScreen() {
  const [adim, setAdim] = useState<'eposta' | 'kod'>('eposta');
  const [email, setEmail] = useState('');
  const [kod, setKod] = useState('');
  const [sifre, setSifre] = useState('');
  const [sifre2, setSifre2] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaKey, setCaptchaKey] = useState(0);    // token tek kullanımlık; hatada remount
  const [loading, setLoading] = useState(false);

  function captchaSifirla() {
    setCaptchaToken(null);
    setCaptchaKey(k => k + 1);
  }

  async function kodGonder() {
    const mail = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(mail)) { Alert.alert('Hata', 'Geçerli bir e-posta girin'); return; }
    if (CAPTCHA_SITE_KEY && !captchaToken) {
      Alert.alert('Doğrulama', 'CAPTCHA doğrulamasını tamamlayın'); return;
    }

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(mail, {
      ...(captchaToken ? { captchaToken } : {}),
    });
    setLoading(false);
    captchaSifirla();

    if (error) { Alert.alert('Hata', error.message); return; }
    setAdim('kod');
  }

  async function sifreYenile() {
    const mail = email.trim().toLowerCase();
    if (kod.trim().length !== 6) { Alert.alert('Hata', 'E-postadaki 6 haneli kodu girin'); return; }
    if (sifre.length < SIFRE_MIN) { Alert.alert('Hata', `Şifre en az ${SIFRE_MIN} karakter olmalı`); return; }
    if (!/[A-Za-z]/.test(sifre) || !/\d/.test(sifre)) {
      Alert.alert('Hata', 'Şifre harf ve rakam içermeli'); return;
    }
    if (sifre !== sifre2) { Alert.alert('Hata', 'Şifreler eşleşmiyor'); return; }

    setLoading(true);
    const { error: otpError } = await supabase.auth.verifyOtp({
      email: mail,
      token: kod.trim(),
      type: 'recovery',
    });
    if (otpError) {
      setLoading(false);
      Alert.alert('Hata', 'Kod geçersiz veya süresi dolmuş');
      return;
    }

    const { error: updError } = await supabase.auth.updateUser({ password: sifre });
    setLoading(false);

    if (updError) { Alert.alert('Hata', updError.message); return; }

    // verifyOtp oturum açtı; startup signOut'una takılmasın
    await SecureStore.setItemAsync(REMEMBER_KEY, '1');
    Alert.alert('Tamam', 'Şifren güncellendi, giriş yapıldı');
    // _layout onAuthStateChange ile (main)'e yönlendirir
  }

  return (
    <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
      <Logo width={160} showTagline={false} />
      <Text style={s.baslik}>Şifremi Unuttum</Text>

      {adim === 'eposta' ? (
        <>
          <Text style={s.aciklama}>
            Hesabının e-posta adresini gir; sana 6 haneli bir sıfırlama kodu gönderelim.
          </Text>

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

          {CAPTCHA_SITE_KEY ? (
            <CaptchaWidget
              key={captchaKey}
              siteKey={CAPTCHA_SITE_KEY}
              onToken={setCaptchaToken}
              onError={() => setCaptchaToken(null)}
            />
          ) : null}

          <TouchableOpacity style={s.btn} onPress={kodGonder} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.btnText}>Kod Gönder</Text>}
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={s.aciklama}>
            <Text style={s.bold}>{email.trim().toLowerCase()}</Text> adresine gönderilen
            6 haneli kodu ve yeni şifreni gir.
          </Text>

          <Text style={s.label}>Doğrulama Kodu</Text>
          <TextInput
            style={s.input}
            placeholder="123456"
            keyboardType="number-pad"
            maxLength={6}
            value={kod}
            onChangeText={setKod}
          />

          <Text style={s.label}>Yeni Şifre</Text>
          <TextInput
            style={s.input}
            placeholder={`En az ${SIFRE_MIN} karakter, harf + rakam`}
            secureTextEntry
            value={sifre}
            onChangeText={setSifre}
          />

          <Text style={s.label}>Yeni Şifre (Tekrar)</Text>
          <TextInput
            style={[s.input, sifre2.length > 0 && sifre !== sifre2 && s.inputError]}
            placeholder="Şifreyi tekrar girin"
            secureTextEntry
            value={sifre2}
            onChangeText={setSifre2}
          />

          <TouchableOpacity style={s.btn} onPress={sifreYenile} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.btnText}>Şifreyi Yenile</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={s.link} onPress={() => setAdim('eposta')}>
            <Text style={s.linkText}>Kod gelmedi mi? Tekrar gönder</Text>
          </TouchableOpacity>
        </>
      )}

      <Link href="/(auth)" asChild>
        <TouchableOpacity style={s.link}>
          <Text style={s.linkText}>← Giriş ekranına dön</Text>
        </TouchableOpacity>
      </Link>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, paddingTop: 60, backgroundColor: '#fff' },
  baslik: { fontSize: 22, fontWeight: '800', textAlign: 'center', color: '#0f172a', marginBottom: 12 },
  aciklama: { fontSize: 14, color: '#475569', textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  bold: { fontWeight: '700', color: '#0f172a' },
  label: { fontSize: 13, color: '#475569', marginBottom: 6, marginTop: 4 },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 10,
    padding: 14, fontSize: 16, marginBottom: 16, backgroundColor: '#fff',
  },
  inputError: { borderColor: '#dc2626' },
  btn: {
    backgroundColor: '#1a56db', borderRadius: 10,
    padding: 16, alignItems: 'center', marginTop: 4,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  link: { alignItems: 'center', paddingVertical: 14 },
  linkText: { color: '#475569', fontSize: 14 },
});
