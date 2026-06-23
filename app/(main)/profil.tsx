import { useCallback, useState } from 'react';
import {
  Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { useFocusEffect, useRouter, useSegments } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../src/lib/supabase';
import { useSession } from '../../src/hooks/useSession';
import { Tema, useTheme } from '../../src/theme/ThemeContext';
import { Entitlement, PERSONEL_ROLLER, Subscription } from '../../src/types';

const ROL_ADLARI: Record<string, string> = {
  musteri: 'Müşteri',
  sube_sahibi: 'Şube Sahibi',
  kasa: 'Kasa',
  usta: 'Usta',
  admin: 'Yönetici',
};

export default function ProfilScreen() {
  const { profile } = useSession();
  const { tema, renkler, setTema } = useTheme();
  const router = useRouter();
  const segments = useSegments();

  // Personel iki panel arasında geçebilir (örn. yöneticinin kendi aracı varsa)
  const personel = !!profile && PERSONEL_ROLLER.includes(profile.rol);
  const yonetimde = segments[0] === '(yonetim)';

  // Kendi aktif aboneliklerim + bu dönemin kalan hakları (iptal burada yapılır)
  const [abonelikler, setAbonelikler] = useState<Subscription[]>([]);
  const [haklar, setHaklar] = useState<Entitlement[]>([]);

  useFocusEffect(useCallback(() => { abonelikYukle(); }, [profile?.id]));

  async function abonelikYukle() {
    if (!profile?.id) { setAbonelikler([]); setHaklar([]); return; }
    const d = new Date();
    const donem = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    const [subRes, hakRes] = await Promise.all([
      supabase
        .from('subscriptions')
        .select('*, plans ( ad, kademe ), branches ( ad )')
        .eq('user_id', profile.id)
        .eq('durum', 'aktif'),
      supabase
        .from('entitlements')
        .select('*, services ( ad )')
        .eq('donem', donem)
        .gt('kalan_adet', 0),
    ]);
    setAbonelikler((subRes.data as Subscription[]) ?? []);
    setHaklar((hakRes.data as Entitlement[]) ?? []);
  }

  function abonelikIptalOnayi(ab: Subscription) {
    Alert.alert(
      'Aboneliği İptal Et',
      `${ab.plans?.ad ?? 'Paket'} aboneliğin iptal edilecek. Kalan hakların kullanılamaz hale gelir. Emin misin?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'İptal Et', style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.rpc('abonelik_iptal', { p_subscription_id: ab.id });
            if (error) Alert.alert('Hata', error.message);
            else abonelikYukle();
          },
        },
      ],
    );
  }

  function cikisOnayi() {
    Alert.alert('Çıkış Yap', 'Hesabından çıkış yapılacak. Emin misin?', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Çıkış Yap', style: 'destructive', onPress: () => supabase.auth.signOut() },
    ]);
  }

  const temalar: { value: Tema; label: string; ikon: 'sunny' | 'moon' }[] = [
    { value: 'acik', label: 'Aydınlık', ikon: 'sunny' },
    { value: 'koyu', label: 'Koyu', ikon: 'moon' },
  ];

  return (
    <ScrollView style={{ backgroundColor: renkler.bg }} contentContainerStyle={s.container}>
      {/* Kullanıcı kartı */}
      <View style={[s.kart, { backgroundColor: renkler.card }]}>
        <View style={[s.avatar, { backgroundColor: renkler.rozetBg }]}>
          <Ionicons name="person" size={28} color={renkler.primary} />
        </View>
        <Text style={[s.ad, { color: renkler.text }]}>
          {profile?.ad_soyad ?? '—'}
        </Text>
        <Text style={[s.rol, { color: renkler.subtext }]}>
          {ROL_ADLARI[profile?.rol ?? ''] ?? profile?.rol ?? ''}
        </Text>

        <View style={[s.ayrac, { backgroundColor: renkler.border }]} />

        <View style={s.bilgiSatir}>
          <Ionicons name="mail-outline" size={18} color={renkler.subtext} />
          <Text style={[s.bilgi, { color: renkler.text }]}>
            {profile?.email ?? '—'}
          </Text>
        </View>
        <View style={s.bilgiSatir}>
          <Ionicons name="call-outline" size={18} color={renkler.subtext} />
          <Text style={[s.bilgi, { color: renkler.text }]}>
            {profile?.telefon ?? '—'}
          </Text>
        </View>
      </View>

      {/* Abonelik — asıl yönetim (iptal) burada */}
      <Text style={[s.bolumBaslik, { color: renkler.subtext }]}>ABONELİK</Text>
      {abonelikler.length === 0 ? (
        <TouchableOpacity
          style={[s.gecisBtn, { backgroundColor: renkler.card, borderColor: renkler.primary }]}
          onPress={() => router.push('/abonelik')}
        >
          <Ionicons name="ticket-outline" size={20} color={renkler.primary} />
          <Text style={[s.gecisText, { color: renkler.primary }]}>Paketleri Gör</Text>
        </TouchableOpacity>
      ) : (
        <>
          {abonelikler.map(ab => {
            const hk = haklar.filter(h => h.subscription_id === ab.id);
            return (
              <View key={ab.id} style={[s.aboKart, { backgroundColor: renkler.card }]}>
                <View style={s.aboUst}>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.aboAd, { color: renkler.text }]}>{ab.plans?.ad ?? 'Paket'}</Text>
                    <Text style={[s.aboAlt, { color: renkler.subtext }]}>{ab.branches?.ad ?? ''}</Text>
                  </View>
                  <View style={[s.aboRozet, { backgroundColor: renkler.rozetBg }]}>
                    <Text style={[s.aboRozetText, { color: '#16a34a' }]}>Aktif</Text>
                  </View>
                </View>

                {hk.length > 0 && (
                  <View style={s.aboHaklar}>
                    {hk.map(h => (
                      <View key={h.id} style={s.aboHakSatir}>
                        <Ionicons name="ticket-outline" size={15} color={renkler.primary} />
                        <Text style={[s.aboHakText, { color: renkler.text }]}>
                          {h.services?.ad ?? 'Hizmet'}
                        </Text>
                        <Text style={[s.aboHakAdet, { color: renkler.primary }]}>{h.kalan_adet} hak</Text>
                      </View>
                    ))}
                  </View>
                )}

                <TouchableOpacity
                  style={[s.aboIptal, { borderColor: renkler.danger }]}
                  onPress={() => abonelikIptalOnayi(ab)}
                >
                  <Text style={[s.aboIptalText, { color: renkler.danger }]}>Aboneliği İptal Et</Text>
                </TouchableOpacity>
              </View>
            );
          })}
          <TouchableOpacity
            style={[s.paketBag, { borderColor: renkler.border }]}
            onPress={() => router.push('/abonelik')}
          >
            <Ionicons name="add-circle-outline" size={18} color={renkler.primary} />
            <Text style={[s.paketBagText, { color: renkler.primary }]}>Başka paket / şube ekle</Text>
          </TouchableOpacity>
        </>
      )}

      {/* Görünüm */}
      <Text style={[s.bolumBaslik, { color: renkler.subtext }]}>GÖRÜNÜM</Text>
      <View style={[s.kart, { backgroundColor: renkler.card }]}>
        <View style={s.temaRow}>
          {temalar.map(t => {
            const aktif = tema === t.value;
            return (
              <TouchableOpacity
                key={t.value}
                style={[
                  s.temaBtn,
                  { borderColor: renkler.border },
                  aktif && { backgroundColor: renkler.primary, borderColor: renkler.primary },
                ]}
                onPress={() => setTema(t.value)}
              >
                <Ionicons
                  name={t.ikon}
                  size={18}
                  color={aktif ? renkler.primaryText : renkler.subtext}
                />
                <Text
                  style={[
                    s.temaText,
                    { color: aktif ? renkler.primaryText : renkler.text },
                  ]}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Panel geçişi (sadece personel) */}
      {personel && (
        <>
          <Text style={[s.bolumBaslik, { color: renkler.subtext }]}>PANEL</Text>
          <TouchableOpacity
            style={[s.gecisBtn, { backgroundColor: renkler.card, borderColor: renkler.primary }]}
            onPress={() => router.replace(yonetimde ? '/(main)' : '/(yonetim)')}
          >
            <Ionicons
              name={yonetimde ? 'car-outline' : 'speedometer-outline'}
              size={20}
              color={renkler.primary}
            />
            <Text style={[s.gecisText, { color: renkler.primary }]}>
              {yonetimde ? 'Müşteri Paneline Geç' : 'Yönetici Paneline Geç'}
            </Text>
          </TouchableOpacity>
        </>
      )}

      {/* Hesap */}
      <Text style={[s.bolumBaslik, { color: renkler.subtext }]}>HESAP</Text>
      <TouchableOpacity
        style={[s.cikisBtn, { backgroundColor: renkler.card, borderColor: renkler.danger }]}
        onPress={cikisOnayi}
      >
        <Ionicons name="log-out-outline" size={20} color={renkler.danger} />
        <Text style={[s.cikisText, { color: renkler.danger }]}>Çıkış Yap</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { padding: 16, paddingBottom: 48 },
  kart: { borderRadius: 12, padding: 20, alignItems: 'center' },
  avatar: {
    width: 64, height: 64, borderRadius: 32,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  ad: { fontSize: 18, fontWeight: '700' },
  rol: { fontSize: 13, marginTop: 2 },
  ayrac: { alignSelf: 'stretch', height: 1, marginVertical: 16 },
  bilgiSatir: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    alignSelf: 'stretch', paddingVertical: 6,
  },
  bilgi: { fontSize: 15 },
  bolumBaslik: {
    fontSize: 11, fontWeight: '700', letterSpacing: 1,
    marginTop: 24, marginBottom: 8, marginLeft: 4,
  },
  temaRow: { flexDirection: 'row', gap: 10, alignSelf: 'stretch' },
  temaBtn: {
    flex: 1, flexDirection: 'row', gap: 8,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderRadius: 10, paddingVertical: 12,
  },
  temaText: { fontSize: 15, fontWeight: '600' },
  gecisBtn: {
    flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderRadius: 12, padding: 14,
  },
  gecisText: { fontSize: 15, fontWeight: '600' },
  aboKart: { borderRadius: 12, padding: 16, marginBottom: 10 },
  aboUst: { flexDirection: 'row', alignItems: 'center' },
  aboAd: { fontSize: 16, fontWeight: '700' },
  aboAlt: { fontSize: 13, marginTop: 2 },
  aboRozet: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  aboRozetText: { fontSize: 12, fontWeight: '700' },
  aboHaklar: { marginTop: 12, gap: 7 },
  aboHakSatir: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  aboHakText: { fontSize: 14, flex: 1 },
  aboHakAdet: { fontSize: 14, fontWeight: '700' },
  aboIptal: {
    borderWidth: 1, borderRadius: 10, padding: 12,
    alignItems: 'center', marginTop: 14,
  },
  aboIptalText: { fontSize: 14, fontWeight: '600' },
  paketBag: {
    flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderRadius: 12, padding: 13,
  },
  paketBagText: { fontSize: 14, fontWeight: '600' },
  cikisBtn: {
    flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderRadius: 12, padding: 14,
  },
  cikisText: { fontSize: 15, fontWeight: '600' },
});
