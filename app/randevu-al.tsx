import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, ScrollView, StyleSheet,
  Text, TouchableOpacity, View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../src/lib/supabase';
import { useSession } from '../src/hooks/useSession';
import { useTheme } from '../src/theme/ThemeContext';
import { Branch, FiyatSonuc, MusaitSlot, Vehicle } from '../src/types';
import { cinsLabel } from '../src/data/arac-katalogu';

const GUN_SAYISI = 14;

function gunler(): Date[] {
  return Array.from({ length: GUN_SAYISI }, (_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + i);
    return d;
  });
}

export default function RandevuAlScreen() {
  const { serviceId, serviceAd } = useLocalSearchParams<{
    serviceId: string; serviceAd: string;
  }>();
  const { session } = useSession();
  const { renkler } = useTheme();
  const router = useRouter();

  const [subeler, setSubeler] = useState<Branch[]>([]);
  const [araclar, setAraclar] = useState<Vehicle[]>([]);
  const [ilkYukleme, setIlkYukleme] = useState(true);

  const [subeId, setSubeId] = useState<string | null>(null);
  const [aracId, setAracId] = useState<string | null>(null);
  const [gun, setGun] = useState<Date>(gunler()[0]);
  const [slotId, setSlotId] = useState<string | null>(null);

  const [slotlar, setSlotlar] = useState<MusaitSlot[]>([]);
  const [slotYukleniyor, setSlotYukleniyor] = useState(false);

  const [fiyat, setFiyat] = useState<FiyatSonuc | null>(null);
  const [fiyatYukleniyor, setFiyatYukleniyor] = useState(false);

  const [gonderiliyor, setGonderiliyor] = useState(false);

  // Temalı modal başlığı (üst navigator kök Stack).
  // useMemo şart: her render'da yeni nesne olursa <Stack.Screen options>
  // navigation.setOptions'ı sürekli tetikler → sonsuz render döngüsü
  // ("Maximum update depth exceeded").
  const headerOpts = useMemo(() => ({
    title: serviceAd ?? 'Randevu Al',
    headerShown: true,
    headerStyle: { backgroundColor: renkler.card },
    headerTitleStyle: { color: renkler.text },
    headerTintColor: renkler.primary,
    headerShadowVisible: false,
  }), [serviceAd, renkler]);

  // İlk veri: aktif şubeler + müşterinin araçları
  useEffect(() => {
    (async () => {
      const [subeRes, aracRes] = await Promise.all([
        supabase.from('branches').select('*').eq('aktif', true).order('ad'),
        supabase.from('vehicles').select('*').order('created_at', { ascending: false }),
      ]);
      const sb = (subeRes.data as Branch[]) ?? [];
      const ar = (aracRes.data as Vehicle[]) ?? [];
      setSubeler(sb);
      setAraclar(ar);
      if (sb.length === 1) setSubeId(sb[0].id);
      if (ar.length === 1) setAracId(ar[0].id);
      setIlkYukleme(false);
    })();
  }, []);

  // Slotlar: şube + gün seçilince doluluğuyla birlikte (RPC RLS'i aşar, agregat)
  useEffect(() => {
    if (!subeId) { setSlotlar([]); return; }
    setSlotId(null);
    setSlotYukleniyor(true);
    const bas = new Date(gun);
    const son = new Date(gun); son.setHours(23, 59, 59, 999);
    let iptal = false;
    supabase
      .rpc('musait_slotlar', {
        p_branch_id: subeId,
        p_bas: bas.toISOString(),
        p_son: son.toISOString(),
      })
      .then(({ data, error }) => {
        if (iptal) return;
        if (error) Alert.alert('Hata', error.message);
        else setSlotlar((data as MusaitSlot[]) ?? []);
        setSlotYukleniyor(false);
      });
    return () => { iptal = true; };
  }, [subeId, gun]);

  // Fiyat: şube + araç seçilince sunucudan (istemci fiyat hesaplamaz)
  const fiyatIstek = useRef(0);
  useEffect(() => {
    if (!subeId || !aracId || !serviceId) { setFiyat(null); return; }
    const istek = ++fiyatIstek.current;
    setFiyatYukleniyor(true);
    supabase.functions
      .invoke('fiyat-hesapla', {
        body: { service_id: serviceId, vehicle_id: aracId, branch_id: subeId },
      })
      .then(({ data, error }) => {
        if (istek !== fiyatIstek.current) return;  // eski istek — yok say
        if (error || !data || (data as any).hata) {
          setFiyat(null);
        } else {
          setFiyat(data as FiyatSonuc);
        }
        setFiyatYukleniyor(false);
      });
  }, [subeId, aracId, serviceId]);

  async function randevuOlustur() {
    if (!session?.user || !subeId || !aracId || !slotId || !serviceId) return;
    setGonderiliyor(true);
    const { error } = await supabase.from('appointments').insert({
      branch_id: subeId,
      user_id: session.user.id,    // RLS appt_create: user_id = auth.uid()
      vehicle_id: aracId,
      service_id: serviceId,
      slot_id: slotId,
      durum: 'onayli',             // tanımlı slot → otomatik onaylı
    });
    setGonderiliyor(false);
    if (error) { Alert.alert('Randevu alınamadı', error.message); return; }
    Alert.alert(
      'Randevu alındı',
      'Randevun onaylandı. Randevularım sekmesinden takip edebilirsin.',
      [{ text: 'Tamam', onPress: () => router.replace('/randevularim') }],
    );
  }

  const secilenSlot = slotlar.find(sl => sl.id === slotId);
  const tamam = subeId && aracId && slotId;

  if (ilkYukleme) {
    return (
      <>
        <Stack.Screen options={headerOpts} />
        <ActivityIndicator style={{ flex: 1, backgroundColor: renkler.bg }} color={renkler.primary} />
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={headerOpts} />
      <View style={[s.container, { backgroundColor: renkler.bg }]}>
        <ScrollView contentContainerStyle={s.icerik}>
          <Text style={[s.hizmetAd, { color: renkler.text }]}>{serviceAd}</Text>

          {/* 1) Şube */}
          <Text style={[s.bolum, { color: renkler.subtext }]}>ŞUBE</Text>
          {subeler.length === 0 ? (
            <Text style={[s.uyari, { color: renkler.subtext }]}>
              Şu an aktif şube yok. Lütfen daha sonra dene.
            </Text>
          ) : (
            subeler.map(sube => {
              const aktif = subeId === sube.id;
              return (
                <TouchableOpacity
                  key={sube.id}
                  style={[
                    s.secimKart,
                    { backgroundColor: renkler.card, borderColor: aktif ? renkler.primary : renkler.border },
                  ]}
                  onPress={() => setSubeId(sube.id)}
                >
                  <View style={s.secimSol}>
                    <Text style={[s.secimBaslik, { color: renkler.text }]}>{sube.ad}</Text>
                    {sube.adres ? (
                      <Text style={[s.secimAlt, { color: renkler.subtext }]}>{sube.adres}</Text>
                    ) : null}
                  </View>
                  {aktif && <Ionicons name="checkmark-circle" size={22} color={renkler.primary} />}
                </TouchableOpacity>
              );
            })
          )}

          {/* 2) Araç */}
          <Text style={[s.bolum, { color: renkler.subtext }]}>ARAÇ</Text>
          {araclar.length === 0 ? (
            <View style={[s.bosKutu, { backgroundColor: renkler.card }]}>
              <Text style={[s.uyari, { color: renkler.subtext }]}>
                Henüz aracın yok. Önce bir araç ekle.
              </Text>
              <TouchableOpacity
                style={[s.kucukBtn, { borderColor: renkler.primary }]}
                onPress={() => router.push('/araclar')}
              >
                <Text style={[s.kucukBtnText, { color: renkler.primary }]}>Araç Ekle</Text>
              </TouchableOpacity>
            </View>
          ) : (
            araclar.map(arac => {
              const aktif = aracId === arac.id;
              return (
                <TouchableOpacity
                  key={arac.id}
                  style={[
                    s.secimKart,
                    { backgroundColor: renkler.card, borderColor: aktif ? renkler.primary : renkler.border },
                  ]}
                  onPress={() => setAracId(arac.id)}
                >
                  <View style={s.secimSol}>
                    <Text style={[s.secimBaslik, { color: renkler.text }]}>{arac.plaka}</Text>
                    <Text style={[s.secimAlt, { color: renkler.subtext }]}>
                      {[arac.marka, arac.model].filter(Boolean).join(' ') || cinsLabel(arac.arac_cinsi)}
                    </Text>
                  </View>
                  {aktif && <Ionicons name="checkmark-circle" size={22} color={renkler.primary} />}
                </TouchableOpacity>
              );
            })
          )}

          {/* 3) Tarih */}
          <Text style={[s.bolum, { color: renkler.subtext }]}>TARİH</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.gunSerit}>
            {gunler().map(g => {
              const aktif = g.getTime() === gun.getTime();
              return (
                <TouchableOpacity
                  key={g.toISOString()}
                  style={[
                    s.gunBtn,
                    { backgroundColor: renkler.card, borderColor: renkler.border },
                    aktif && { backgroundColor: renkler.primary, borderColor: renkler.primary },
                  ]}
                  onPress={() => setGun(g)}
                >
                  <Text style={[s.gunUst, { color: aktif ? renkler.primaryText : renkler.subtext }]}>
                    {g.toLocaleDateString('tr-TR', { weekday: 'short' })}
                  </Text>
                  <Text style={[s.gunAlt, { color: aktif ? renkler.primaryText : renkler.text }]}>
                    {g.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* 4) Saat */}
          <Text style={[s.bolum, { color: renkler.subtext }]}>SAAT</Text>
          {!subeId ? (
            <Text style={[s.uyari, { color: renkler.subtext }]}>Önce şube seç.</Text>
          ) : slotYukleniyor ? (
            <ActivityIndicator color={renkler.primary} style={{ marginVertical: 16 }} />
          ) : slotlar.length === 0 ? (
            <Text style={[s.uyari, { color: renkler.subtext }]}>
              Bu gün için tanımlı slot yok. Başka gün dene.
            </Text>
          ) : (
            <View style={s.slotGrid}>
              {slotlar.map(sl => {
                const dolu = sl.dolu >= sl.kapasite;
                const aktif = slotId === sl.id;
                return (
                  <TouchableOpacity
                    key={sl.id}
                    disabled={dolu}
                    style={[
                      s.slotBtn,
                      { backgroundColor: renkler.card, borderColor: renkler.border },
                      aktif && { backgroundColor: renkler.primary, borderColor: renkler.primary },
                      dolu && { opacity: 0.4 },
                    ]}
                    onPress={() => setSlotId(sl.id)}
                  >
                    <Text style={[
                      s.slotText,
                      { color: aktif ? renkler.primaryText : renkler.text },
                    ]}>
                      {new Date(sl.baslangic).toLocaleTimeString('tr-TR', {
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </Text>
                    {dolu && <Text style={[s.slotDolu, { color: renkler.subtext }]}>dolu</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* 5) Özet + fiyat */}
          <View style={[s.ozet, { backgroundColor: renkler.card, borderColor: renkler.border }]}>
            <View style={s.ozetSatir}>
              <Text style={[s.ozetLabel, { color: renkler.subtext }]}>Tahmini ücret</Text>
              {fiyatYukleniyor ? (
                <ActivityIndicator color={renkler.primary} />
              ) : fiyat ? (
                <Text style={[s.ozetFiyat, { color: renkler.primary }]}>
                  {fiyat.fiyat.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                </Text>
              ) : (
                <Text style={[s.ozetAlt, { color: renkler.subtext }]}>Şube ve araç seç</Text>
              )}
            </View>
            {secilenSlot && (
              <Text style={[s.ozetAlt, { color: renkler.subtext }]}>
                {new Date(secilenSlot.baslangic).toLocaleString('tr-TR', {
                  weekday: 'long', day: 'numeric', month: 'long',
                  hour: '2-digit', minute: '2-digit',
                })}
              </Text>
            )}
          </View>
        </ScrollView>

        <TouchableOpacity
          style={[
            s.onayBtn,
            { backgroundColor: tamam ? renkler.primary : renkler.border },
          ]}
          disabled={!tamam || gonderiliyor}
          onPress={randevuOlustur}
        >
          {gonderiliyor ? (
            <ActivityIndicator color={renkler.primaryText} />
          ) : (
            <Text style={[s.onayText, { color: tamam ? renkler.primaryText : renkler.subtext }]}>
              Randevuyu Onayla
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  icerik: { padding: 16, paddingBottom: 24 },
  hizmetAd: { fontSize: 20, fontWeight: '800', marginBottom: 4 },
  bolum: {
    fontSize: 11, fontWeight: '700', letterSpacing: 1,
    marginTop: 20, marginBottom: 8,
  },
  uyari: { fontSize: 14, lineHeight: 20 },
  secimKart: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1.5, borderRadius: 12, padding: 14, marginBottom: 8,
  },
  secimSol: { flex: 1, paddingRight: 8 },
  secimBaslik: { fontSize: 16, fontWeight: '600' },
  secimAlt: { fontSize: 13, marginTop: 2 },
  bosKutu: { borderRadius: 12, padding: 16, alignItems: 'flex-start', gap: 12 },
  kucukBtn: { borderWidth: 1, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 16 },
  kucukBtnText: { fontSize: 14, fontWeight: '600' },
  gunSerit: { gap: 8, paddingVertical: 2 },
  gunBtn: {
    borderWidth: 1, borderRadius: 10,
    paddingVertical: 8, paddingHorizontal: 14, alignItems: 'center',
  },
  gunUst: { fontSize: 12 },
  gunAlt: { fontSize: 14, fontWeight: '700', marginTop: 2 },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slotBtn: {
    borderWidth: 1, borderRadius: 10,
    paddingVertical: 10, paddingHorizontal: 14, alignItems: 'center', minWidth: 76,
  },
  slotText: { fontSize: 15, fontWeight: '600' },
  slotDolu: { fontSize: 10, marginTop: 1 },
  ozet: {
    borderWidth: 1, borderRadius: 12, padding: 16, marginTop: 24,
  },
  ozetSatir: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ozetLabel: { fontSize: 14 },
  ozetFiyat: { fontSize: 22, fontWeight: '800' },
  ozetAlt: { fontSize: 13, marginTop: 6 },
  onayBtn: {
    margin: 16, marginTop: 8, borderRadius: 12,
    padding: 16, alignItems: 'center',
  },
  onayText: { fontSize: 16, fontWeight: '700' },
});
