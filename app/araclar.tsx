import { useEffect, useMemo, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, Alert, ActivityIndicator, Modal, ScrollView,
} from 'react-native';
import { Stack } from 'expo-router';
import { supabase } from '../src/lib/supabase';
import { Vehicle } from '../src/types';
import { AutocompleteInput } from '../src/components/AutocompleteInput';
import { Yukleniyor } from '../src/components/Yukleniyor';
import { useTheme } from '../src/theme/ThemeContext';
import {
  ARAC_CINSLERI, MARKALAR, MARKA_ADLARI, cinsLabel, segmentLabel,
} from '../src/data/arac-katalogu';

export default function AraclarScreen() {
  const { renkler } = useTheme();
  const [araclar, setAraclar] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAcik, setModalAcik] = useState(false);
  const [duzenlenen, setDuzenlenen] = useState<Vehicle | null>(null);  // null = yeni kayıt
  const [plaka, setPlaka] = useState('');
  const [aracCinsi, setAracCinsi] = useState<string | null>(null);
  const [marka, setMarka] = useState('');
  const [model, setModel] = useState('');
  const [kayit, setKayit] = useState(false);

  const headerOpts = useMemo(() => ({
    title: 'Araçlarım',
    headerShown: true,
    headerStyle: { backgroundColor: renkler.card },
    headerTitleStyle: { color: renkler.text },
    headerTintColor: renkler.primary,
    headerShadowVisible: false,
  }), [renkler]);

  useEffect(() => { yukle(); }, []);

  async function yukle() {
    setLoading(true);
    // Yalnızca giriş yapan kullanıcının araçları. RLS zaten izole eder; burada
    // ayrıca açıkça user_id ile filtreleyerek başka hesabın aracının asla
    // listeye düşmemesini garanti ediyoruz (savunma derinliği).
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setAraclar([]); setLoading(false); return; }
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) Alert.alert('Hata', error.message);
    else setAraclar(data ?? []);
    setLoading(false);
  }

  function formuSifirla() {
    setDuzenlenen(null);
    setPlaka(''); setAracCinsi(null); setMarka(''); setModel('');
  }

  function markaDegisti(yeni: string) {
    setMarka(yeni);
    setModel('');  // model listesi markaya bağlı; marka değişince geçersiz
  }

  function yeniArac() {
    formuSifirla();
    setModalAcik(true);
  }

  function aracAc(item: Vehicle) {
    setDuzenlenen(item);
    setPlaka(item.plaka);
    setAracCinsi(item.arac_cinsi);
    setMarka(item.marka ?? '');
    setModel(item.model ?? '');
    setModalAcik(true);
  }

  async function kaydet() {
    if (!plaka.trim()) { Alert.alert('Hata', 'Plaka zorunlu'); return; }
    if (!aracCinsi) { Alert.alert('Hata', 'Araç cinsi seçin'); return; }
    if (!marka.trim()) { Alert.alert('Hata', 'Marka zorunlu'); return; }

    const veri = {
      plaka: plaka.trim().toUpperCase(),
      arac_cinsi: aracCinsi,
      marka: marka.trim(),
      model: model.trim() || null,
    };

    setKayit(true);
    const { error } = duzenlenen
      ? await supabase.from('vehicles').update(veri).eq('id', duzenlenen.id)
      : await supabase.from('vehicles').insert(veri);
    setKayit(false);

    if (error) {
      // 23505 = unique ihlali (vehicles_plaka_unique)
      if (error.code === '23505') {
        Alert.alert('Hata', 'Bu plaka sistemde zaten kayıtlı');
      } else {
        Alert.alert('Hata', error.message);
      }
      return;
    }
    setModalAcik(false);
    formuSifirla();
    yukle();
  }

  function silOnayi() {
    if (!duzenlenen) return;
    Alert.alert(
      'Aracı Sil',
      `${duzenlenen.plaka} plakalı araç silinecek. Emin misin?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Sil', style: 'destructive', onPress: sil },
      ],
    );
  }

  async function sil() {
    if (!duzenlenen) return;
    setKayit(true);
    const { error } = await supabase
      .from('vehicles')
      .delete()
      .eq('id', duzenlenen.id);
    setKayit(false);
    if (error) { Alert.alert('Hata', error.message); return; }
    setModalAcik(false);
    formuSifirla();
    yukle();
  }

  // Seçilen markanın model listesi; katalog dışı marka yazıldıysa boş
  const modelListesi = MARKALAR[marka.trim()] ?? [];

  return (
    <View style={[s.container, { backgroundColor: renkler.bg }]}>
      <Stack.Screen options={headerOpts} />
      {loading ? <Yukleniyor /> : (
        <>
          <FlatList
            data={araclar}
            keyExtractor={a => a.id}
            ListEmptyComponent={
              <Text style={[s.bos, { color: renkler.subtext }]}>Henüz araç eklenmedi.</Text>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[s.kart, { backgroundColor: renkler.card }]}
                onPress={() => aracAc(item)}
              >
                <View style={s.kartUst}>
                  <Text style={[s.plaka, { color: renkler.text }]}>{item.plaka}</Text>
                  {item.arac_cinsi && (
                    <View style={[s.rozet, { backgroundColor: renkler.rozetBg }]}>
                      <Text style={[s.rozetText, { color: renkler.primary }]}>
                        {cinsLabel(item.arac_cinsi)}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={[s.alt, { color: renkler.subtext }]}>
                  {[item.marka, item.model].filter(Boolean).join(' ') || '—'}
                  {item.segment ? `  ·  ${segmentLabel(item.segment)} fiyat` : ''}
                </Text>
              </TouchableOpacity>
            )}
          />
          <TouchableOpacity
            style={[s.ekleBtn, { backgroundColor: renkler.primary }]}
            onPress={yeniArac}
          >
            <Text style={[s.ekleBtnText, { color: renkler.primaryText }]}>+ Araç Ekle</Text>
          </TouchableOpacity>
        </>
      )}

      <Modal visible={modalAcik} animationType="slide" presentationStyle="pageSheet">
        <ScrollView
          style={{ backgroundColor: renkler.card }}
          contentContainerStyle={s.modal}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[s.modalBaslik, { color: renkler.text }]}>
            {duzenlenen ? 'Araç Detayı' : 'Araç Ekle'}
          </Text>

          <Text style={[s.label, { color: renkler.subtext }]}>Plaka *</Text>
          <TextInput
            style={[s.input, {
              borderColor: renkler.border,
              backgroundColor: renkler.input,
              color: renkler.text,
            }]}
            placeholder="34 ABC 123"
            placeholderTextColor={renkler.subtext}
            value={plaka} onChangeText={setPlaka}
            autoCapitalize="characters"
          />

          <Text style={[s.label, { color: renkler.subtext }]}>Araç Cinsi *</Text>
          <View style={s.cinsRow}>
            {ARAC_CINSLERI.map(cins => {
              const aktif = aracCinsi === cins.value;
              return (
                <TouchableOpacity
                  key={cins.value}
                  style={[
                    s.cinsBtn,
                    { borderColor: renkler.border },
                    aktif && { backgroundColor: renkler.primary, borderColor: renkler.primary },
                  ]}
                  onPress={() => setAracCinsi(cins.value)}
                >
                  <Text
                    style={[
                      s.cinsText,
                      { color: aktif ? renkler.primaryText : renkler.subtext },
                      aktif && s.cinsTextAktif,
                    ]}
                  >
                    {cins.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[s.label, { color: renkler.subtext }]}>Marka *</Text>
          <AutocompleteInput
            value={marka}
            onChange={markaDegisti}
            options={MARKA_ADLARI}
            placeholder="Yazmaya başla: Toy..."
          />

          <Text style={[s.label, { color: renkler.subtext }]}>Model</Text>
          {marka.trim() ? (
            <AutocompleteInput
              value={model}
              onChange={setModel}
              options={modelListesi}
              placeholder={modelListesi.length > 0
                ? 'Yazmaya başla veya listeden seç'
                : 'Modeli yaz (katalogda yok)'}
            />
          ) : (
            <View style={[s.pasifInput, { borderColor: renkler.border, backgroundColor: renkler.bg }]}>
              <Text style={[s.pasifText, { color: renkler.subtext }]}>Önce marka seçin</Text>
            </View>
          )}

          <TouchableOpacity
            style={[s.btn, { backgroundColor: renkler.primary }]}
            onPress={kaydet}
            disabled={kayit}
          >
            {kayit
              ? <ActivityIndicator color={renkler.primaryText} />
              : (
                <Text style={[s.btnText, { color: renkler.primaryText }]}>
                  {duzenlenen ? 'Değişiklikleri Kaydet' : 'Kaydet'}
                </Text>
              )}
          </TouchableOpacity>

          {duzenlenen && (
            <TouchableOpacity
              style={[s.silBtn, { borderColor: renkler.danger }]}
              onPress={silOnayi}
              disabled={kayit}
            >
              <Text style={[s.silText, { color: renkler.danger }]}>Aracı Sil</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={s.iptal}
            onPress={() => { setModalAcik(false); formuSifirla(); }}
          >
            <Text style={[s.iptalText, { color: renkler.subtext }]}>Vazgeç</Text>
          </TouchableOpacity>
        </ScrollView>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  bos: { textAlign: 'center', marginTop: 60, fontSize: 16 },
  kart: {
    margin: 12, marginBottom: 0,
    padding: 16, borderRadius: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  kartUst: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  plaka: { fontSize: 20, fontWeight: 'bold', letterSpacing: 2 },
  rozet: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  rozetText: { fontSize: 12, fontWeight: '600' },
  alt: { marginTop: 4 },
  ekleBtn: {
    margin: 16, padding: 16,
    borderRadius: 12, alignItems: 'center',
  },
  ekleBtnText: { fontWeight: '700', fontSize: 16 },
  modal: { padding: 24, paddingBottom: 48 },
  modalBaslik: { fontSize: 22, fontWeight: 'bold', marginBottom: 24, marginTop: 8 },
  label: { fontSize: 14, marginBottom: 6 },
  input: {
    borderWidth: 1, borderRadius: 10,
    padding: 13, fontSize: 16, marginBottom: 16,
  },
  cinsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  cinsBtn: {
    paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8,
    borderWidth: 1,
  },
  cinsText: { fontSize: 14 },
  cinsTextAktif: { fontWeight: '600' },
  pasifInput: { borderWidth: 1, borderRadius: 10, padding: 13, marginBottom: 16 },
  pasifText: { fontSize: 15 },
  btn: {
    borderRadius: 10,
    padding: 16, alignItems: 'center', marginBottom: 12, marginTop: 8,
  },
  btnText: { fontSize: 16, fontWeight: '600' },
  silBtn: {
    borderWidth: 1, borderRadius: 10,
    padding: 14, alignItems: 'center', marginBottom: 12,
  },
  silText: { fontSize: 15, fontWeight: '600' },
  iptal: { alignItems: 'center', padding: 12 },
  iptalText: {},
});
