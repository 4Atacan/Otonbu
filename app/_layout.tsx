import { useEffect, useRef } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as SecureStore from 'expo-secure-store';
import { initSentry } from '../src/lib/sentry';
import { useSession } from '../src/hooks/useSession';
import { supabase } from '../src/lib/supabase';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { SepetProvider } from '../src/context/SepetContext';
import { UyariProvider } from '../src/components/UyariProvider';
import { GeriLogo } from '../src/components/GeriLogo';
import { PERSONEL_ROLLER } from '../src/types';

const REMEMBER_KEY = 'otonbu_remember_me';

initSentry();
SplashScreen.preventAutoHideAsync();

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
    // Yalnızca giriş sonrası (auth grubundayken) rolüne göre yönlendir.
    // (main) ↔ (yonetim) arası geçişe karışma: personel müşteri panelini
    // de kullanabilir (yonetim layout'u müşteriyi dışarı atar).
    if (grup === '(auth)' || grup === undefined) {
      const personel = profile && PERSONEL_ROLLER.includes(profile.rol);
      router.replace(personel ? '/(yonetim)' : '/(main)');
    }
  }, [session, profile, loading, segments]);

  return (
    <ThemeProvider>
      <SepetProvider>
      {/* Başlığı olan (itilen) ekranlarda varsayılan geri okunun yerine OTONBU
          logolu geri butonu (headerLeft). Grup ekranlarında header kapalı olduğu
          için yalnız itilen kart/modal ekranlarda görünür. */}
      <Stack
        screenOptions={{
          headerShown: false,
          headerBackButtonDisplayMode: 'minimal',
          headerLeft: () => <GeriLogo />,
        }}
      >
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(main)" />
        <Stack.Screen name="(yonetim)" />
        {/* Hizmet detayı — sekmelerin üzerinde kart; başlık ekranın kendi
            Stack.Screen'inde ayarlanır */}
        <Stack.Screen name="hizmet-detay" />
        {/* Ürün detayı — Mağaza ürün kartına dokununca açılır kart */}
        <Stack.Screen name="urun-detay" />
        {/* Randevu alma akışı — sekmelerin üzerinde modal; başlık/tema
            ekranın kendi Stack.Screen'inde ayarlanır */}
        <Stack.Screen name="randevu-al" options={{ presentation: 'modal' }} />
        {/* Teklif usulü hizmet için "iletişime geç" formu — modal */}
        <Stack.Screen name="teklif-al" options={{ presentation: 'modal' }} />
        {/* Abonelik / paketler — sekmelerin üzerinde kart */}
        <Stack.Screen name="abonelik" />
        {/* iyzico ödeme sayfası (WebView) — gerçek modda abonelik akışından açılır */}
        <Stack.Screen name="odeme" options={{ presentation: 'modal' }} />
        {/* Araçlarım / Hizmetlerim — profilden açılır, sekmelerin üzerinde kart */}
        <Stack.Screen name="araclar" />
        <Stack.Screen name="randevularim" />
        {/* Yönetim: sipariş / sigorta teklifi — Panel'den açılır kartlar.
            (Ürünler ve Kampanyalar artık (yonetim) altında sekme.) */}
        <Stack.Screen name="siparisler" />
        <Stack.Screen name="teklifler" />
        <Stack.Screen name="hizmet-teklifleri" />
        {/* KVKK aydınlatma metni — kayıt ve profilden açılır */}
        <Stack.Screen name="kvkk" />
        {/* Puan mağazası — müşteri alt navbardaki puan rozetinden açılır */}
        <Stack.Screen name="puan-magaza" />
      </Stack>
      <UyariProvider />
      </SepetProvider>
    </ThemeProvider>
  );
}
