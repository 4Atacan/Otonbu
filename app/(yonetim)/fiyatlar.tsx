import { useCallback, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Modal, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { useSession } from '../../src/hooks/useSession';
import { useTheme } from '../../src/theme/ThemeContext';
import { BranchPrice, Service } from '../../src/types';

// Segment bazlı fiyatlama Faz 2+ kararı; şimdilik tek segment.
const SEGMENT = 'standart';

const tl = (n: number) =>
  n.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });

export default function FiyatlarScreen() {
  const { profile } = useSession();
  const { renkler } = useTheme();
  const [hizmetler, setHizmetler] = useState<Service[]>([]);
  const [fiyatlar, setFiyatlar] = useState<Record<string, BranchPrice>>({});
  const [loading, setLoading] = useState(true);

  const [modalAcik, setModalAcik] = useState(false);
  const [secilen, setSecilen] = useState<Service | null>(null);
  const [girdi, setGirdi] = useState('');
  const [kayit, setKayit] = useState(false);

  useFocusEffect(useCallback(() => {
    if (profile?.branch_id) yukle(profile.branch_id);
    else setLoading(false);
  }, [profile?.branch_id]));

  async function yukle(branchId: string) {
    const [hizmetRes, fiyatRes] = await Promise.all([
      supabase.from('services').select('*').eq('aktif', true).order('kategori').order('ad'),
      supabase.from('branch_prices').select('*')
        .eq('branch_id', branchId).eq('segment', SEGMENT),
    ]);
    if (hizmetRes.error) Alert.alert('Hata', hizmetRes.error.message);
    else setHizmetler((hizmetRes.data as Service[]) ?? []);

    const harita: Record<string, BranchPrice> = {};
    ((fiyatRes.data as BranchPrice[]) ?? []).forEach(f => { harita[f.service_id] = f; });
    setFiyatlar(harita);
    setLoading(false);
  }

  function ac(h: Service) {
    setSecilen(h);
    setGirdi(fiyatlar[h.id] ? String(fiyatlar[h.id].fiyat) : '');
    setModalAcik(true);
  }

  function band(h: Service) {
    const alt = h.taban_fiyat * (1 - h.oynama_orani);
    const ust = h.taban_fiyat * (1 + h.oynama_orani);
    return { alt, ust };
  }

  async function kaydet() {
    if (!secilen || !profile?.branch_id) return;
    const f = parseFloat(girdi.replace(',', '.'));
    if (!Number.isFinite(f) || f <= 0) { Alert.alert('Hata', 'Geçerli bir fiyat girin'); return; }

    const { alt, ust } = band(secilen);
    if (f < alt || f > ust) {
      Alert.alert(
        'Banda uymuyor',
        `Bu hizmette yerel fiyat ${tl(alt)} – ${tl(ust)} aralığında olmalı ` +
        `(taban ${tl(secilen.taban_fiyat)} ± %${Math.round(secilen.oynama_orani * 100)}).`,
      );
      return;
    }

    setKayit(true);
    const { error } = await supabase.from('branch_prices').upsert(
      { branch_id: profile.branch_id, service_id: secilen.id, segment: SEGMENT, fiyat: f },
      { onConflict: 'branch_id,service_id,segment' },
    );
    setKayit(false);
    if (error) { Alert.alert('Hata', error.message); return; }
    setModalAcik(false);
    yukle(profile.branch_id);
  }

  async function tabanaDon() {
    if (!secilen || !profile?.branch_id) return;
    const mevcut = fiyatlar[secilen.id];
    if (!mevcut) { setModalAcik(false); return; }
    setKayit(true);
    const { error } = await supabase.from('branch_prices').delete().eq('id', mevcut.id);
    setKayit(false);
    if (error) { Alert.alert('Hata', error.message); return; }
    setModalAcik(false);
    yukle(profile.branch_id);
  }

  if (!profile?.branch_id) {
    return (
      <View style={[s.ortala, { backgroundColor: renkler.bg }]}>
        <Text style={[s.bos, { color: renkler.subtext }]}>
          Hesabına bağlı bir şube yok. Fiyat yönetimi için şube ataması gerekli.
        </Text>
      </View>
    );
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color={renkler.primary} />;

  const { alt, ust } = secilen ? band(secilen) : { alt: 0, ust: 0 };

  return (
    <View style={[s.container, { backgroundColor: renkler.bg }]}>
      <FlatList
        data={hizmetler}
        keyExtractor={h => h.id}
        ListHeaderComponent={
          <Text style={[s.aciklama, { color: renkler.subtext }]}>
            Şubene özel fiyat tanımla. Tanımlamazsan taban fiyat geçerli olur.
            Yerel fiyat taban ± oynama oranı bandı dışına çıkamaz.
          </Text>
        }
        ListEmptyComponent={
          <Text style={[s.bos, { color: renkler.subtext }]}>Aktif hizmet yok.</Text>
        }
        renderItem={({ item }) => {
          const yerel = fiyatlar[item.id];
          return (
            <TouchableOpacity
              style={[s.kart, { backgroundColor: renkler.card }]}
              onPress={() => ac(item)}
            >
              <View style={s.kartSol}>
                <Text style={[s.ad, { color: renkler.text }]}>{item.ad}</Text>
                <Text style={[s.taban, { color: renkler.subtext }]}>
                  Taban {tl(item.taban_fiyat)}
                </Text>
              </View>
              {yerel ? (
                <View style={s.kartSag}>
                  <Text style={[s.yerelFiyat, { color: renkler.primary }]}>{tl(yerel.fiyat)}</Text>
                  <Text style={[s.yerelEtiket, { color: renkler.subtext }]}>şube fiyatı</Text>
                </View>
              ) : (
                <Text style={[s.ayarla, { color: renkler.subtext }]}>Ayarla ›</Text>
              )}
            </TouchableOpacity>
          );
        }}
      />

      <Modal visible={modalAcik} animationType="slide" presentationStyle="pageSheet">
        <ScrollView
          style={{ backgroundColor: renkler.card }}
          contentContainerStyle={s.modal}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[s.modalBaslik, { color: renkler.text }]}>{secilen?.ad}</Text>
          <Text style={[s.modalAlt, { color: renkler.subtext }]}>
            Taban {secilen ? tl(secilen.taban_fiyat) : ''} · İzinli aralık {tl(alt)} – {tl(ust)}
          </Text>

          <Text style={[s.label, { color: renkler.subtext }]}>Şube Fiyatı (TL)</Text>
          <TextInput
            style={[s.input, { borderColor: renkler.border, backgroundColor: renkler.input, color: renkler.text }]}
            placeholder={secilen ? String(secilen.taban_fiyat) : '0'}
            placeholderTextColor={renkler.subtext}
            keyboardType="decimal-pad"
            value={girdi} onChangeText={setGirdi}
          />

          <TouchableOpacity
            style={[s.btn, { backgroundColor: renkler.primary }]}
            onPress={kaydet}
            disabled={kayit}
          >
            {kayit
              ? <ActivityIndicator color={renkler.primaryText} />
              : <Text style={[s.btnText, { color: renkler.primaryText }]}>Kaydet</Text>}
          </TouchableOpacity>

          {secilen && fiyatlar[secilen.id] && (
            <TouchableOpacity style={s.tabanBtn} onPress={tabanaDon} disabled={kayit}>
              <Text style={[s.tabanText, { color: renkler.danger }]}>
                Şube fiyatını kaldır (tabana dön)
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={s.iptal} onPress={() => setModalAcik(false)}>
            <Text style={[s.iptalText, { color: renkler.subtext }]}>Vazgeç</Text>
          </TouchableOpacity>
        </ScrollView>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  ortala: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  aciklama: { fontSize: 13, lineHeight: 19, padding: 16, paddingBottom: 4 },
  bos: { textAlign: 'center', marginTop: 40, fontSize: 15, paddingHorizontal: 32 },
  kart: {
    margin: 12, marginBottom: 0, padding: 16, borderRadius: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  kartSol: { flex: 1, paddingRight: 8 },
  ad: { fontSize: 16, fontWeight: '600' },
  taban: { fontSize: 13, marginTop: 2 },
  kartSag: { alignItems: 'flex-end' },
  yerelFiyat: { fontSize: 16, fontWeight: '700' },
  yerelEtiket: { fontSize: 11, marginTop: 1 },
  ayarla: { fontSize: 14 },
  modal: { padding: 24, paddingBottom: 48 },
  modalBaslik: { fontSize: 22, fontWeight: 'bold', marginTop: 8 },
  modalAlt: { fontSize: 13, marginTop: 6, marginBottom: 20, lineHeight: 18 },
  label: { fontSize: 14, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, padding: 13, fontSize: 16, marginBottom: 16 },
  btn: { borderRadius: 10, padding: 16, alignItems: 'center', marginBottom: 12 },
  btnText: { fontSize: 16, fontWeight: '600' },
  tabanBtn: { alignItems: 'center', padding: 12 },
  tabanText: { fontSize: 14, fontWeight: '600' },
  iptal: { alignItems: 'center', padding: 12 },
  iptalText: {},
});
