import { Image } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

// İki tema varyantı (şeffaf zemin):
//  - dark  = SİYAH yazılı logo → AÇIK zeminde kullanılır
//  - light = BEYAZ yazılı logo → KOYU zeminde kullanılır
const LOGO_KOYU_YAZI = require('../../assets/otonbu-garage-dark.png');   // açık zemin için
const LOGO_ACIK_YAZI = require('../../assets/otonbu-garage-light.png');  // koyu zemin için
const ASPECT = 3899 / 1544;  // ~2.525:1

interface Props {
  width?: number;
  // Zemin her zaman açık (ör. tema kullanmayan beyaz auth ekranları) → daima koyu yazılı logo
  sabitAcik?: boolean;
}

// Marka logosu — zemine göre doğru varyantı seçer, rozet/animasyon yoktur.
export function Logo({ width = 200, sabitAcik }: Props) {
  const { tema } = useTheme();
  const koyuZemin = !sabitAcik && tema === 'koyu';
  return (
    <Image
      source={koyuZemin ? LOGO_ACIK_YAZI : LOGO_KOYU_YAZI}
      style={{ width, height: width / ASPECT }}
      resizeMode="contain"
    />
  );
}
