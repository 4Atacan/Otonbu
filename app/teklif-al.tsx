import { uyari } from '../src/lib/uyari';
import { UyariKatmani } from '../src/components/UyariProvider';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert, ScrollView, StyleSheet,
  Switch, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../src/lib/supabase';
import { useSession } from '../src/hooks/useSession';
import { useTheme } from '../src/theme/ThemeContext';
import { Branch, Vehicle } from '../src/types';
import { cinsLabel } from '../src/data/arac-katalogu';
import { KlavyeKapsa } from '../src/components/KlavyeKapsa';

// teklif_usulu hizmetler için "iletişime geç" formu. Müşteri bilgilerini
// bırakır, service_quotes'a düşer, şube telefonla döner. (Sigorta akışıyla aynı.)
export default function TeklifAlScreen() {
  const { serviceId, serviceAd } = useLocalSearchParams<{
    serviceId: string; serviceAd: string;
  }>();
  const { session, profile } = useSession();
  const { renkler } = useTheme();
  const router = useRouter();

  const [subeler, setSubeler] = useState<Branch[]>([]);
  const [araclar, setAraclar] = useState<Vehicle[]>([]);

  const [subeId, setSubeId] = useState<string | null>(null);
  const [aracId, setAracId] = useState<string | null>(null);
  const [adSoyad, setAdSoyad] = useState('');
  const [telefon, setTelefon] = useState('');
  const [aracDetay, setAracDetay] = useState('');
  const [not, setNot] = useState('');
  const [riza, setRiza] = useState(false);
  const [ticari, setTicari] = useState(false);
  const [gonderiliyor, setGonderiliyor] = useState(false);

  const headerOpts = useMemo(() => ({
    title: serviceAd ?? 'Teklif Al',
    headerShown: true,
    headerStyle: { backgroundColor: renkler.card },
    headerTitleStyle: { color: renkler.text },
    headerTintColor: renkler.primary,
    headerShadowVisible: false,
  }), [serviceAd, renkler]);

  useEffect(() => {
    if (profile?.ad_soyad) setAdSoyad(profile.ad_soyad);
    if (profile?.telefon) setTelefon(profile.telefon);
  }, [profile?.ad_soyad, profile?.telefon]);

  useFocusEffect(useCallback(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const [subeRes, aracRes] = await Promise.all([
        supabase.from('branches').select('*').eq('aktif', true).order('ad'),
        user
          ? supabase.from('vehicles').select('*').eq('user_id', user.id)
              .eq('silindi_mi', false)
              .order('created_at', { ascending: false })
          : Promise.resolve({ data: [] as Vehicle[] }),
      ]);
      const sb = (subeRes.data as Branch[]) ?? [];
      setSubeler(sb);
      setAraclar((aracRes.data as Vehicle[]) ?? []);
      if (sb.length === 1) setSubeId(prev => prev ?? sb[0].id);
    })();
  }, []));

  const secilenArac = araclar.find(a => a.id === aracId);

  async function gonder() {
    if (!session?.user) return;
    if (!subeId) {
      uyari('Şube seç', 'Teklifi hangi şubeden almak istediğini seç.');
      return;
    }
    if (!riza) {
      uyari('Onay gerekli', 'Devam etmek için kişisel verilerinin işlenmesine açık rıza vermelisin.');
      return;
    }
    if (!adSoyad.trim() || !telefon.trim()) {
      uyari('Eksik bilgi', 'Ad soyad ve telefon zorunludur (sana dönebilmemiz için).');
      return;
    }
    const aracDetayMetni = secilenArac
      ? [secilenArac.marka, secilenArac.model].filter(Boolean).join(' ') ||
        cinsLabel(secilenArac.arac_cinsi)
      : aracDetay.trim() || null;

    setGonderiliyor(true);
    const { error } = await supabase.from('service_quotes').insert({
      user_id: session.user.id,
      branch_id: subeId,
      service_id: serviceId,
      vehicle_id: aracId,
      ad_soyad: adSoyad.trim(),
      telefon: telefon.trim(),
      plaka: secilenArac?.plaka ?? null,
      arac_detay: aracDetayMetni,
      musteri_not: not.trim() || null,
      kvkk_riza_at: new Date().toISOString(),
      ticari_ileti_izni: ticari,
    });
    setGonderiliyor(false);
    if (error) { uyari('Gönderilemedi', error.message); return; }

    uyari(
      'Teklif talebin alındı',
      'En kısa sürede sana dönüp bu hizmet için uygun fiyat teklifini ileteceğiz.',
      [{ text: 'Tamam', onPress: () => router.back() }],
    );
  }

  return (
    <>
      <Stack.Screen options={headerOpts} />
      <KlavyeKapsa style={{ backgroundColor: renkler.bg }}>
      <ScrollView style={{ backgroundColor: renkler.bg }} contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
        <View style={[s.ustKart, { backgroundColor: renkler.card }]}>
          <Ionicons name="chatbubble-ellipses" size={28} color={renkler.primary} />
          <Text style={[s.ustBaslik, { color: renkler.text }]}>{serviceAd ?? 'Fiyat Teklifi'}</Text>
          <Text style={[s.ustAlt, { color: renkler.subtext }]}>
            Bu hizmette fiyat aracına göre değişir. Bilgilerini bırak, en uygun teklifi
            hazırlayıp sana dönelim.
          </Text>
        </View>

        <Text style={[s.bolum, { color: renkler.subtext }]}>ARAÇ</Text>
        {araclar.length > 0 ? (
          araclar.map(a => {
            const secili = aracId === a.id;
            return (
              <TouchableOpacity
                key={a.id}
                style={[
                  s.secimKart,
                  { backgroundColor: renkler.card, borderColor: secili ? renkler.primary : renkler.border },
                ]}
                onPress={() => setAracId(secili ? null : a.id)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[s.secimBaslik, { color: renkler.text }]}>{a.plaka}</Text>
                  <Text style={[s.secimAlt, { color: renkler.subtext }]}>
                    {[a.marka, a.model].filter(Boolean).join(' ') || cinsLabel(a.arac_cinsi)}
                  </Text>
                </View>
                {secili && <Ionicons name="checkmark-circle" size={22} color={renkler.primary} />}
              </TouchableOpacity>
            );
          })
        ) : null}
        {!aracId && (
          <TextInput
            style={[s.input, { borderColor: renkler.border, backgroundColor: renkler.input, color: renkler.text }]}
            placeholder="Araç (marka / model / yıl) — örn. Fiat Egea 2021"
            placeholderTextColor={renkler.subtext}
            value={aracDetay}
            onChangeText={setAracDetay}
          />
        )}

        <Text style={[s.bolum, { color: renkler.subtext }]}>ŞUBE *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.subeSerit}>
          {subeler.map(sube => {
            const secili = subeId === sube.id;
            return (
              <TouchableOpacity
                key={sube.id}
                style={[
                  s.subeBtn,
                  { backgroundColor: secili ? renkler.primary : renkler.card, borderColor: secili ? renkler.primary : renkler.border },
                ]}
                onPress={() => setSubeId(sube.id)}
              >
                <Text style={[s.subeBtnText, { color: secili ? renkler.primaryText : renkler.text }]}>{sube.ad}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Text style={[s.bolum, { color: renkler.subtext }]}>İLETİŞİM</Text>
        <Text style={[s.label, { color: renkler.subtext }]}>Ad Soyad *</Text>
        <TextInput
          style={[s.input, { borderColor: renkler.border, backgroundColor: renkler.input, color: renkler.text }]}
          placeholder="Ad Soyad"
          placeholderTextColor={renkler.subtext}
          value={adSoyad}
          onChangeText={setAdSoyad}
        />
        <Text style={[s.label, { color: renkler.subtext }]}>Telefon *</Text>
        <TextInput
          style={[s.input, { borderColor: renkler.border, backgroundColor: renkler.input, color: renkler.text }]}
          placeholder="05xx xxx xx xx"
          placeholderTextColor={renkler.subtext}
          keyboardType="phone-pad"
          value={telefon}
          onChangeText={setTelefon}
        />
        <Text style={[s.label, { color: renkler.subtext }]}>Not (opsiyonel)</Text>
        <TextInput
          style={[s.input, s.cokSatir, { borderColor: renkler.border, backgroundColor: renkler.input, color: renkler.text }]}
          placeholder="Aracın durumu, beklentin vb."
          placeholderTextColor={renkler.subtext}
          multiline
          value={not}
          onChangeText={setNot}
        />

        <TouchableOpacity style={s.onayRow} activeOpacity={0.8} onPress={() => setRiza(v => !v)}>
          <Ionicons
            name={riza ? 'checkbox' : 'square-outline'}
            size={22}
            color={riza ? renkler.primary : renkler.subtext}
          />
          <Text style={[s.onayText, { color: renkler.text }]}>
            Teklif verilebilmesi için kişisel verilerimin (ad, telefon, araç bilgisi)
            işlenmesine açık rıza veriyorum.
          </Text>
        </TouchableOpacity>

        <View style={s.switchRow}>
          <Switch value={ticari} onValueChange={setTicari} />
          <Text style={[s.switchText, { color: renkler.text }]}>
            Kampanya ve fırsatlardan haberdar olmak istiyorum (ticari ileti).
          </Text>
        </View>

        <TouchableOpacity
          style={[s.gonderBtn, { backgroundColor: riza ? renkler.primary : renkler.border }]}
          onPress={gonder}
          disabled={!riza || gonderiliyor}
        >
          {gonderiliyor
            ? <ActivityIndicator color={renkler.primaryText} />
            : <Text style={[s.gonderBtnText, { color: riza ? renkler.primaryText : renkler.subtext }]}>Teklif İste</Text>}
        </TouchableOpacity>
      </ScrollView>
      </KlavyeKapsa>
      <UyariKatmani />
    </>
  );
}

const s = StyleSheet.create({
  container: { padding: 16, paddingBottom: 48 },
  ustKart: { borderRadius: 12, padding: 20, alignItems: 'center' },
  ustBaslik: { fontSize: 18, fontWeight: '800', marginTop: 10, textAlign: 'center' },
  ustAlt: { fontSize: 13, textAlign: 'center', marginTop: 6, lineHeight: 19 },
  bolum: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginTop: 24, marginBottom: 8, marginLeft: 4 },
  secimKart: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderRadius: 12, padding: 14, marginBottom: 8,
  },
  secimBaslik: { fontSize: 16, fontWeight: '600' },
  secimAlt: { fontSize: 13, marginTop: 2 },
  subeSerit: { gap: 8, paddingVertical: 2 },
  subeBtn: { borderWidth: 1.5, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 16 },
  subeBtnText: { fontSize: 14, fontWeight: '600' },
  label: { fontSize: 14, marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderRadius: 10, padding: 13, fontSize: 16 },
  cokSatir: { minHeight: 80, textAlignVertical: 'top' },
  onayRow: { flexDirection: 'row', gap: 10, marginTop: 24, alignItems: 'flex-start' },
  onayText: { flex: 1, fontSize: 13, lineHeight: 19 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16 },
  switchText: { flex: 1, fontSize: 13, lineHeight: 19 },
  gonderBtn: { borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 28 },
  gonderBtnText: { fontSize: 16, fontWeight: '700' },
});
