import { useCallback, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Modal, ScrollView,
  StyleSheet, Switch, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { useTheme } from '../../src/theme/ThemeContext';
import { Service } from '../../src/types';

export default function HizmetlerScreen() {
  const { renkler } = useTheme();
  const [hizmetler, setHizmetler] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAcik, setModalAcik] = useState(false);
  const [duzenlenen, setDuzenlenen] = useState<Service | null>(null);
  const [ad, setAd] = useState('');
  const [kategori, setKategori] = useState('');
  const [fiyat, setFiyat] = useState('');
  const [aktif, setAktif] = useState(true);
  const [kayit, setKayit] = useState(false);

  useFocusEffect(useCallback(() => { yukle(); }, []));

  async function yukle() {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .order('kategori')
      .order('ad');
    if (error) Alert.alert('Hata', error.message);
    else setHizmetler(data ?? []);
    setLoading(false);
  }

  function formuSifirla() {
    setDuzenlenen(null);
    setAd(''); setKategori(''); setFiyat(''); setAktif(true);
  }

  function yeni() {
    formuSifirla();
    setModalAcik(true);
  }

  function ac(item: Service) {
    setDuzenlenen(item);
    setAd(item.ad);
    setKategori(item.kategori);
    setFiyat(String(item.taban_fiyat));
    setAktif(item.aktif);
    setModalAcik(true);
  }

  async function kaydet() {
    const f = parseFloat(fiyat.replace(',', '.'));
    if (!ad.trim()) { Alert.alert('Hata', 'Hizmet adı zorunlu'); return; }
    if (!kategori.trim()) { Alert.alert('Hata', 'Kategori zorunlu'); return; }
    if (!Number.isFinite(f) || f <= 0) { Alert.alert('Hata', 'Geçerli bir fiyat girin'); return; }

    const veri = {
      ad: ad.trim(),
      kategori: kategori.trim().toLocaleLowerCase('tr'),
      taban_fiyat: f,
      aktif,
    };

    setKayit(true);
    const { error } = duzenlenen
      ? await supabase.from('services').update(veri).eq('id', duzenlenen.id)
      : await supabase.from('services').insert(veri);
    setKayit(false);

    if (error) { Alert.alert('Hata', error.message); return; }
    setModalAcik(false);
    formuSifirla();
    yukle();
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color={renkler.primary} />;

  return (
    <View style={[s.container, { backgroundColor: renkler.bg }]}>
      <FlatList
        data={hizmetler}
        keyExtractor={h => h.id}
        ListEmptyComponent={
          <Text style={[s.bos, { color: renkler.subtext }]}>
            Henüz hizmet yok. "Oto Yıkama" ile başla!
          </Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[s.kart, { backgroundColor: renkler.card }, !item.aktif && s.pasif]}
            onPress={() => ac(item)}
          >
            <View style={s.kartSol}>
              <Text style={[s.ad, { color: renkler.text }]}>{item.ad}</Text>
              <Text style={[s.kategori, { color: renkler.subtext }]}>
                {item.kategori}{!item.aktif ? ' · pasif' : ''}
              </Text>
            </View>
            <Text style={[s.fiyat, { color: renkler.primary }]}>
              {item.taban_fiyat.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
            </Text>
          </TouchableOpacity>
        )}
      />
      <TouchableOpacity
        style={[s.ekleBtn, { backgroundColor: renkler.primary }]}
        onPress={yeni}
      >
        <Text style={[s.ekleBtnText, { color: renkler.primaryText }]}>+ Hizmet Ekle</Text>
      </TouchableOpacity>

      <Modal visible={modalAcik} animationType="slide" presentationStyle="pageSheet">
        <ScrollView
          style={{ backgroundColor: renkler.card }}
          contentContainerStyle={s.modal}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[s.modalBaslik, { color: renkler.text }]}>
            {duzenlenen ? 'Hizmeti Düzenle' : 'Hizmet Ekle'}
          </Text>

          <Text style={[s.label, { color: renkler.subtext }]}>Hizmet Adı *</Text>
          <TextInput
            style={[s.input, { borderColor: renkler.border, backgroundColor: renkler.input, color: renkler.text }]}
            placeholder="Oto Yıkama"
            placeholderTextColor={renkler.subtext}
            value={ad} onChangeText={setAd}
          />

          <Text style={[s.label, { color: renkler.subtext }]}>Kategori *</Text>
          <TextInput
            style={[s.input, { borderColor: renkler.border, backgroundColor: renkler.input, color: renkler.text }]}
            placeholder="yikama / kaplama / bakim"
            placeholderTextColor={renkler.subtext}
            autoCapitalize="none"
            value={kategori} onChangeText={setKategori}
          />

          <Text style={[s.label, { color: renkler.subtext }]}>Taban Fiyat (TL) *</Text>
          <TextInput
            style={[s.input, { borderColor: renkler.border, backgroundColor: renkler.input, color: renkler.text }]}
            placeholder="300"
            placeholderTextColor={renkler.subtext}
            keyboardType="decimal-pad"
            value={fiyat} onChangeText={setFiyat}
          />

          <View style={s.switchRow}>
            <Switch value={aktif} onValueChange={setAktif} />
            <Text style={[s.switchText, { color: renkler.text }]}>
              Aktif (müşteriler görür)
            </Text>
          </View>

          <TouchableOpacity
            style={[s.btn, { backgroundColor: renkler.primary }]}
            onPress={kaydet}
            disabled={kayit}
          >
            {kayit
              ? <ActivityIndicator color={renkler.primaryText} />
              : <Text style={[s.btnText, { color: renkler.primaryText }]}>Kaydet</Text>}
          </TouchableOpacity>
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
  bos: { textAlign: 'center', marginTop: 60, fontSize: 15, paddingHorizontal: 32 },
  kart: {
    margin: 12, marginBottom: 0, padding: 16, borderRadius: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  pasif: { opacity: 0.5 },
  kartSol: { flex: 1 },
  ad: { fontSize: 16, fontWeight: '600' },
  kategori: { fontSize: 13, marginTop: 2 },
  fiyat: { fontSize: 16, fontWeight: '700' },
  ekleBtn: { margin: 16, padding: 16, borderRadius: 12, alignItems: 'center' },
  ekleBtnText: { fontWeight: '700', fontSize: 16 },
  modal: { padding: 24, paddingBottom: 48 },
  modalBaslik: { fontSize: 22, fontWeight: 'bold', marginBottom: 24, marginTop: 8 },
  label: { fontSize: 14, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, padding: 13, fontSize: 16, marginBottom: 16 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  switchText: { fontSize: 15 },
  btn: { borderRadius: 10, padding: 16, alignItems: 'center', marginBottom: 12 },
  btnText: { fontSize: 16, fontWeight: '600' },
  iptal: { alignItems: 'center', padding: 12 },
  iptalText: {},
});
