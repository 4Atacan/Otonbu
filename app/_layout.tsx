import { useEffect, useRef } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as SecureStore from 'expo-secure-store';
import { initSentry } from '../src/lib/sentry';
import { useSession } from '../src/hooks/useSession';
import { supabase } from '../src/lib/supabase';

const REMEMBER_KEY = 'otonbu_remember_me';

initSentry();
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { session, loading } = useSession();
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

    const inAuth = segments[0] === '(auth)';
    if (!session && !inAuth) router.replace('/(auth)');
    else if (session && inAuth) router.replace('/(main)');
  }, [session, loading, segments]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(main)" />
    </Stack>
  );
}
