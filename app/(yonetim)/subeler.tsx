import { useCallback, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Modal, ScrollView,
  StyleSheet, Switch, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { useTheme } from '../../src/theme/ThemeContext';
import { Branch } from '../../src/types';
import { Yukleniyor } from '../../src/components/Yukleniyor';

export default function SubelerScreen() {
  const { renkler } = useTheme();
  const [subeler, setSubeler] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAcik, setModalAcik] = useState(false);
  const [duzenlenen, setDuzenlenen] = useState<Branch | null>(null);
  const [ad, setAd] = useState('');
  const [adres, setAdres] = useState('');
  const [aktif, setAktif] = useState(true);
  const [sahibiEmail, setSahibiEmail] = useState('');
  const [mevcutSahibi, setMevcutSahibi] = useState<string | null>(null);
  const [kayit, setKayit] = useState(false);

  useFocusEffect(useCallback(() => { yukle(); }, []));

  async function yukle() {
    const { data, error } = await supabase
      .from('branches').select('*').order('ad');
    if (error) Alert.alert('Hata', error.message);
    else setSubeler(data ?? []);
    setLoading(false);
  }

  function formuSifirla() {
    setDuzenlenen(null);
    setAd(''); setAdres(''); setAktif(true);
    setSahibiEmail(''); setMevcutSahibi(null);
  }

  function yeni() {
    formuSifirla();
    setModalAcik(true);
  }

  async function ac(item: Branch) {
    setDuzenlenen(item);
    setAd(item.ad);
    setAdres(item.adres ?? '');
    setAktif(item.aktif);
    setSahibiEmail('');
    setModalAcik(true);
    // Mevcut şube sahibini göster (admin tüm kullanıcıları okuyabilir)
    const { data } = await supabase
      .from('users')
      .select('email, ad_soyad')
      .eq('branch_id', item.id)
      .eq('rol', 'sube_sahibi')
      .limit(1)
      .maybeSingle();
    setMevcutSahibi(data ? (data.ad_soyad ?? data.email) : null);
  }

  async function kaydet() {
    if (!ad.trim()) { Alert.alert('Hata', 'Şube adı zorunlu'); return; }

    const veri = { ad: ad.trim(), adres: adres.trim() || null, aktif };

    setKayit(true);
    const { error } = duzenlenen
      ? await supabase.from('branches').update(veri).eq('id', duzenlenen.id)
      : await supabase.from('branches').insert(veri);
    setKayit(false);

    if (error) { Alert.alert('Hata', error.message); return; }
    setModalAcik(false);
    formuSifirla();
    yukle();
  }

  async function sahibiAta() {
    if (!duzenlenen) return;
    const mail = sahibiEmail.trim().toLowerCase();
    if (!mail) { Alert.alert('Hata', 'Kullanıcının e-postasını gir'); return; }

    setKayit(true);
    const { data: kullanici } = await supabase
      .from('users')
      .select('id, ad_soyad, rol')
      .eq('email', mail)
      .maybeSingle();

    if (!kullanici) {
      setKayit(false);
      Alert.alert('Bulunamadı',
        'Bu e-postayla kayıtlı kullanıcı yok. Kişi önce uygulamaya kayıt olmalı.');
      return;
    }

    const { error } = await supabase
      .from('users')
      .update({ rol: 'sube_sahibi', branch_id: duzenlenen.id })
      .eq('id', kullanici.id);
    setKayit(false);

    if (error) { Alert.alert('Hata', error.message); return; }
    setMevcutSahibi(kullanici.ad_soyad ?? mail);
    setSahibiEmail('');
    Alert.alert('Tamam', `${kullanici.ad_soyad ?? mail} bu şubenin sahibi yapıldı`);
  }

  if (loading) return <Yukleniyor />;

  return (
    <View style={[s.container, { backgroundColor: renkler.bg }]}>
      <FlatList
        data={subeler}
        keyExtractor={b => b.id}
        ListEmptyComponent={
          <Text style={[s.bos, { color: renkler.subtext }]}>
            Henüz şube yok. İlk şubeyi ekle!
          </Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[s.kart, { backgroundColor: renkler.card }, !item.aktif && s.pasif]}
            onPress={() => ac(item)}
          >
            <Text style={[s.ad, { color: renkler.text }]}>
              {item.ad}{!item.aktif ? '  (pasif)' : ''}
            </Text>
            <Text style={[s.adres, { color: renkler.subtext }]}>{item.adres ?? '—'}</Text>
          </TouchableOpacity>
        )}
      />
      <TouchableOpacity
        style={[s.ekleBtn, { backgroundColor: renkler.primary }]}
        onPress={yeni}
      >
        <Text style={[s.ekleBtnText, { color: renkler.primaryText }]}>+ Şube Ekle</Text>
      </TouchableOpacity>

      <Modal visible={modalAcik} animationType="slide" presentationStyle="pageSheet">
        <ScrollView
          style={{ backgroundColor: renkler.card }}
          contentContainerStyle={s.modal}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[s.modalBaslik, { color: renkler.text }]}>
            {duzenlenen ? 'Şube Detayı' : 'Şube Ekle'}
          </Text>

          <Text style={[s.label, { color: renkler.subtext }]}>Şube Adı *</Text>
          <TextInput
            style={[s.input, { borderColor: renkler.border, backgroundColor: renkler.input, color: renkler.text }]}
            placeholder="OTONBU Serdivan"
            placeholderTextColor={renkler.subtext}
            value={ad} onChangeText={setAd}
          />

          <Text style={[s.label, { color: renkler.subtext }]}>Adres</Text>
          <TextInput
            style={[s.input, { borderColor: renkler.border, backgroundColor: renkler.input, color: renkler.text }]}
            placeholder="Mah. Cad. No, Serdivan/Sakarya"
            placeholderTextColor={renkler.subtext}
            value={adres} onChangeText={setAdres}
          />

          <View style={s.switchRow}>
            <Switch value={aktif} onValueChange={setAktif} />
            <Text style={[s.switchText, { color: renkler.text }]}>Aktif</Text>
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

          {duzenlenen && (
            <View style={[s.sahibiKutu, { borderColor: renkler.border }]}>
              <Text style={[s.sahibiBaslik, { color: renkler.text }]}>Şube Sahibi</Text>
              <Text style={[s.sahibiMevcut, { color: renkler.subtext }]}>
                {mevcutSahibi ? `Mevcut: ${mevcutSahibi}` : 'Henüz atanmadı'}
              </Text>
              <TextInput
                style={[s.input, { borderColor: renkler.border, backgroundColor: renkler.input, color: renkler.text }]}
                placeholder="kullanici@email.com"
                placeholderTextColor={renkler.subtext}
                autoCapitalize="none"
                keyboardType="email-address"
                value={sahibiEmail} onChangeText={setSahibiEmail}
              />
              <TouchableOpacity
                style={[s.ataBtn, { borderColor: renkler.primary }]}
                onPress={sahibiAta}
                disabled={kayit}
              >
                <Text style={[s.ataText, { color: renkler.primary }]}>Sahibi Ata</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            style={s.iptal}
            onPress={() => { setModalAcik(false); formuSifirla(); }}
          >
            <Text style={[s.iptalText, { color: renkler.subtext }]}>Kapat</Text>
          </TouchableOpacity>
        </ScrollView>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  bos: { textAlign: 'center', marginTop: 60, fontSize: 15 },
  kart: { margin: 12, marginBottom: 0, padding: 16, borderRadius: 12 },
  pasif: { opacity: 0.5 },
  ad: { fontSize: 16, fontWeight: '600' },
  adres: { fontSize: 13, marginTop: 4 },
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
  sahibiKutu: { borderWidth: 1, borderRadius: 12, padding: 16, marginTop: 8 },
  sahibiBaslik: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  sahibiMevcut: { fontSize: 13, marginBottom: 12 },
  ataBtn: { borderWidth: 1, borderRadius: 10, padding: 12, alignItems: 'center' },
  ataText: { fontWeight: '600' },
  iptal: { alignItems: 'center', padding: 12, marginTop: 8 },
  iptalText: {},
});
