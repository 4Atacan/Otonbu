import { useEffect, useRef } from 'react';
import { Animated, Easing, Image, View } from 'react-native';

// Ana sayfa puan rozeti: SABİT Togg + arkasında DÖNEN OTONBU amblemi.
// NOT: Bu projede reanimated çöküyor → çekirdek RN Animated (Yukleniyor gibi).
const TOGG = require('../../assets/togg_logo.png');
const MARKA = require('../../assets/android-icon-foreground.png');  // OTONBU amblemi ("o")
const ASPECT = 730 / 375;  // ~1.95:1

interface Props {
  boyut?: number;
}

export function OtonbuArac({ boyut = 120 }: Props) {
  const donus = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(donus, {
        toValue: 1, duration: 6000, easing: Easing.linear, useNativeDriver: true,
      }),
    );
    anim.start();
    return () => anim.stop();
  }, [donus]);

  const rotate = donus.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const aracG = boyut * 0.8;

  return (
    <View style={{ width: boyut, height: boyut, alignItems: 'center', justifyContent: 'center' }}>
      {/* arkada dönen OTONBU amblemi */}
      <Animated.Image
        source={MARKA}
        resizeMode="contain"
        style={{
          position: 'absolute', width: boyut, height: boyut,
          opacity: 0.5, transform: [{ rotate }],
        }}
      />
      {/* önde sabit Togg */}
      <Image
        source={TOGG}
        resizeMode="contain"
        style={{ width: aracG, height: aracG / ASPECT }}
      />
    </View>
  );
}
