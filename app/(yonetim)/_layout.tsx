import { Redirect, Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/theme/ThemeContext';
import { useSession } from '../../src/hooks/useSession';
import { PERSONEL_ROLLER } from '../../src/types';

export default function YonetimLayout() {
  const { tema, renkler } = useTheme();
  const { profile } = useSession();

  // Müşteri rolü yönetici arayüzüne giremez (RLS zaten veri vermez,
  // bu sadece UI koruması)
  if (profile && !PERSONEL_ROLLER.includes(profile.rol)) {
    return <Redirect href="/(main)" />;
  }

  const admin = profile?.rol === 'admin';
  const subeSahibi = profile?.rol === 'sube_sahibi';
  // İşler ekranını sahada çalışan/gören roller görür (admin gözetim yapar, işi almaz)
  const isGoren = profile
    ? ['usta', 'kasa', 'sube_sahibi'].includes(profile.rol)
    : false;

  return (
    <>
      <StatusBar style={tema === 'koyu' ? 'light' : 'dark'} />
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: renkler.primary,
          tabBarInactiveTintColor: renkler.subtext,
          tabBarStyle: { backgroundColor: renkler.card, borderTopColor: renkler.border },
          headerStyle: { backgroundColor: renkler.card },
          headerTitleStyle: { color: renkler.text },
          headerShadowVisible: false,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Panel',
            tabBarIcon: ({ color, size }) => <Ionicons name="speedometer" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="hizmetler"
          options={{
            title: 'Hizmetler',
            href: admin ? undefined : null,  // sadece admin
            tabBarIcon: ({ color, size }) => <Ionicons name="construct" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="subeler"
          options={{
            title: 'Şubeler',
            href: admin ? undefined : null,  // sadece admin
            tabBarIcon: ({ color, size }) => <Ionicons name="business" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="slotlar"
          options={{
            title: 'Slotlar',
            href: subeSahibi ? undefined : null,  // şubeye bağlı yönetim
            tabBarIcon: ({ color, size }) => <Ionicons name="time" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="randevular"
          options={{
            title: 'Randevular',
            tabBarIcon: ({ color, size }) => <Ionicons name="calendar" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="isler"
          options={{
            title: 'İşler',
            href: isGoren ? undefined : null,  // usta/kasa/şube sahibi
            tabBarIcon: ({ color, size }) => <Ionicons name="construct-outline" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="fiyatlar"
          options={{
            title: 'Fiyatlar',
            href: subeSahibi ? undefined : null,  // şubeye özel fiyat = şube sahibi
            tabBarIcon: ({ color, size }) => <Ionicons name="cash-outline" size={size} color={color} />,
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
