import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import WebView, { WebViewMessageEvent } from 'react-native-webview';

interface Props {
  siteKey: string;
  onToken: (token: string) => void;
  onError?: () => void;
}

// Görsel challenge açıldığında kutu büyütülür; 80px'te challenge kırpılıp
// çözülemez hale geliyordu (open/close callback'leri bunun için).
const KAPALI_YUKSEKLIK = 80;
const ACIK_YUKSEKLIK = 500;

const HTML = (siteKey: string) => `<!DOCTYPE html>
<html><head>
  <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no" />
  <script src="https://js.hcaptcha.com/1/api.js" async defer></script>
  <style>html,body{margin:0;padding:0;background:transparent;display:flex;align-items:flex-start;justify-content:center;height:100vh}</style>
</head><body>
  <div class="h-captcha"
       data-sitekey="${siteKey}"
       data-callback="onSuccess"
       data-error-callback="onErr"
       data-expired-callback="onErr"
       data-open-callback="onOpen"
       data-close-callback="onClose"
       data-theme="light"></div>
  <script>
    function post(m){window.ReactNativeWebView.postMessage(JSON.stringify(m))}
    function onSuccess(t){post({type:'token',token:t})}
    function onErr(){post({type:'error'})}
    function onOpen(){post({type:'open'})}
    function onClose(){post({type:'close'})}
  </script>
</body></html>`;

export function CaptchaWidget({ siteKey, onToken, onError }: Props) {
  const [yukseklik, setYukseklik] = useState(KAPALI_YUKSEKLIK);

  function handleMessage(e: WebViewMessageEvent) {
    try {
      const m = JSON.parse(e.nativeEvent.data);
      if (m.type === 'token' && typeof m.token === 'string') {
        setYukseklik(KAPALI_YUKSEKLIK);
        onToken(m.token);
      } else if (m.type === 'error') {
        setYukseklik(KAPALI_YUKSEKLIK);
        onError?.();
      } else if (m.type === 'open') {
        setYukseklik(ACIK_YUKSEKLIK);
      } else if (m.type === 'close') {
        setYukseklik(KAPALI_YUKSEKLIK);
      }
    } catch {}
  }

  return (
    <View style={[s.box, { height: yukseklik }]}>
      <WebView
        originWhitelist={['*']}
        source={{ html: HTML(siteKey), baseUrl: 'https://hcaptcha.com' }}
        onMessage={handleMessage}
        scalesPageToFit={false}
        scrollEnabled={false}
        style={s.web}
        javaScriptEnabled
        domStorageEnabled
      />
    </View>
  );
}

const s = StyleSheet.create({
  box: { alignSelf: 'stretch', marginBottom: 16 },
  web: { backgroundColor: 'transparent' },
});
