import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/theme/ThemeContext';
import { UstNavbar } from '../../src/components/UstNavbar';
import { PuanRozeti } from '../../src/components/PuanRozeti';

export default function MainLayout() {
  const { renkler } = useTheme();

  return (
    <>
      {/* Üst navbar her sekmede marka mavisi → status bar ikonları beyaz. */}
      <StatusBar style="light" />
      <Tabs
        screenOptions={{
          // Sabit üst navbar (marka mavisi, her sekmede aynı) — içerik altından kayar.
          header: () => <UstNavbar mavi />,
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
          name="magaza"
          options={{
            title: 'Mağaza',
            tabBarIcon: ({ color, size }) => <Ionicons name="bag-handle" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="hizmetler"
          options={{
            title: 'Hizmetler',
            tabBarIcon: ({ color, size }) => <Ionicons name="car-sport" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="kampanyalar"
          options={{
            title: 'Kampanyalar',
            tabBarIcon: ({ color, size }) => <Ionicons name="pricetags" size={size} color={color} />,
          }}
        />
        {/* Sigorta navbardan kaldırıldı — ana sayfadaki "Sigorta" hızlı işleminden
            açılır. Rota korunur (href: null). */}
        <Tabs.Screen
          name="sigorta"
          options={{
            href: null,
            title: 'Sigorta',
            tabBarIcon: ({ color, size }) => <Ionicons name="shield-checkmark" size={size} color={color} />,
          }}
        />
        {/* Profil alt navbardan kaldırıldı — ana sayfada üst sağdaki profil
            ikonundan açılır (Starbucks düzeni). Rota korunur (href: null). */}
        <Tabs.Screen
          name="profil"
          options={{
            href: null,
            title: 'Profil',
            tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
          }}
        />
      </Tabs>
      {/* Alt navbarın sol üstünde sabit "OTONBU Puanı" butonu — her sekmede. */}
      <PuanRozeti />
    </>
  );
}
