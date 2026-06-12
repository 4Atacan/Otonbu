import { Image, StyleSheet, View, Text } from 'react-native';

// Otonbu marka logosu — assets/logo.png (yatay, "otonbu garage" yazılı).
const LOGO = require('../../assets/logo.png');
const LOGO_ASPECT = 678 / 300;   // yaklaşık 2.26:1

interface Props {
  width?: number;
  showTagline?: boolean;
}

export function Logo({ width = 220, showTagline = true }: Props) {
  return (
    <View style={s.wrap}>
      <Image
        source={LOGO}
        style={{ width, height: width / LOGO_ASPECT }}
        resizeMode="contain"
      />
      {showTagline && <Text style={s.tagline}>Araç korumanın adresi</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { alignItems: 'center', marginBottom: 28 },
  tagline: { fontSize: 13, color: '#64748b', marginTop: 6 },
});
