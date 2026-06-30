import { View, Image, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../theme/ThemeContext';

// Her sekmenin üstünde SABİT navbar (içerik altından kayar, kendisi sabit kalır).
// Solda: yuvarlak şeffaf OTONBU amblemi — alt bir ekrandaysak geri butonu olur.
// Sağda: bildirim + profil ikonları (müşteri ve yönetim panelinde aynı).
const LOGO = require('../../assets/android-icon-foreground.png');

export function UstNavbar() {
  const insets = useSafeAreaInsets();
  const { renkler } = useTheme();
  const router = useRouter();
  const geri = router.canGoBack();

  return (
    <View style={{ paddingTop: insets.top, backgroundColor: renkler.bg }}>
      <View style={s.bar}>
        {geri ? (
          <TouchableOpacity onPress={() => router.back()} hitSlop={10} style={s.sol}>
            <Ionicons name="chevron-back" size={26} color={renkler.text} />
            <Image source={LOGO} style={s.logoKucuk} resizeMode="contain" />
          </TouchableOpacity>
        ) : (
          <Image source={LOGO} style={s.logo} resizeMode="contain" />
        )}

        <View style={s.sag}>
          <TouchableOpacity
            style={s.ikonBtn}
            onPress={() => Alert.alert('Bildirimler', 'Bildirimler yakında burada olacak.')}
          >
            <Ionicons name="notifications-outline" size={24} color={renkler.text} />
          </TouchableOpacity>
          <TouchableOpacity style={s.ikonBtn} onPress={() => router.push('/profil')}>
            <Ionicons name="person-circle-outline" size={30} color={renkler.text} />
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
});
