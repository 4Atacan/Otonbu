import { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { WebView, WebViewNavigation } from 'react-native-webview';
import { useTheme } from '../src/theme/ThemeContext';

// iyzico hosted CheckoutForm ödeme sayfası (GERÇEK mod). Abonelik ekranı
// paymentPageUrl ile buraya yönlendirir. Kart bilgisi YALNIZCA iyzico'nun
// kendi sayfasında girilir; uygulama hiçbir kart verisi görmez (CLAUDE.md kural 5).
//
// Ödeme bitince iyzico, callbackUrl'deki iyzico-webhook fonksiyonuna döner;
// fonksiyon sonucu sunucu-sunucu doğrular ve "otonbu://abonelik/sonuc" deep
// link'ine yönlendiren bir HTML döner. WebView bu özel şemayı yakalayıp kapanır.
export default function OdemeScreen() {
  const { url } = useLocalSearchParams<{ url: string }>();
  const { renkler } = useTheme();
  const router = useRouter();
  const [yukleniyor, setYukleniyor] = useState(true);

  const headerOpts = useMemo(() => ({
    title: 'Ödeme',
    headerShown: true,
    headerStyle: { backgroundColor: renkler.card },
    headerTitleStyle: { color: renkler.text },
    headerTintColor: renkler.primary,
    headerShadowVisible: false,
  }), [renkler]);

  // Ödeme tamamlanınca iyzico-webhook bizi otonbu:// şemasına yönlendirir.
  // http(s) dışı her isteği "akış bitti" say → ekranı kapat, abonelik tazelensin.
  function akisiBitir() {
    router.replace('/abonelik');
  }

  function istekDenetle(req: WebViewNavigation): boolean {
    if (req.url && !/^https?:\/\//i.test(req.url)) {
      akisiBitir();
      return false;  // özel şemayı WebView'da açma
    }
    return true;
  }

  if (!url) {
    // Parametresiz açılış (gerçek modda olmamalı) — abonelik ekranına dön.
    akisiBitir();
    return null;
  }

  return (
    <>
      <Stack.Screen options={headerOpts} />
      <View style={[s.container, { backgroundColor: renkler.bg }]}>
        <WebView
          source={{ uri: url }}
          onShouldStartLoadWithRequest={istekDenetle}
          onLoadEnd={() => setYukleniyor(false)}
          startInLoadingState
          style={{ backgroundColor: renkler.bg }}
        />
        {yukleniyor && (
          <View style={[s.yukleniyor, { backgroundColor: renkler.bg }]}>
            <ActivityIndicator size="large" color={renkler.primary} />
          </View>
        )}
      </View>
    </>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  yukleniyor: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
});
