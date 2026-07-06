import { uyari } from '../../src/lib/uyari';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, ScrollView, StyleSheet,
  Switch, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../src/lib/supabase';
import { yukle as dosyaYukle } from '../../src/lib/storage';
import { useSession } from '../../src/hooks/useSession';
import { useTheme } from '../../src/theme/ThemeContext';
import { Branch, SigortaTip, Vehicle } from '../../src/types';
import { cinsLabel } from '../../src/data/arac-katalogu';
import { KlavyeKapsa } from '../../src/components/KlavyeKapsa';

const TIPLER: { value: SigortaTip; label: string; alt: string }[] = [
  { value: 'kasko', label: 'Kasko', alt: 'Aracın için tam koruma' },
  { value: 'trafik', label: 'Trafik', alt: 'Zorunlu trafik sigortası' },
];

export default function SigortaScreen() {
  const { session, profile } = useSession();
  const { renkler } = useTheme();
  const router = useRouter();

  const [subeler, setSubeler] = useState<Branch[]>([]);
  const [araclar, setAraclar] = useState<Vehicle[]>([]);

  const [tip, setTip] = useState<SigortaTip>('kasko');
  const [aracId, setAracId] = useState<string | null>(null);
  const [subeId, setSubeId] = useState<string | null>(null);
  const [adSoyad, setAdSoyad] = useState('');
  const [telefon, setTelefon] = useState('');
  const [not, setNot] = useState('');
  const [riza, setRiza] = useState(false);
  const [ticari, setTicari] = useState(false);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [ruhsatYol, setRuhsatYol] = useState<string | null>(null);  // vehicle-docs yolu
  const [ruhsatYukleniyor, setRuhsatYukleniyor] = useState(false);

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
      setSubeler((subeRes.data as Branch[]) ?? []);
      setAraclar((aracRes.data as Vehicle[]) ?? []);
    })();
  }, []));

  const secilenArac = araclar.find(a => a.id === aracId);

  // Araç değişince eski ruhsat seçimini temizle (yanlış araca bağlanmasın)
  useEffect(() => { setRuhsatYol(null); }, [aracId]);

  async function ruhsatSec() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const izin = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!izin.granted) {
        uyari('İzin gerekli', 'Ruhsat görselini seçmek için galeri erişimi vermelisin.');
        return;
      }
      const sonuc = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'], quality: 0.6,
      });
      if (sonuc.canceled || !sonuc.assets?.[0]) return;

      setRuhsatYukleniyor(true);
      const asset = sonuc.assets[0];
      // Yolun ilk klasörü = sahibinin uid'i (r2_yetki bunu zorlar). yukle jpeg üretir.
      const yol = `${user.id}/${Date.now()}.jpg`;
      await dosyaYukle('vehicle-docs', yol, asset.uri);
      setRuhsatYukleniyor(false);
      setRuhsatYol(yol);
    } catch (e: any) {
      setRuhsatYukleniyor(false);
      uyari('Hata', e?.message ?? 'Ruhsat yüklenemedi');
    }
  }

  async function gonder() {
    if (!session?.user) return;
    if (!riza) {
      uyari('Onay gerekli', 'Devam etmek için kişisel verilerin işlenmesine açık rıza vermelisin.');
      return;
    }
    if (!adSoyad.trim() || !telefon.trim()) {
      uyari('Eksik bilgi', 'Ad soyad ve telefon zorunludur (sana dönebilmemiz için).');
      return;
    }
    if (!aracId) {
      uyari('Araç seçilmedi', 'Lütfen aracını seç. Aracın kayıtlı değilse "Yeni araç ekle" ile ekleyebilirsin.');
      return;
    }
    if (!ruhsatYol) {
      uyari('Ruhsat gerekli', 'Sigorta teklifi için aracın ruhsat görselini eklemelisin.');
      return;
    }
    const aracDetayMetni = secilenArac
      ? [secilenArac.marka, secilenArac.model].filter(Boolean).join(' ') ||
        cinsLabel(secilenArac.arac_cinsi)
      : null;

    setGonderiliyor(true);
    const { error } = await supabase.from('insurance_requests').insert({
      user_id: session.user.id,
      branch_id: subeId,
      vehicle_id: aracId,
      tip,
      ad_soyad: adSoyad.trim(),
      telefon: telefon.trim(),
      plaka: secilenArac?.plaka ?? null,
      arac_detay: aracDetayMetni,
      ruhsat_url: ruhsatYol,
      musteri_not: not.trim() || null,
      kvkk_riza_at: new Date().toISOString(),
      ticari_ileti_izni: ticari,
    });
    setGonderiliyor(false);
    if (error) { uyari('Gönderilemedi', error.message); return; }

    setNot(''); setAracId(null); setRuhsatYol(null); setTicari(false); setRiza(false);
    uyari(
      'Teklif talebin alındı',
      'En kısa sürede sana dönüp uygun sigorta/kasko teklifini ileteceğiz.',
    );
  }

  return (
    <KlavyeKapsa style={{ backgroundColor: renkler.bg }}>
    <ScrollView style={{ backgroundColor: renkler.bg }} contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
      <View style={[s.ustKart, { backgroundColor: renkler.card }]}>
        <Ionicons name="shield-checkmark" size={28} color={renkler.primary} />
        <Text style={[s.ustBaslik, { color: renkler.text }]}>Sigorta / Kasko Teklifi</Text>
        <Text style={[s.ustAlt, { color: renkler.subtext }]}>
          Bilgilerini bırak, anlaşmalı acentemizden en uygun teklifi alıp sana dönelim.
        </Text>
      </View>

      <Text style={[s.bolum, { color: renkler.subtext }]}>TEKLİF TÜRÜ</Text>
      <View style={s.tipRow}>
        {TIPLER.map(t => {
          const secili = tip === t.value;
          return (
            <TouchableOpacity
              key={t.value}
              style={[
                s.tipBtn,
                { backgroundColor: renkler.card, borderColor: secili ? renkler.primary : renkler.border },
              ]}
              onPress={() => setTip(t.value)}
            >
              <Text style={[s.tipLabel, { color: secili ? renkler.primary : renkler.text }]}>{t.label}</Text>
              <Text style={[s.tipAlt, { color: renkler.subtext }]}>{t.alt}</Text>
            </TouchableOpacity>
          );
        })}
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
      ) : (
        <Text style={[s.bosArac, { color: renkler.subtext }]}>
          Henüz kayıtlı aracın yok. Aşağıdan ekleyip buradan seçebilirsin.
        </Text>
      )}
      {/* Farklı/yeni araç: serbest metin yerine Araçlarım ekranına yönlendir. */}
      <TouchableOpacity
        style={[s.aracEkleBtn, { borderColor: renkler.primary }]}
        onPress={() => router.push('/araclar')}
      >
        <Ionicons name="add-circle-outline" size={20} color={renkler.primary} />
        <Text style={[s.aracEkleText, { color: renkler.primary }]}>Yeni araç ekle</Text>
      </TouchableOpacity>

      {/* Araç ruhsatı — hem trafik hem kasko için (KVKK: private bucket, signed URL). */}
      <Text style={[s.bolum, { color: renkler.subtext }]}>ARAÇ RUHSATI *</Text>
      <TouchableOpacity
        style={[
          s.ruhsatBtn,
          { backgroundColor: renkler.card, borderColor: ruhsatYol ? renkler.primary : renkler.border },
        ]}
        onPress={ruhsatSec}
        disabled={ruhsatYukleniyor}
      >
        {ruhsatYukleniyor ? (
          <ActivityIndicator color={renkler.primary} />
        ) : (
          <>
            <Ionicons
              name={ruhsatYol ? 'checkmark-circle' : 'document-attach-outline'}
              size={22}
              color={ruhsatYol ? '#16a34a' : renkler.primary}
            />
            <Text style={[s.ruhsatText, { color: renkler.text }]}>
              {ruhsatYol ? 'Ruhsat eklendi — değiştirmek için dokun' : 'Ruhsat görselini yükle (jpg/png)'}
            </Text>
          </>
        )}
      </TouchableOpacity>
      <Text style={[s.ruhsatNot, { color: renkler.subtext }]}>
        Sigorta teklifi için aracın ruhsatının fotoğrafını ekle. Belgen güvenli
        şekilde saklanır, yalnızca teklifi hazırlayan ekip görür.
      </Text>

      <Text style={[s.bolum, { color: renkler.subtext }]}>ŞUBE (opsiyonel)</Text>
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
              onPress={() => setSubeId(secili ? null : sube.id)}
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
        placeholder="Mevcut poliçen, hasarsızlık indirimi vb."
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
          işlenmesine ve acente ile paylaşılmasına açık rıza veriyorum.
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
  );
}

const s = StyleSheet.create({
  container: { padding: 16, paddingBottom: 48 },
  ustKart: { borderRadius: 12, padding: 20, alignItems: 'center' },
  ustBaslik: { fontSize: 18, fontWeight: '800', marginTop: 10 },
  ustAlt: { fontSize: 13, textAlign: 'center', marginTop: 6, lineHeight: 19 },
  bolum: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginTop: 24, marginBottom: 8, marginLeft: 4 },
  tipRow: { flexDirection: 'row', gap: 12 },
  tipBtn: { flex: 1, borderWidth: 1.5, borderRadius: 12, padding: 14 },
  tipLabel: { fontSize: 16, fontWeight: '700' },
  tipAlt: { fontSize: 12, marginTop: 2 },
  secimKart: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderRadius: 12, padding: 14, marginBottom: 8,
  },
  secimBaslik: { fontSize: 16, fontWeight: '600' },
  secimAlt: { fontSize: 13, marginTop: 2 },
  bosArac: { fontSize: 14, lineHeight: 20, marginBottom: 4 },
  aracEkleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 12, padding: 13, marginTop: 4,
  },
  aracEkleText: { fontSize: 15, fontWeight: '700' },
  ruhsatBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1.5, borderRadius: 12, padding: 14, minHeight: 52,
  },
  ruhsatText: { flex: 1, fontSize: 14, fontWeight: '600' },
  ruhsatNot: { fontSize: 12, lineHeight: 18, marginTop: 8, marginLeft: 2 },
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
