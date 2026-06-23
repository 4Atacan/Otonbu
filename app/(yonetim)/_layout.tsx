import { Redirect, Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/theme/ThemeContext';
import { useSession } from '../../src/hooks/useSession';
import { PERSONEL_ROLLER } from '../../src/types';
import { UstBosluk } from '../../src/components/UstBosluk';

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
            title: 'Panel',
            tabBarIcon: ({ color, size }) => <Ionicons name="speedometer" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="hizmetler"
          options={{
            // admin = katalog; şube sahibi = fiyat + randevu programı (birleşik)
            title: admin ? 'Hizmetler' : 'Fiyat & Saat',
            href: admin || subeSahibi ? undefined : null,
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
          name="paketler"
          options={{
            title: 'Paketler',
            href: admin ? undefined : null,  // sadece admin (plan + hak yönetimi)
            tabBarIcon: ({ color, size }) => <Ionicons name="pricetags" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="randevular"
          options={{
            title: 'Randevular',  // sahada çalışanlar için içeride "İşler" sekmesi de var
            // Admin randevu onayı yapmaz (şube müdürü yapar) → admin'e gizli.
            // Admin bunun yerine Panel'den istediği şubenin raporunu çeker.
            href: admin ? null : undefined,
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
