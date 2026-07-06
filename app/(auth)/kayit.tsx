import { uyari } from '../../src/lib/uyari';
import { useState } from 'react';
import {
  ActivityIndicator, Alert, ScrollView, StyleSheet, Switch,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../src/lib/supabase';
import { KVKK_VERSIYON } from '../../src/lib/kvkk';
import { Logo } from '../../src/components/Logo';
import { CaptchaWidget } from '../../src/components/CaptchaWidget';
import { KlavyeKapsa } from '../../src/components/KlavyeKapsa';
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
  const [riza, setRiza] = useState(false);            // KVKK açık rıza (zorunlu)
  const [ticari, setTicari] = useState(false);        // ticari ileti izni (ayrı, opsiyonel)
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function kaydol() {
    const ad = adSoyad.trim();
    const mail = email.trim().toLowerCase();

    if (ad.length < 3) { uyari('Hata', 'Ad Soyad zorunlu'); return; }
    if (!isValidTrPhone(telefon)) { uyari('Hata', 'Telefon 5XX XXX XX XX formatında olmalı'); return; }
    if (!EMAIL_REGEX.test(mail)) { uyari('Hata', 'Geçerli bir e-posta girin'); return; }
    if (sifre.length < SIFRE_MIN) { uyari('Hata', `Şifre en az ${SIFRE_MIN} karakter olmalı`); return; }
    if (!/[A-Za-z]/.test(sifre) || !/\d/.test(sifre)) {
      uyari('Hata', 'Şifre harf ve rakam içermeli'); return;
    }
    if (sifre !== sifre2) {
      uyari('Hata', 'Şifreler eşleşmiyor'); return;
    }
    if (CAPTCHA_SITE_KEY && !captchaToken) {
      uyari('Doğrulama', 'CAPTCHA doğrulamasını tamamlayın'); return;
    }
    if (!riza) {
      uyari('Onay gerekli', 'Devam etmek için KVKK Aydınlatma Metni\'ni okuyup açık rıza vermelisin.');
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: mail,
      password: sifre,
      options: {
        // E-posta doğrulama linki bu deep link'e döner → şık "Kayıt başarılı"
        // ekranı (app/(auth)/onay.tsx). Bu adres Supabase panel redirect
        // allowlist'inde ZATEN kayıtlı (otonbu://(auth)/onay) — panelde ek
        // ayar gerekmez. NOT: otonbu:// şeması yalnız gerçek/dev build'de
        // uygulamayı açar; Expo Go'da tarayıcı açamaz (Expo Go sınırı) ama
        // e-posta yine de sunucuda doğrulanır, kullanıcı dönüp giriş yapar.
        emailRedirectTo: 'otonbu://(auth)/onay',
        // handle_new_user trigger kullanır: ad/telefon + kayıt rızaları (consents)
        data: {
          ad_soyad: ad,
          telefon: toE164(telefon),
          kvkk_versiyon: KVKK_VERSIYON,
          ticari_ileti: ticari,
        },
        ...(captchaToken ? { captchaToken } : {}),
      },
    });
    setLoading(false);

    if (error) {
      setCaptchaToken(null);
      setCaptchaKey(k => k + 1);
      uyari('Kayıt başarısız', error.message);
      return;
    }
    // E-posta doğrulama linki gönderildi
    router.replace({ pathname: '/(auth)/onay-bekliyor', params: { email: mail } });
  }

  return (
    <KlavyeKapsa>
    <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
      <View style={{ alignItems: 'center', marginBottom: 18 }}><Logo width={150} sabitAcik /></View>
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

      {/* KVKK açık rıza (zorunlu) */}
      <TouchableOpacity style={s.rizaRow} activeOpacity={0.8} onPress={() => setRiza(v => !v)}>
        <Ionicons
          name={riza ? 'checkbox' : 'square-outline'}
          size={22}
          color={riza ? '#0b7bb5' : '#94a3b8'}
        />
        <Text style={s.rizaText}>
          <Text style={s.rizaLink} onPress={() => router.push('/kvkk')}>KVKK Aydınlatma Metni</Text>
          'ni okudum; kişisel verilerimin işlenmesine açık rıza veriyorum.
        </Text>
      </TouchableOpacity>

      {/* Ticari ileti (ayrı, opsiyonel) */}
      <View style={s.ticariRow}>
        <Switch value={ticari} onValueChange={setTicari} />
        <Text style={s.ticariText}>
          Kampanya ve fırsatlardan e-posta/SMS ile haberdar olmak istiyorum (opsiyonel).
        </Text>
      </View>

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
    </KlavyeKapsa>
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
  rizaRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginTop: 8 },
  rizaText: { flex: 1, fontSize: 13, lineHeight: 19, color: '#475569' },
  rizaLink: { color: '#0b7bb5', fontWeight: '700', textDecorationLine: 'underline' },
  ticariRow: { flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 14 },
  ticariText: { flex: 1, fontSize: 13, lineHeight: 19, color: '#475569' },
  btn: {
    backgroundColor: '#0b7bb5', borderRadius: 10,
    padding: 16, alignItems: 'center', marginTop: 8,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  link: { alignItems: 'center', paddingVertical: 16 },
  linkText: { color: '#475569', fontSize: 14 },
  linkStrong: { color: '#0b7bb5', fontWeight: '700' },
});
