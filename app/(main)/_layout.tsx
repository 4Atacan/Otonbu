import { Tabs } from 'expo-router';

export default function MainLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: '#1a56db' }}>
      <Tabs.Screen name="index" options={{ title: 'Ana Sayfa' }} />
      <Tabs.Screen name="araclar" options={{ title: 'Araçlarım' }} />
      <Tabs.Screen name="katalog" options={{ title: 'Hizmetler' }} />
    </Tabs>
  );
}
