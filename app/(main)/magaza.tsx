import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Image, Modal, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../src/lib/supabase';
import { useSession } from '../../src/hooks/useSession';
import { useTheme } from '../../src/theme/ThemeContext';
import { useSepet } from '../../src/context/SepetContext';
import { Branch, Product } from '../../src/types';
import { tl, urunGorselUrl } from '../../src/lib/urun';
import { IndirimHaritasi, indirimliFiyat, kampanyaIndirimHaritasi } from '../../src/lib/kampanya';
import { Yukleniyor } from '../../src/components/Yukleniyor';

export default function MagazaScreen() {
  const { session } = useSession();
  const { renkler } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ sube?: string }>();
  const sepet = useSepet();

  const [subeler, setSubeler] = useState<Branch[]>([]);
  const [urunler, setUrunler] = useState<Product[]>([]);
  const [indirim, setIndirim] = useState<IndirimHaritasi>({ hizmet: {}, urun: {} });
  const [loading, setLoading] = useState(true);
  const [urunYukleniyor, setUrunYukleniyor] = useState(false);

  const subeId = sepet.subeId;

  // Ürünün kampanya indirimi (%) ve indirimli net fiyatı (gösterim).
  // Sipariş fiyatını sunucu (siparis_olustur → kampanya_indirim) zorlar.
  const urunIndirim = (p: Product) => indirim.urun[p.id] ?? 0;
  const netFiyat = (p: Product) => indirimliFiyat(p.fiyat, urunIndirim(p));

  const [sepetAcik, setSepetAcik] = useState(false);
  const [musteriNot, setMusteriNot] = useState('');
  const [gonderiliyor, setGonderiliyor] = useState(false);

  useFocusEffect(useCallback(() => {
    let iptal = false;
    Promise.all([
      supabase.from('branches').select('*').eq('aktif', true).order('ad'),
      kampanyaIndirimHaritasi(),
    ]).then(([{ data }, indHarita]) => {
      if (iptal) return;
      setSubeler((data as Branch[]) ?? []);
      setIndirim(indHarita);
      setLoading(false);
    });
    return () => { iptal = true; };
  }, []));

  // Şube seçimi: kampanyadan gelindiyse o şube; yoksa mevcut seçim; yoksa ilk şube.
  // (sepet.subeId taze okunur — şube değişince sepet otomatik temizlenir.)
  useEffect(() => {
    if (subeler.length === 0) return;
    const istenen = typeof params.sube === 'string' && subeler.some(s => s.id === params.sube)
      ? params.sube : null;
    if (istenen) sepet.subeSec(istenen);
    else if (!sepet.subeId) sepet.subeSec(subeler[0].id);
  }, [subeler, params.sube]);

  // Seçili şubenin aktif ürünleri (çok satan önce). RLS yalnızca aktif/silinmemiş
  // ürünleri müşteriye döndürür; ayrıca açıkça filtreliyoruz.
  useFocusEffect(useCallback(() => {
    if (!subeId) { setUrunler([]); return; }
    let iptal = false;
    setUrunYukleniyor(true);
    supabase
      .from('products')
      .select('*')
      .eq('branch_id', subeId)
      .eq('aktif', true)
      .eq('silindi_mi', false)
      .order('one_cikan', { ascending: false })
      .order('satis_adedi', { ascending: false })
      .order('ad')
      .then(({ data }) => {
        if (iptal) return;
        setUrunler((data as Product[]) ?? []);
        setUrunYukleniyor(false);
      });
    return () => { iptal = true; };
  }, [subeId]));

  const toplam = useMemo(
    () => sepet.kalemler.reduce((acc, k) => acc + netFiyat(k.urun) * k.adet, 0),
    [sepet.kalemler, indirim],
  );

  async function siparisGonder() {
    if (!session?.user || !subeId || sepet.kalemler.length === 0) return;
    setGonderiliyor(true);
    const items = sepet.kalemler.map(k => ({ product_id: k.urun.id, adet: k.adet }));
    const { error } = await supabase.rpc('siparis_olustur', {
      p_branch_id: subeId,
      p_items: items,
      p_not: musteriNot.trim() || null,
    });
    setGonderiliyor(false);
    if (error) { Alert.alert('Sipariş alınamadı', error.message); return; }
    sepet.temizle();
    setMusteriNot('');
    setSepetAcik(false);
    Alert.alert(
      'Sipariş talebin alındı',
      'Şube siparişini hazırlayıp seninle iletişime geçecek. Ödeme şubede yapılır.',
    );
  }

  if (loading) return <Yukleniyor />;

  const seciliSube = subeler.find(s => s.id === subeId);

  return (
    <View style={[s.container, { backgroundColor: renkler.bg }]}>
      <FlatList
        data={urunler}
        keyExtractor={p => p.id}
        numColumns={2}
        columnWrapperStyle={s.satir}
        contentContainerStyle={s.liste}
        ListHeaderComponent={
          <View>
            <Text style={[s.bolum, { color: renkler.subtext }]}>ŞUBE</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.subeSerit}>
              {subeler.map(sube => {
                const aktif = subeId === sube.id;
                return (
                  <TouchableOpacity
                    key={sube.id}
                    style={[
                      s.subeBtn,
                      { backgroundColor: renkler.card, borderColor: aktif ? renkler.primary : renkler.border },
                      aktif && { backgroundColor: renkler.primary, borderColor: renkler.primary },
                    ]}
                    onPress={() => sepet.subeSec(sube.id)}
                  >
                    <Text style={[s.subeBtnText, { color: aktif ? renkler.primaryText : renkler.text }]}>
                      {sube.ad}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <Text style={[s.bolum, { color: renkler.subtext, marginTop: 16 }]}>ÜRÜNLER</Text>
            {urunYukleniyor && <ActivityIndicator color={renkler.primary} style={{ marginVertical: 16 }} />}
          </View>
        }
        ListEmptyComponent={
          urunYukleniyor ? null : (
            <View style={s.bosKutu}>
              <Ionicons name="bag-handle-outline" size={44} color={renkler.subtext} />
              <Text style={[s.bosBaslik, { color: renkler.text }]}>
                {seciliSube ? `${seciliSube.ad} için ürün yok` : 'Şube seç'}
              </Text>
              <Text style={[s.bosAlt, { color: renkler.subtext }]}>
                Bu şube henüz ürün eklememiş. Başka şube dene.
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => {
          const adet = sepet.adet(item.id);
          const tukendi = item.stok <= 0;
          const ind = urunIndirim(item);
          return (
            <View style={[s.kart, { backgroundColor: renkler.card }, tukendi && s.pasif]}>
              {/* Karta dokun → ürün detayı (büyük + büyütülebilir foto) */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => router.push({ pathname: '/urun-detay', params: { urunId: item.id } })}
              >
                {item.gorsel ? (
                  <Image source={{ uri: urunGorselUrl(item.gorsel)! }} style={s.kartGorsel} resizeMode="cover" />
                ) : (
                  <View style={[s.kartGorsel, s.kartGorselBos, { backgroundColor: renkler.rozetBg }]}>
                    <Ionicons name="cube-outline" size={28} color={renkler.subtext} />
                  </View>
                )}
                {ind > 0 ? (
                  <View style={[s.rozet, { backgroundColor: renkler.danger }]}>
                    <Text style={[s.rozetText, { color: '#fff' }]}>%{ind} indirim</Text>
                  </View>
                ) : item.one_cikan ? (
                  <View style={[s.rozet, { backgroundColor: renkler.primary }]}>
                    <Text style={[s.rozetText, { color: renkler.primaryText }]}>Çok satan</Text>
                  </View>
                ) : null}
                <Text style={[s.urunAd, { color: renkler.text }]} numberOfLines={2}>{item.ad}</Text>
                {item.kategori ? (
                  <Text style={[s.urunKat, { color: renkler.subtext }]} numberOfLines={1}>{item.kategori}</Text>
                ) : null}
                {ind > 0 ? (
                  <View style={s.fiyatRow}>
                    <Text style={[s.fiyatEski, { color: renkler.subtext }]}>{tl(item.fiyat)}</Text>
                    <Text style={[s.urunFiyat, { color: renkler.primary }]}>{tl(netFiyat(item))}</Text>
                  </View>
                ) : (
                  <Text style={[s.urunFiyat, { color: renkler.primary }]}>{tl(item.fiyat)}</Text>
                )}
              </TouchableOpacity>

              {tukendi ? (
                <Text style={[s.tukendi, { color: renkler.danger }]}>Tükendi</Text>
              ) : adet === 0 ? (
                <TouchableOpacity
                  style={[s.ekleBtn, { backgroundColor: renkler.primary }]}
                  onPress={() => sepet.ekle(item, 1)}
                >
                  <Ionicons name="add" size={16} color={renkler.primaryText} />
                  <Text style={[s.ekleBtnText, { color: renkler.primaryText }]}>Sepete ekle</Text>
                </TouchableOpacity>
              ) : (
                <View style={s.adetRow}>
                  <TouchableOpacity
                    style={[s.adetBtn, { borderColor: renkler.primary }]}
                    onPress={() => sepet.ekle(item, -1)}
                  >
                    <Ionicons name="remove" size={18} color={renkler.primary} />
                  </TouchableOpacity>
                  <Text style={[s.adetText, { color: renkler.text }]}>{adet}</Text>
                  <TouchableOpacity
                    style={[s.adetBtn, { borderColor: renkler.primary }, adet >= item.stok && s.adetBtnPasif]}
                    disabled={adet >= item.stok}
                    onPress={() => sepet.ekle(item, 1)}
                  >
                    <Ionicons name="add" size={18} color={renkler.primary} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        }}
      />

      {sepet.toplamAdet > 0 && (
        <TouchableOpacity
          style={[s.sepetBar, { backgroundColor: renkler.primary }]}
          onPress={() => setSepetAcik(true)}
        >
          <View style={[s.sepetSayac, { backgroundColor: renkler.primaryText }]}>
            <Text style={[s.sepetSayacText, { color: renkler.primary }]}>{sepet.toplamAdet}</Text>
          </View>
          <Text style={[s.sepetBarText, { color: renkler.primaryText }]}>Sepeti gör</Text>
          <Text style={[s.sepetBarFiyat, { color: renkler.primaryText }]}>{tl(toplam)}</Text>
        </TouchableOpacity>
      )}

      <Modal visible={sepetAcik} animationType="slide" presentationStyle="pageSheet">
        <ScrollView
          style={{ backgroundColor: renkler.card }}
          contentContainerStyle={s.modal}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[s.modalBaslik, { color: renkler.text }]}>Sepetim</Text>
          {sepet.kalemler.map(({ urun: p, adet }) => (
            <View key={p.id} style={[s.sepetSatir, { borderColor: renkler.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[s.sepetUrunAd, { color: renkler.text }]}>{p.ad}</Text>
                <Text style={[s.sepetUrunAlt, { color: renkler.subtext }]}>
                  {adet} × {tl(netFiyat(p))}
                  {urunIndirim(p) > 0 ? `  (%${urunIndirim(p)} indirim)` : ''}
                </Text>
              </View>
              <View style={s.adetRow}>
                <TouchableOpacity style={[s.adetBtn, { borderColor: renkler.primary }]} onPress={() => sepet.ekle(p, -1)}>
                  <Ionicons name="remove" size={18} color={renkler.primary} />
                </TouchableOpacity>
                <Text style={[s.adetText, { color: renkler.text }]}>{adet}</Text>
                <TouchableOpacity
                  style={[s.adetBtn, { borderColor: renkler.primary }, adet >= p.stok && s.adetBtnPasif]}
                  disabled={adet >= p.stok}
                  onPress={() => sepet.ekle(p, 1)}
                >
                  <Ionicons name="add" size={18} color={renkler.primary} />
                </TouchableOpacity>
              </View>
            </View>
          ))}

          <Text style={[s.label, { color: renkler.subtext }]}>Not (opsiyonel)</Text>
          <TextInput
            style={[s.input, { borderColor: renkler.border, backgroundColor: renkler.input, color: renkler.text }]}
            placeholder="Şubeye iletmek istediğin bir not"
            placeholderTextColor={renkler.subtext}
            multiline
            value={musteriNot}
            onChangeText={setMusteriNot}
          />

          <View style={[s.toplamSatir, { borderColor: renkler.border }]}>
            <Text style={[s.toplamLabel, { color: renkler.subtext }]}>Toplam</Text>
            <Text style={[s.toplamFiyat, { color: renkler.primary }]}>{tl(toplam)}</Text>
          </View>
          <Text style={[s.odemeNot, { color: renkler.subtext }]}>
            Ödeme şubede yapılır. Bu bir sipariş talebidir.
          </Text>

          <TouchableOpacity
            style={[s.gonderBtn, { backgroundColor: renkler.primary }]}
            onPress={siparisGonder}
            disabled={gonderiliyor || sepet.kalemler.length === 0}
          >
            {gonderiliyor
              ? <ActivityIndicator color={renkler.primaryText} />
              : <Text style={[s.gonderBtnText, { color: renkler.primaryText }]}>Sipariş Talebi Gönder</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={s.iptal} onPress={() => setSepetAcik(false)}>
            <Text style={[s.iptalText, { color: renkler.subtext }]}>Alışverişe devam et</Text>
          </TouchableOpacity>
        </ScrollView>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  liste: { padding: 12, paddingBottom: 96 },
  satir: { gap: 12 },
  bolum: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 8, marginLeft: 4 },
  subeSerit: { gap: 8, paddingVertical: 2 },
  subeBtn: { borderWidth: 1.5, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 16 },
  subeBtnText: { fontSize: 14, fontWeight: '600' },
  bosKutu: { alignItems: 'center', padding: 32 },
  bosBaslik: { fontSize: 17, fontWeight: '700', marginTop: 16 },
  bosAlt: { fontSize: 14, textAlign: 'center', marginTop: 6, lineHeight: 20 },
  kart: { flex: 1, borderRadius: 12, padding: 10, marginBottom: 12 },
  pasif: { opacity: 0.55 },
  // Hafif dikey dikdörtgen kapak (4:5 portre)
  kartGorsel: { width: '100%', aspectRatio: 4 / 5, borderRadius: 8, marginBottom: 8 },
  kartGorselBos: { alignItems: 'center', justifyContent: 'center' },
  rozet: { position: 'absolute', top: 8, left: 8, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  rozetText: { fontSize: 10, fontWeight: '700' },
  urunAd: { fontSize: 14, fontWeight: '600', minHeight: 36 },
  urunKat: { fontSize: 12, marginTop: 1 },
  urunFiyat: { fontSize: 16, fontWeight: '800', marginTop: 4 },
  fiyatRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 4 },
  fiyatEski: { fontSize: 12, fontWeight: '600', textDecorationLine: 'line-through' },
  tukendi: { fontSize: 13, fontWeight: '700', marginTop: 8, paddingVertical: 6 },
  ekleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    borderRadius: 8, paddingVertical: 8, marginTop: 8,
  },
  ekleBtnText: { fontSize: 13, fontWeight: '700' },
  adetRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 8 },
  adetBtn: { borderWidth: 1.5, borderRadius: 8, width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  adetBtnPasif: { opacity: 0.4 },
  adetText: { fontSize: 16, fontWeight: '700', minWidth: 20, textAlign: 'center' },
  sepetBar: {
    position: 'absolute', left: 16, right: 16, bottom: 16,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 12, padding: 16,
  },
  sepetSayac: { borderRadius: 12, minWidth: 24, height: 24, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
  sepetSayacText: { fontSize: 13, fontWeight: '800' },
  sepetBarText: { flex: 1, fontSize: 15, fontWeight: '700' },
  sepetBarFiyat: { fontSize: 16, fontWeight: '800' },
  modal: { padding: 24, paddingBottom: 48 },
  modalBaslik: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, marginTop: 8 },
  sepetSatir: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 12,
  },
  sepetUrunAd: { fontSize: 15, fontWeight: '600' },
  sepetUrunAlt: { fontSize: 13, marginTop: 2 },
  label: { fontSize: 14, marginBottom: 6, marginTop: 20 },
  input: { borderWidth: 1, borderRadius: 10, padding: 13, fontSize: 16, minHeight: 70, textAlignVertical: 'top' },
  toplamSatir: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderTopWidth: 1, marginTop: 20, paddingTop: 16,
  },
  toplamLabel: { fontSize: 15 },
  toplamFiyat: { fontSize: 22, fontWeight: '800' },
  odemeNot: { fontSize: 12, marginTop: 8, lineHeight: 17 },
  gonderBtn: { borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 20 },
  gonderBtnText: { fontSize: 16, fontWeight: '700' },
  iptal: { alignItems: 'center', padding: 12, marginTop: 4 },
  iptalText: { fontSize: 14 },
});
