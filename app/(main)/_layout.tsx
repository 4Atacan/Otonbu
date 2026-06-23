import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/theme/ThemeContext';
import { UstBosluk } from '../../src/components/UstBosluk';

export default function MainLayout() {
  const { tema, renkler } = useTheme();

  return (
    <>
      <StatusBar style={tema === 'koyu' ? 'light' : 'dark'} />
      <Tabs
        screenOptions={{
          // Başlık barı yok — yalnızca durum çubuğu kadar bg şeridi (UstBosluk)
          header: () => <UstBosluk />,
          tabBarActiveTintColor: renkler.primary,
          tabBarInactiveTintColor: renkler.subtext,
          tabBarStyle: { backgroundColor: renkler.card, borderTopColor: renkler.border },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Ana Sayfa',
            tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="araclar"
          options={{
            title: 'Araçlarım',
            tabBarIcon: ({ color, size }) => <Ionicons name="car" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="randevularim"
          options={{
            title: 'Randevularım',
            tabBarIcon: ({ color, size }) => <Ionicons name="calendar" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="profil"
          options={{
            title: 'Profil',
            tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
          }}
        />
      </Tabs>
    </>
  );
}
