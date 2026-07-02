import { uyari } from '../lib/uyari';
import { UyariKatmani } from './UyariProvider';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Image, Modal,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useTheme } from '../theme/ThemeContext';
import { Product } from '../types';
import { tl, urunGorselUrl } from '../lib/urun';

// Dükkanda (şubede) satış: personel ürün seçip "satıldı" der → stok düşer.
// Randevuya bağlıysa (p_appointment_id) müşterinin hesabına yazılır. Fiyat/stok
// sunucuda (dukkan_satis RPC) — istemci yalnız ne, kaç adet der (kural 2).
export function SatisModal({
  visible, onClose, branchId, appointmentId, baslik, onDone,
}: {
  visible: boolean;
  onClose: () => void;
  branchId: string | null;
  appointmentId?: string | null;
  baslik?: string;             // örn. müşteri adı (randevulu satış) ya da "Hızlı Satış"
  onDone: () => void;
}) {
  const { renkler } = useTheme();
  const [urunler, setUrunler] = useState<Product[]>([]);
  const [sepet, setSepet] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [gonderiliyor, setGonderiliyor] = useState(false);

  useFocusEffect(useCallback(() => {
    if (!visible || !branchId) return;
    let iptal = false;
    setLoading(true);
    supabase
      .from('products')
      .select('*')
      .eq('branch_id', branchId)
      .eq('aktif', true)
      .eq('silindi_mi', false)
      .gt('stok', 0)
      .order('ad')
      .then(({ data }) => {
        if (iptal) return;
        setUrunler((data as Product[]) ?? []);
        setLoading(false);
      });
    return () => { iptal = true; };
  }, [visible, branchId]));

  function adetDegis(p: Product, delta: number) {
    setSepet(prev => {
      const yeni = Math.min(Math.max((prev[p.id] ?? 0) + delta, 0), p.stok);
      const kopya = { ...prev };
      if (yeni <= 0) delete kopya[p.id];
      else kopya[p.id] = yeni;
      return kopya;
    });
  }

  const secilenler = useMemo(() => urunler.filter(p => (sepet[p.id] ?? 0) > 0), [urunler, sepet]);
  const toplam = useMemo(
    () => secilenler.reduce((a, p) => a + p.fiyat * (sepet[p.id] ?? 0), 0),
    [secilenler, sepet],
  );
  const toplamAdet = secilenler.reduce((a, p) => a + (sepet[p.id] ?? 0), 0);

  async function kaydet() {
    if (!branchId || secilenler.length === 0) return;
    setGonderiliyor(true);
    const items = secilenler.map(p => ({ product_id: p.id, adet: sepet[p.id] }));
    const { error } = await supabase.rpc('dukkan_satis', {
      p_branch_id: branchId,
      p_items: items,
      p_appointment_id: appointmentId ?? null,
    });
    setGonderiliyor(false);
    if (error) { uyari('Satış kaydedilemedi', error.message); return; }
    setSepet({});
    onDone();
    onClose();
    uyari('Satış kaydedildi', `${toplamAdet} ürün · ${tl(toplam)} — stok güncellendi.`);
  }

  function kapat() { setSepet({}); onClose(); }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={kapat}>
      <View style={[s.container, { backgroundColor: renkler.bg }]}>
        <View style={[s.ust, { borderColor: renkler.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[s.baslik, { color: renkler.text }]}>Ürün Sat</Text>
            {baslik ? <Text style={[s.altBaslik, { color: renkler.subtext }]}>{baslik}</Text> : null}
          </View>
          <TouchableOpacity onPress={kapat} hitSlop={10}>
            <Ionicons name="close" size={26} color={renkler.subtext} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color={renkler.primary} style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={urunler}
            keyExtractor={p => p.id}
            contentContainerStyle={s.liste}
            ListEmptyComponent={
              <View style={s.bosKutu}>
                <Ionicons name="cube-outline" size={40} color={renkler.subtext} />
                <Text style={[s.bos, { color: renkler.subtext }]}>
                  Bu şubede stokta ürün yok. Önce Ürünler sekmesinden ekle.
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const adet = sepet[item.id] ?? 0;
              const uri = urunGorselUrl(item.gorsel);
              return (
                <View style={[s.satir, { backgroundColor: renkler.card }]}>
                  {uri ? (
                    <Image source={{ uri }} style={s.foto} />
                  ) : (
                    <View style={[s.foto, s.fotoBos, { backgroundColor: renkler.rozetBg }]}>
                      <Ionicons name="cube-outline" size={20} color={renkler.subtext} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={[s.ad, { color: renkler.text }]} numberOfLines={1}>{item.ad}</Text>
                    <Text style={[s.alt, { color: renkler.subtext }]}>
                      {tl(item.fiyat)} · stok {item.stok}
                    </Text>
                  </View>
                  {adet === 0 ? (
                    <TouchableOpacity
                      style={[s.ekle, { borderColor: renkler.primary }]}
                      onPress={() => adetDegis(item, 1)}
                    >
                      <Ionicons name="add" size={18} color={renkler.primary} />
                    </TouchableOpacity>
                  ) : (
                    <View style={s.adetRow}>
                      <TouchableOpacity
                        style={[s.adetBtn, { borderColor: renkler.primary }]}
                        onPress={() => adetDegis(item, -1)}
                      >
                        <Ionicons name="remove" size={16} color={renkler.primary} />
                      </TouchableOpacity>
                      <Text style={[s.adetText, { color: renkler.text }]}>{adet}</Text>
                      <TouchableOpacity
                        style={[s.adetBtn, { borderColor: renkler.primary }, adet >= item.stok && s.pasif]}
                        disabled={adet >= item.stok}
                        onPress={() => adetDegis(item, 1)}
                      >
                        <Ionicons name="add" size={16} color={renkler.primary} />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            }}
          />
        )}

        {toplamAdet > 0 && (
          <View style={[s.altBar, { backgroundColor: renkler.card, borderColor: renkler.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[s.altBarLabel, { color: renkler.subtext }]}>{toplamAdet} ürün</Text>
              <Text style={[s.altBarToplam, { color: renkler.text }]}>{tl(toplam)}</Text>
            </View>
            <TouchableOpacity
              style={[s.kaydetBtn, { backgroundColor: renkler.primary }]}
              onPress={kaydet}
              disabled={gonderiliyor}
            >
              {gonderiliyor
                ? <ActivityIndicator color={renkler.primaryText} />
                : <Text style={[s.kaydetText, { color: renkler.primaryText }]}>Satıldı</Text>}
            </TouchableOpacity>
          </View>
        )}
      </View>
      <UyariKatmani />
    </Modal>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  ust: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16, paddingTop: 18, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  baslik: { fontSize: 20, fontWeight: '800' },
  altBaslik: { fontSize: 13, marginTop: 2 },
  liste: { padding: 12, paddingBottom: 24 },
  bosKutu: { alignItems: 'center', padding: 40 },
  bos: { fontSize: 14, textAlign: 'center', marginTop: 12, lineHeight: 20 },
  satir: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 10, borderRadius: 12, marginBottom: 10,
  },
  foto: { width: 46, height: 46, borderRadius: 8 },
  fotoBos: { alignItems: 'center', justifyContent: 'center' },
  ad: { fontSize: 15, fontWeight: '600' },
  alt: { fontSize: 13, marginTop: 2 },
  ekle: {
    borderWidth: 1.5, borderRadius: 8, width: 34, height: 34,
    alignItems: 'center', justifyContent: 'center',
  },
  adetRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  adetBtn: {
    borderWidth: 1.5, borderRadius: 8, width: 30, height: 30,
    alignItems: 'center', justifyContent: 'center',
  },
  pasif: { opacity: 0.4 },
  adetText: { fontSize: 16, fontWeight: '700', minWidth: 18, textAlign: 'center' },
  altBar: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16, paddingBottom: 28, borderTopWidth: 1,
  },
  altBarLabel: { fontSize: 12 },
  altBarToplam: { fontSize: 20, fontWeight: '800' },
  kaydetBtn: { borderRadius: 12, paddingVertical: 14, paddingHorizontal: 28, alignItems: 'center' },
  kaydetText: { fontSize: 16, fontWeight: '700' },
});
