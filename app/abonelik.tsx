import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert, ScrollView, StyleSheet,
  Text, TouchableOpacity, View,
} from 'react-native';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../src/lib/supabase';
import { useSession } from '../src/hooks/useSession';
import { useTheme } from '../src/theme/ThemeContext';
import { aboneOl, TASLAK_MODU } from '../src/lib/abonelik';
import { Branch, Entitlement, Plan, Subscription } from '../src/types';
import { Yukleniyor } from '../src/components/Yukleniyor';

const KADEME_ETIKET: Record<string, string> = {
  temel: 'Temel', orta: 'Orta', ust: 'Üst',
};

// Bu ayın ilk günü (entitlements.donem ile eşleşir)
function buDonem(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

export default function AbonelikScreen() {
  const { session } = useSession();
  const { renkler } = useTheme();
  const router = useRouter();

  const [subeler, setSubeler] = useState<Branch[]>([]);
  const [planlar, setPlanlar] = useState<Plan[]>([]);
  const [abonelikler, setAbonelikler] = useState<Subscription[]>([]);
  const [haklar, setHaklar] = useState<Entitlement[]>([]);
  const [subeId, setSubeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [gonderiliyor, setGonderiliyor] = useState<string | null>(null);

  const headerOpts = useMemo(() => ({
    title: 'Paketler',
    headerShown: true,
    headerStyle: { backgroundColor: renkler.card },
    headerTitleStyle: { color: renkler.text },
    headerTintColor: renkler.primary,
    headerShadowVisible: false,
  }), [renkler]);

  useFocusEffect(useCallback(() => { yukle(); }, [session?.user?.id]));

  async function yukle() {
    const uid = session?.user?.id;
    const donem = buDonem();
    const [subeRes, planRes, subRes, hakRes] = await Promise.all([
      supabase.from('branches').select('*').eq('aktif', true).order('ad'),
      supabase
        .from('plans')
        .select('*, plan_haklari ( id, aylik_adet, service_id, services ( ad ) )')
        .eq('aktif', true)
        .order('aylik_ucret'),
      uid
        ? supabase
            .from('subscriptions')
            .select('*, plans ( ad, kademe ), branches ( ad )')
            .eq('user_id', uid)
            .eq('durum', 'aktif')
        : Promise.resolve({ data: [] as Subscription[] }),
      uid
        ? supabase
            .from('entitlements')
            .select('*, services ( ad )')
            .eq('donem', donem)
            .gt('kalan_adet', 0)
        : Promise.resolve({ data: [] as Entitlement[] }),
    ]);

    const sb = (subeRes.data as Branch[]) ?? [];
    setSubeler(sb);
    setPlanlar((planRes.data as Plan[]) ?? []);
    setAbonelikler((subRes.data as Subscription[]) ?? []);
    setHaklar((hakRes.data as Entitlement[]) ?? []);
    if (sb.length === 1) setSubeId(prev => prev ?? sb[0].id);
    setLoading(false);
  }

  // Bir aboneliğin bu dönem kalan hakları (entitlement.subscription_id eşleşmesi)
  function abonelikHaklari(subId: string): Entitlement[] {
    return haklar.filter(h => h.subscription_id === subId);
  }

  // Abonelik iptali (eskiden profil ekranındaydı; tek yerde toplandı)
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
            else yukle();
          },
        },
      ],
    );
  }

  function aboneOlOnayi(plan: Plan) {
    if (!session?.user) {
      Alert.alert('Giriş gerekli', 'Abone olmak için giriş yapmalısın.');
      return;
    }
    if (!subeId) {
      Alert.alert('Şube seç', 'Hakların yalnızca seçtiğin şubede geçerli olur. Önce bir şube seç.');
      return;
    }
    const sube = subeler.find(b => b.id === subeId);
    Alert.alert(
      `${plan.ad} paketi`,
      `${sube?.ad ?? 'Seçili şube'} şubesinde aylık ${plan.aylik_ucret.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })} — abone olmak istiyor musun?` +
        (TASLAK_MODU ? '\n\n(Test modu: ödeme alınmadan abonelik başlar.)' : ''),
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Abone Ol', onPress: () => abonelikBaslat(plan) },
      ],
    );
  }

  async function abonelikBaslat(plan: Plan) {
    if (!subeId) return;
    setGonderiliyor(plan.id);
    const sonuc = await aboneOl(plan.id, subeId);
    setGonderiliyor(null);

    if (!sonuc.ok) {
      Alert.alert('Abonelik başlatılamadı', sonuc.hata ?? 'Bilinmeyen hata');
      return;
    }
    if (sonuc.taslak) {
      Alert.alert(
        'Aboneliğin başladı 🎉',
        'Bu ayın hakları tanımlandı. Randevu alırken "Abonelik hakkı" ile ücretsiz randevu oluşturabilirsin.',
        [{ text: 'Tamam', onPress: () => yukle() }],
      );
    } else if (sonuc.paymentPageUrl) {
      // GERÇEK mod: ödeme sayfasını aç (iyzico). WebView ekranı iyzico adımında eklenecek.
      router.push({ pathname: '/odeme', params: { url: sonuc.paymentPageUrl } });
    }
  }

  if (loading) return <Yukleniyor />;

  return (
    <>
      <Stack.Screen options={headerOpts} />
      <View style={[s.container, { backgroundColor: renkler.bg }]}>
        <ScrollView contentContainerStyle={s.icerik}>
          {TASLAK_MODU && (
            <View style={[s.taslakSerit, { backgroundColor: renkler.rozetBg, borderColor: renkler.primary }]}>
              <Ionicons name="flask" size={16} color={renkler.primary} />
              <Text style={[s.taslakText, { color: renkler.primary }]}>
                Test modu — ödeme entegrasyonu yakında. Abonelik ödeme alınmadan başlar.
              </Text>
            </View>
          )}

          {/* Aktif aboneliklerim + kalan haklar */}
          {abonelikler.length > 0 && (
            <>
              <Text style={[s.bolum, { color: renkler.subtext }]}>AKTİF ABONELİĞİM</Text>
              {abonelikler.map(ab => {
                const hk = abonelikHaklari(ab.id);
                return (
                  <View key={ab.id} style={[s.aktifKart, { backgroundColor: renkler.card, borderColor: renkler.primary }]}>
                    <View style={s.aktifUst}>
                      <Text style={[s.aktifBaslik, { color: renkler.text }]}>
                        {ab.plans?.ad ?? 'Paket'}
                      </Text>
                      <View style={[s.rozet, { backgroundColor: renkler.rozetBg }]}>
                        <Text style={[s.rozetText, { color: '#16a34a' }]}>Aktif</Text>
                      </View>
                    </View>
                    <Text style={[s.aktifAlt, { color: renkler.subtext }]}>
                      {ab.branches?.ad ?? ''}
                    </Text>
                    <View style={s.hakListe}>
                      {hk.length === 0 ? (
                        <Text style={[s.hakBos, { color: renkler.subtext }]}>
                          Bu ayın hakları tükendi.
                        </Text>
                      ) : (
                        hk.map(h => (
                          <View key={h.id} style={s.hakSatir}>
                            <Ionicons name="ticket-outline" size={16} color={renkler.primary} />
                            <Text style={[s.hakText, { color: renkler.text }]}>
                              {h.services?.ad ?? 'Hizmet'}
                            </Text>
                            <Text style={[s.hakAdet, { color: renkler.primary }]}>
                              {h.kalan_adet} hak
                            </Text>
                          </View>
                        ))
                      )}
                    </View>
                    <TouchableOpacity
                      style={[s.iptalBtn, { borderColor: renkler.danger }]}
                      onPress={() => abonelikIptalOnayi(ab)}
                    >
                      <Text style={[s.iptalBtnText, { color: renkler.danger }]}>Aboneliği İptal Et</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </>
          )}

          {/* Şube seçimi (hak şubeye kilitli) */}
          {subeler.length > 1 && (
            <>
              <Text style={[s.bolum, { color: renkler.subtext }]}>ŞUBE</Text>
              <Text style={[s.aciklama, { color: renkler.subtext }]}>
                Abonelik hakların yalnızca seçtiğin şubede geçerli olur.
              </Text>
              {subeler.map(sube => {
                const aktif = subeId === sube.id;
                return (
                  <TouchableOpacity
                    key={sube.id}
                    style={[s.subeKart, { backgroundColor: renkler.card, borderColor: aktif ? renkler.primary : renkler.border }]}
                    onPress={() => setSubeId(sube.id)}
                  >
                    <Text style={[s.subeAd, { color: renkler.text }]}>{sube.ad}</Text>
                    {aktif && <Ionicons name="checkmark-circle" size={22} color={renkler.primary} />}
                  </TouchableOpacity>
                );
              })}
            </>
          )}

          {/* Paketler */}
          <Text style={[s.bolum, { color: renkler.subtext }]}>PAKETLER</Text>
          {planlar.length === 0 ? (
            <Text style={[s.aciklama, { color: renkler.subtext }]}>
              Şu an satışta paket yok. Yakında burada olacak.
            </Text>
          ) : (
            planlar.map(plan => {
              const yukleniyor = gonderiliyor === plan.id;
              const haklari = plan.plan_haklari ?? [];
              return (
                <View key={plan.id} style={[s.planKart, { backgroundColor: renkler.card, borderColor: renkler.border }]}>
                  <View style={s.planUst}>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.planAd, { color: renkler.text }]}>{plan.ad}</Text>
                      <Text style={[s.planKademe, { color: renkler.subtext }]}>
                        {KADEME_ETIKET[plan.kademe] ?? plan.kademe} paket
                      </Text>
                    </View>
                    <View style={s.planFiyatGrup}>
                      <Text style={[s.planFiyat, { color: renkler.primary }]}>
                        {plan.aylik_ucret.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                      </Text>
                      <Text style={[s.planAy, { color: renkler.subtext }]}>/ay</Text>
                    </View>
                  </View>

                  {plan.aciklama ? (
                    <Text style={[s.planAciklama, { color: renkler.subtext }]}>{plan.aciklama}</Text>
                  ) : null}

                  {haklari.length > 0 && (
                    <View style={s.planHakListe}>
                      {haklari.map(h => (
                        <View key={h.id} style={s.planHakSatir}>
                          <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
                          <Text style={[s.planHakText, { color: renkler.text }]}>
                            Ayda {h.aylik_adet} × {h.services?.ad ?? 'Hizmet'}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}

                  <TouchableOpacity
                    style={[s.aboneBtn, { backgroundColor: renkler.primary }]}
                    disabled={yukleniyor}
                    onPress={() => aboneOlOnayi(plan)}
                  >
                    {yukleniyor ? (
                      <ActivityIndicator color={renkler.primaryText} />
                    ) : (
                      <Text style={[s.aboneBtnText, { color: renkler.primaryText }]}>Abone Ol</Text>
                    )}
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </ScrollView>
      </View>
    </>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  icerik: { padding: 16, paddingBottom: 32 },
  taslakSerit: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 8,
  },
  taslakText: { fontSize: 12, fontWeight: '600', flex: 1, lineHeight: 17 },
  bolum: {
    fontSize: 11, fontWeight: '700', letterSpacing: 1,
    marginTop: 20, marginBottom: 8,
  },
  aciklama: { fontSize: 13, lineHeight: 19, marginBottom: 8 },
  aktifKart: { borderWidth: 1.5, borderRadius: 12, padding: 16, marginBottom: 8 },
  aktifUst: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  aktifBaslik: { fontSize: 17, fontWeight: '700' },
  aktifAlt: { fontSize: 13, marginTop: 2 },
  rozet: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  rozetText: { fontSize: 12, fontWeight: '700' },
  hakListe: { marginTop: 12, gap: 8 },
  hakSatir: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  hakText: { fontSize: 14, flex: 1 },
  hakAdet: { fontSize: 14, fontWeight: '700' },
  hakBos: { fontSize: 13 },
  iptalBtn: {
    borderWidth: 1, borderRadius: 10, padding: 12,
    alignItems: 'center', marginTop: 14,
  },
  iptalBtnText: { fontSize: 14, fontWeight: '600' },
  subeKart: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1.5, borderRadius: 12, padding: 14, marginBottom: 8,
  },
  subeAd: { fontSize: 16, fontWeight: '600' },
  planKart: { borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 12 },
  planUst: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  planAd: { fontSize: 18, fontWeight: '800' },
  planKademe: { fontSize: 13, marginTop: 2 },
  planFiyatGrup: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  planFiyat: { fontSize: 20, fontWeight: '800' },
  planAy: { fontSize: 12 },
  planAciklama: { fontSize: 14, lineHeight: 20, marginTop: 8 },
  planHakListe: { marginTop: 12, gap: 6 },
  planHakSatir: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  planHakText: { fontSize: 14 },
  aboneBtn: { borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 16 },
  aboneBtnText: { fontSize: 15, fontWeight: '700' },
});
