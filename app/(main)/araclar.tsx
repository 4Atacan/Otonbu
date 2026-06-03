import { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, Alert, ActivityIndicator, Modal,
} from 'react-native';
import { supabase } from '../../src/lib/supabase';
import { Vehicle } from '../../src/types';

const SEGMENTLER = ['standart', 'orta', 'ust'];

export default function AraclarScreen() {
  const [araclar, setAraclar] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAcik, setModalAcik] = useState(false);
  const [plaka, setPlaka] = useState('');
  const [markaModel, setMarkaModel] = useState('');
  const [segment, setSegment] = useState('standart');
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

  async function aracEkle() {
    if (!plaka.trim()) { Alert.alert('Hata', 'Plaka zorunlu'); return; }
    setKayit(true);
    const { error } = await supabase.from('vehicles').insert({
      plaka: plaka.trim().toUpperCase(),
      marka_model: markaModel.trim() || null,
      segment,
    });
    setKayit(false);
    if (error) { Alert.alert('Hata', error.message); return; }
    setModalAcik(false);
    setPlaka(''); setMarkaModel(''); setSegment('standart');
    yukle();
  }

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
            <Text style={s.plaka}>{item.plaka}</Text>
            <Text style={s.alt}>{item.marka_model ?? '—'} · {item.segment}</Text>
          </View>
        )}
      />
      <TouchableOpacity style={s.ekleBtn} onPress={() => setModalAcik(true)}>
        <Text style={s.ekleBtnText}>+ Araç Ekle</Text>
      </TouchableOpacity>

      <Modal visible={modalAcik} animationType="slide" presentationStyle="pageSheet">
        <View style={s.modal}>
          <Text style={s.modalBaslik}>Araç Ekle</Text>

          <Text style={s.label}>Plaka *</Text>
          <TextInput
            style={s.input} placeholder="34 ABC 123"
            value={plaka} onChangeText={setPlaka}
            autoCapitalize="characters"
          />

          <Text style={s.label}>Marka / Model</Text>
          <TextInput
            style={s.input} placeholder="Toyota Corolla"
            value={markaModel} onChangeText={setMarkaModel}
          />

          <Text style={s.label}>Segment</Text>
          <View style={s.segRow}>
            {SEGMENTLER.map(seg => (
              <TouchableOpacity
                key={seg}
                style={[s.segBtn, segment === seg && s.segBtnAktif]}
                onPress={() => setSegment(seg)}
              >
                <Text style={[s.segText, segment === seg && s.segTextAktif]}>
                  {seg}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={s.btn} onPress={aracEkle} disabled={kayit}>
            {kayit ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Kaydet</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={s.iptal} onPress={() => setModalAcik(false)}>
            <Text style={s.iptalText}>Vazgeç</Text>
          </TouchableOpacity>
        </View>
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
  plaka: { fontSize: 20, fontWeight: 'bold', letterSpacing: 2 },
  alt: { color: '#888', marginTop: 4 },
  ekleBtn: {
    backgroundColor: '#1a56db', margin: 16, padding: 16,
    borderRadius: 12, alignItems: 'center',
  },
  ekleBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  modal: { flex: 1, padding: 24, backgroundColor: '#fff' },
  modalBaslik: { fontSize: 22, fontWeight: 'bold', marginBottom: 24, marginTop: 8 },
  label: { fontSize: 14, color: '#333', marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 10,
    padding: 13, fontSize: 16, marginBottom: 16,
  },
  segRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  segBtn: {
    flex: 1, padding: 10, borderRadius: 8,
    borderWidth: 1, borderColor: '#ddd', alignItems: 'center',
  },
  segBtnAktif: { backgroundColor: '#1a56db', borderColor: '#1a56db' },
  segText: { color: '#555' },
  segTextAktif: { color: '#fff', fontWeight: '600' },
  btn: {
    backgroundColor: '#1a56db', borderRadius: 10,
    padding: 16, alignItems: 'center', marginBottom: 12,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  iptal: { alignItems: 'center', padding: 12 },
  iptalText: { color: '#888' },
});
