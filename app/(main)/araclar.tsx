import { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, Alert, ActivityIndicator, Modal, ScrollView,
} from 'react-native';
import { supabase } from '../../src/lib/supabase';
import { Vehicle } from '../../src/types';
import { AutocompleteInput } from '../../src/components/AutocompleteInput';
import {
  ARAC_CINSLERI, MARKALAR, MARKA_ADLARI, cinsLabel,
} from '../../src/data/arac-katalogu';

export default function AraclarScreen() {
  const [araclar, setAraclar] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAcik, setModalAcik] = useState(false);
  const [plaka, setPlaka] = useState('');
  const [aracCinsi, setAracCinsi] = useState<string | null>(null);
  const [marka, setMarka] = useState('');
  const [model, setModel] = useState('');
  const [kayit, setKayit] = useState(false);

  useEffect(() => { yukle(); }, []);

  async function yukle() {
    setLoading(true);
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) Alert.alert('Hata', error.message);
    else setAraclar(data ?? []);
    setLoading(false);
  }

  function formuSifirla() {
    setPlaka(''); setAracCinsi(null); setMarka(''); setModel('');
  }

  function markaDegisti(yeni: string) {
    setMarka(yeni);
    setModel('');  // model listesi markaya bağlı; marka değişince geçersiz
  }

  async function aracEkle() {
    if (!plaka.trim()) { Alert.alert('Hata', 'Plaka zorunlu'); return; }
    if (!aracCinsi) { Alert.alert('Hata', 'Araç cinsi seçin'); return; }
    if (!marka.trim()) { Alert.alert('Hata', 'Marka zorunlu'); return; }

    setKayit(true);
    const { error } = await supabase.from('vehicles').insert({
      plaka: plaka.trim().toUpperCase(),
      arac_cinsi: aracCinsi,
      marka: marka.trim(),
      model: model.trim() || null,
    });
    setKayit(false);
    if (error) { Alert.alert('Hata', error.message); return; }
    setModalAcik(false);
    formuSifirla();
    yukle();
  }

  // Seçilen markanın model listesi; katalog dışı marka yazıldıysa boş
  const modelListesi = MARKALAR[marka.trim()] ?? [];

  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

  return (
    <View style={s.container}>
      <FlatList
        data={araclar}
        keyExtractor={a => a.id}
        ListEmptyComponent={
          <Text style={s.bos}>Henüz araç eklenmedi.</Text>
        }
        renderItem={({ item }) => (
          <View style={s.kart}>
            <View style={s.kartUst}>
              <Text style={s.plaka}>{item.plaka}</Text>
              {item.arac_cinsi && (
                <View style={s.rozet}>
                  <Text style={s.rozetText}>{cinsLabel(item.arac_cinsi)}</Text>
                </View>
              )}
            </View>
            <Text style={s.alt}>
              {[item.marka, item.model].filter(Boolean).join(' ') || '—'}
            </Text>
          </View>
        )}
      />
      <TouchableOpacity style={s.ekleBtn} onPress={() => setModalAcik(true)}>
        <Text style={s.ekleBtnText}>+ Araç Ekle</Text>
      </TouchableOpacity>

      <Modal visible={modalAcik} animationType="slide" presentationStyle="pageSheet">
        <ScrollView
          contentContainerStyle={s.modal}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={s.modalBaslik}>Araç Ekle</Text>

          <Text style={s.label}>Plaka *</Text>
          <TextInput
            style={s.input} placeholder="34 ABC 123"
            value={plaka} onChangeText={setPlaka}
            autoCapitalize="characters"
          />

          <Text style={s.label}>Araç Cinsi *</Text>
          <View style={s.cinsRow}>
            {ARAC_CINSLERI.map(cins => (
              <TouchableOpacity
                key={cins.value}
                style={[s.cinsBtn, aracCinsi === cins.value && s.cinsBtnAktif]}
                onPress={() => setAracCinsi(cins.value)}
              >
                <Text style={[s.cinsText, aracCinsi === cins.value && s.cinsTextAktif]}>
                  {cins.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={s.label}>Marka *</Text>
          <AutocompleteInput
            value={marka}
            onChange={markaDegisti}
            options={MARKA_ADLARI}
            placeholder="Yazmaya başla: Toy..."
          />

          <Text style={s.label}>Model</Text>
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
            <View style={s.pasifInput}>
              <Text style={s.pasifText}>Önce marka seçin</Text>
            </View>
          )}

          <TouchableOpacity style={s.btn} onPress={aracEkle} disabled={kayit}>
            {kayit ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Kaydet</Text>}
          </TouchableOpacity>
          <TouchableOpacity
            style={s.iptal}
            onPress={() => { setModalAcik(false); formuSifirla(); }}
          >
            <Text style={s.iptalText}>Vazgeç</Text>
          </TouchableOpacity>
        </ScrollView>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  bos: { textAlign: 'center', color: '#aaa', marginTop: 60, fontSize: 16 },
  kart: {
    backgroundColor: '#fff', margin: 12, marginBottom: 0,
    padding: 16, borderRadius: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  kartUst: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  plaka: { fontSize: 20, fontWeight: 'bold', letterSpacing: 2 },
  rozet: {
    backgroundColor: '#eff6ff', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  rozetText: { color: '#1a56db', fontSize: 12, fontWeight: '600' },
  alt: { color: '#888', marginTop: 4 },
  ekleBtn: {
    backgroundColor: '#1a56db', margin: 16, padding: 16,
    borderRadius: 12, alignItems: 'center',
  },
  ekleBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  modal: { padding: 24, paddingBottom: 48, backgroundColor: '#fff' },
  modalBaslik: { fontSize: 22, fontWeight: 'bold', marginBottom: 24, marginTop: 8 },
  label: { fontSize: 14, color: '#333', marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 10,
    padding: 13, fontSize: 16, marginBottom: 16,
  },
  cinsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  cinsBtn: {
    paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8,
    borderWidth: 1, borderColor: '#ddd',
  },
  cinsBtnAktif: { backgroundColor: '#1a56db', borderColor: '#1a56db' },
  cinsText: { color: '#555', fontSize: 14 },
  cinsTextAktif: { color: '#fff', fontWeight: '600' },
  pasifInput: {
    borderWidth: 1, borderColor: '#eee', borderRadius: 10,
    padding: 13, marginBottom: 16, backgroundColor: '#f8fafc',
  },
  pasifText: { color: '#94a3b8', fontSize: 15 },
  btn: {
    backgroundColor: '#1a56db', borderRadius: 10,
    padding: 16, alignItems: 'center', marginBottom: 12, marginTop: 8,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  iptal: { alignItems: 'center', padding: 12 },
  iptalText: { color: '#888' },
});
