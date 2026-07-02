import { Image, StyleProp, ImageStyle } from 'react-native';

// OTONBU puanı simgesi = marka amblemi ("o"). Puan/puanla-al gösterilen her yerde
// yıldız yerine bu kullanılır. `renk` verilirse tek renge boyanır (tintColor) —
// çevredeki metin/arka planla uyum için (ör. primary üstünde beyaz, kart üstünde primary).
const AMBLEM = require('../../assets/android-icon-foreground.png');

export function PuanLogo({
  size = 16, renk, style,
}: {
  size?: number; renk?: string; style?: StyleProp<ImageStyle>;
}) {
  return (
    <Image
      source={AMBLEM}
      resizeMode="contain"
      style={[{ width: size, height: size }, renk ? { tintColor: renk } : null, style]}
    />
  );
}
