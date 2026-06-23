import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';

// Üst başlık çubuğu (navbar) kaldırıldı. Onun yerine yalnızca durum çubuğu
// (notch/status bar) yüksekliği kadar, zeminle aynı renkte boş bir şerit
// konur — içerik çentiğin altına girmesin, ama "başlık barı" görünmesin diye.
// Sekme navigatöründe `header: () => <UstBosluk />` olarak kullanılır.
export function UstBosluk() {
  const insets = useSafeAreaInsets();
  const { renkler } = useTheme();
  return <View style={{ height: insets.top, backgroundColor: renkler.bg }} />;
}
