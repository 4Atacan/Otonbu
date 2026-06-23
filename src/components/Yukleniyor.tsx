import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, ViewStyle } from 'react-native';

// Uygulama simgesi (şeffaf "o" markası) — yükleme sırasında döner.
// NOT: Bu projede reanimated worklet'leri ÇÖKÜYOR → çekirdek RN Animated kullanılır.
const MARK = require('../../assets/android-icon-foreground.png');

interface Props {
  boyut?: number;
  // Tam ekran ortalama (flex:1) yerine satır içi kullanım için
  satirIci?: boolean;
  style?: ViewStyle;
}

export function Yukleniyor({ boyut = 72, satirIci, style }: Props) {
  const donus = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(donus, {
        toValue: 1,
        duration: 1100,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    anim.start();
    return () => anim.stop();
  }, [donus]);

  const rotate = donus.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View style={[satirIci ? styles.satir : styles.merkez, style]}>
      <Animated.Image
        source={MARK}
        style={{ width: boyut, height: boyut, transform: [{ rotate }] }}
        resizeMode="contain"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  merkez: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  satir: { alignItems: 'center', justifyContent: 'center' },
});
