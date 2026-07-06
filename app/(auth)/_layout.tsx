import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="kayit" options={{ title: 'Kayıt Ol', headerShown: true }} />
      <Stack.Screen name="onay-bekliyor" options={{ title: 'E-posta Doğrulama', headerShown: true }} />
      <Stack.Screen name="onay" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="sifremi-unuttum" options={{ title: 'Şifremi Unuttum', headerShown: true }} />
    </Stack>
  );
}
