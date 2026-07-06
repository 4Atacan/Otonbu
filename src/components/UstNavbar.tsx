import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../theme/ThemeContext';
import { useBildirim } from '../context/BildirimContext';

// Her sekmenin üstünde SABİT navbar (içerik altından kayar, kendisi sabit kalır).
// Solda: yuvarlak şeffaf OTONBU amblemi — alt bir ekrandaysak geri butonu olur.
// Sağda: bildirim + profil ikonları (müşteri ve yönetim panelinde aynı).
const LOGO = require('../../assets/android-icon-foreground.png');

// mavi=true → koyu marka hero'suyla kesintisiz görünüm için navbar marka mavisi
// zeminli, amblem + ikonlar beyaz (yalnız ana sayfada kullanılır).
export function UstNavbar({ mavi = false }: { mavi?: boolean }) {
  const insets = useSafeAreaInsets();
  const { renkler } = useTheme();
  const { okunmamis } = useBildirim();
  const router = useRouter();
  const geri = router.canGoBack();
  const bg = mavi ? renkler.primary : renkler.bg;
  const ikon = mavi ? '#ffffff' : renkler.text;
  const logoStil = mavi ? { tintColor: '#ffffff' } : null;

  return (
    <View style={{ paddingTop: insets.top, backgroundColor: bg }}>
      <View style={s.bar}>
        {geri ? (
          <TouchableOpacity onPress={() => router.back()} hitSlop={10} style={s.sol}>
            <Ionicons name="chevron-back" size={26} color={ikon} />
            <Image source={LOGO} style={[s.logoKucuk, logoStil]} resizeMode="contain" />
          </TouchableOpacity>
        ) : (
          <Image source={LOGO} style={[s.logo, logoStil]} resizeMode="contain" />
        )}

        <View style={s.sag}>
          <TouchableOpacity
            style={s.ikonBtn}
            onPress={() => router.push('/bildirimler')}
          >
            <Ionicons name="notifications-outline" size={24} color={ikon} />
            {okunmamis > 0 && (
              <View style={[s.rozet, { backgroundColor: renkler.danger }]}>
                <Text style={s.rozetText}>{okunmamis > 9 ? '9+' : okunmamis}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={s.ikonBtn} onPress={() => router.push('/profil')}>
            <Ionicons name="person-circle-outline" size={30} color={ikon} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  bar: {
    height: 52, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 14,
  },
  sol: { flexDirection: 'row', alignItems: 'center' },
  logo: { width: 40, height: 40 },
  logoKucuk: { width: 34, height: 34, marginLeft: 2 },
  sag: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ikonBtn: { padding: 4 },
  rozet: {
    position: 'absolute', top: 0, right: 0,
    minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 3,
    alignItems: 'center', justifyContent: 'center',
  },
  rozetText: { color: '#fff', fontSize: 10, fontWeight: '800' },
});
