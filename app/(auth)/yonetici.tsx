import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Link } from 'expo-router';
import { Logo } from '../../src/components/Logo';

export default function YoneticiGirisScreen() {
  return (
    <View style={s.container}>
      <Logo width={160} showTagline={false} />
      <Text style={s.baslik}>Yönetici Girişi</Text>
      <Text style={s.alt}>Bu bölüm yakında aktif olacak.</Text>

      <View style={s.placeholder}>
        <Text style={s.placeholderText}>
          OTONBU şube yöneticileri ve merkez admin paneli buradan açılacak.
        </Text>
      </View>

      <Link href="/(auth)" asChild>
        <TouchableOpacity style={s.link}>
          <Text style={s.linkText}>← Müşteri girişine dön</Text>
        </TouchableOpacity>
      </Link>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 24, paddingTop: 60, alignItems: 'center', backgroundColor: '#fff' },
  baslik: { fontSize: 22, fontWeight: '800', color: '#0f172a', marginBottom: 8 },
  alt: { color: '#64748b', fontSize: 14, marginBottom: 32 },
  placeholder: {
    backgroundColor: '#f1f5f9', borderRadius: 12,
    padding: 24, marginBottom: 32, alignItems: 'center',
  },
  placeholderText: {
    color: '#475569', fontSize: 14, textAlign: 'center', lineHeight: 22,
  },
  link: { padding: 12 },
  linkText: { color: '#1a56db', fontWeight: '600' },
});
