import { Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../theme/ThemeContext';

// OTONBU logolu geri-dön butonu. Sekme üstüne itilen tüm ekranlarda
// (kök Stack headerLeft) varsayılan geri okunun yerine kullanılır.
// Arka planı olmayan yuvarlak amblem.
const LOGO = require('../../assets/android-icon-foreground.png');

export function GeriLogo() {
  const router = useRouter();
  const { renkler } = useTheme();

  // Geri gidilemiyorsa (yığının kökü) buton gösterme.
  if (!router.canGoBack()) return null;

  return (
    <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={s.btn}>
      <Ionicons name="chevron-back" size={26} color={renkler.primary} />
      <Image source={LOGO} style={s.logo} resizeMode="contain" />
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  btn: { flexDirection: 'row', alignItems: 'center', paddingRight: 8 },
  logo: { width: 32, height: 32, marginLeft: 2 },
});
