// Bildirim yardımcıları: Expo push token kaydı + ön planda bildirim davranışı.
// NOT: Expo Go (SDK 53+) uzak push DESTEKLEMEZ — token alma orada hata fırlatır,
// sessizce yutulur. Uygulama içi bildirim merkezi (notifications tablosu +
// Realtime rozet) Expo Go'da da çalışır; push, dev build alınınca kendiliğinden
// devreye girer (token kaydolur, sunucu pg_net ile Expo'ya POST atar).
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// Uygulama AÇIKKEN gelen push da banner olarak görünsün
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// İzin iste → Expo push token al → users.expo_push_token'a yaz.
// Giriş sonrası bir kez çağrılır; her adım başarısızlığa dayanıklıdır.
export async function pushKaydet(userId: string): Promise<void> {
  try {
    if (!Device.isDevice) return; // emülatör push alamaz

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Genel',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
      });
    }

    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      ({ status } = await Notifications.requestPermissionsAsync());
    }
    if (status !== 'granted') return;

    const projectId: string | undefined =
      Constants.expoConfig?.extra?.eas?.projectId;
    const { data: token } = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    // Cihaz push adresi KİŞİSEL VERİ sayılır; hesap silme + çıkışta temizlenir
    await supabase.from('users')
      .update({ expo_push_token: token })
      .eq('id', userId);
  } catch {
    // Expo Go / izin reddi / ağ hatası → push'suz devam (in-app bildirim çalışır)
  }
}

// Çıkışta token'ı sil: oturumu kapanan cihaza push gitmesin
export async function pushTokenTemizle(userId: string): Promise<void> {
  try {
    await supabase.from('users')
      .update({ expo_push_token: null })
      .eq('id', userId);
  } catch {
    // sessiz — çıkışı engelleme
  }
}
