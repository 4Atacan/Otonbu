import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';
import { Logo } from '../../src/components/Logo';

// E-posta doğrulama linki (Supabase verify → emailRedirectTo) buraya döner.
// Bu ekrana ulaşmak = e-posta sunucu tarafında zaten doğrulandı. Kullanıcıya
// boş ekran yerine şık bir "Kayıt başarılı" karşılaması gösterir.
// Link süresi dolmuş/geçersizse Supabase URL'e error parametreleri ekler →
// onları yakalayıp hata durumunu gösteririz.
export default function OnayScreen() {
  const router = useRouter();
  const url = Linking.useURL();
  const [hata, setHata] = useState<string | null>(null);

  const hataMetni = useMemo(() => {
    if (!url) return null;
    // Supabase hatayı ya query'ye ya da fragment'e (#) koyar.
    const parsed = Linking.parse(url);
    const q = parsed.queryParams ?? {};
    let errDesc = (q.error_description ?? q.error) as string | undefined;
    if (!errDesc) {
      const hashIdx = url.indexOf('#');
      if (hashIdx >= 0) {
        const frag = new URLSearchParams(url.slice(hashIdx + 1));
        errDesc = frag.get('error_description') ?? frag.get('error') ?? undefined;
      }
    }
    return errDesc ? decodeURIComponent(errDesc.replace(/\+/g, ' ')) : null;
  }, [url]);

  useEffect(() => { setHata(hataMetni); }, [hataMetni]);

  const basarili = !hata;

  return (
    <View style={s.container}>
      <View style={{ alignItems: 'center', marginBottom: 24 }}>
        <Logo width={150} sabitAcik />
      </View>

      <View style={[s.ikonDaire, { backgroundColor: basarili ? '#dcfce7' : '#fee2e2' }]}>
        <Ionicons
          name={basarili ? 'checkmark-circle' : 'alert-circle'}
          size={64}
          color={basarili ? '#16a34a' : '#dc2626'}
        />
      </View>

      {basarili ? (
        <>
          <Text style={s.baslik}>Kayıt Başarılı! 🎉</Text>
          <Text style={s.aciklama}>
            E-posta adresin doğrulandı. Artık OTONBU GARAGE hesabınla giriş yapabilirsin.
          </Text>
        </>
      ) : (
        <>
          <Text style={s.baslik}>Doğrulama Başarısız</Text>
          <Text style={s.aciklama}>
            {hata}
            {'\n'}Linkin süresi dolmuş olabilir. Giriş ekranından yeni bir doğrulama e-postası isteyebilirsin.
          </Text>
        </>
      )}

      <TouchableOpacity style={s.btn} onPress={() => router.replace('/(auth)')}>
        <Text style={s.btnText}>Giriş Yap</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 24, paddingTop: 72, alignItems: 'center', backgroundColor: '#fff' },
  ikonDaire: {
    width: 112, height: 112, borderRadius: 56,
    alignItems: 'center', justifyContent: 'center', marginBottom: 24,
  },
  baslik: { fontSize: 24, fontWeight: '800', color: '#0f172a', marginBottom: 12, textAlign: 'center' },
  aciklama: { fontSize: 15, color: '#475569', textAlign: 'center', lineHeight: 23, marginBottom: 36 },
  btn: {
    backgroundColor: '#0b7bb5', borderRadius: 10,
    paddingVertical: 16, paddingHorizontal: 48, alignItems: 'center',
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
