import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Giriş Yap', headerShown: false }} />
      <Stack.Screen name="otp" options={{ title: 'Doğrulama Kodu' }} />
    </Stack>
  );
}
