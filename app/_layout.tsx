import { useEffect, useRef } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as SecureStore from 'expo-secure-store';
import { initSentry } from '../src/lib/sentry';
import { useSession } from '../src/hooks/useSession';
import { supabase } from '../src/lib/supabase';
import { ThemeProvider } from '../src/theme/ThemeContext';

const REMEMBER_KEY = 'otonbu_remember_me';

initSentry();
SplashScreen.preventAutoHideAsync();

// Personel rolleri yönetici arayüzüne düşer; müşteri müşteri sekmelerine
const PERSONEL_ROLLER = ['admin', 'sube_sahibi', 'kasa', 'usta'];

export default function RootLayout() {
  const { session, profile, loading } = useSession();
  const segments = useSegments();
  const router = useRouter();
  const startupChecked = useRef(false);

  // İlk açılışta "beni hatırla" işaretli değilse session'ı kapat.
  useEffect(() => {
    if (startupChecked.current || loading) return;
    startupChecked.current = true;
    (async () => {
      const remember = await SecureStore.getItemAsync(REMEMBER_KEY);
      if (session && remember === '0') {
        await supabase.auth.signOut();
      }
    })();
  }, [loading, session]);

  useEffect(() => {
    if (loading) return;
    SplashScreen.hideAsync();

    const grup = segments[0];
    if (!session) {
      if (grup !== '(auth)') router.replace('/(auth)');
      return;
    }
    // Profil yüklenemezse müşteri arayüzüne düş (RLS zaten korur)
    const hedef = profile && PERSONEL_ROLLER.includes(profile.rol)
      ? '(yonetim)' : '(main)';
    if (grup !== hedef) {
      router.replace(hedef === '(yonetim)' ? '/(yonetim)' : '/(main)');
    }
  }, [session, profile, loading, segments]);

  return (
    <ThemeProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(main)" />
        <Stack.Screen name="(yonetim)" />
      </Stack>
    </ThemeProvider>
  );
}
