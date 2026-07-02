import { uyari } from '../../src/lib/uyari';
import { UyariKatmani } from '../../src/components/UyariProvider';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Image, Modal, ScrollView,
  StyleSheet, Switch, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { Redirect, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../src/lib/supabase';
import { useSession } from '../../src/hooks/useSession';
import { useTheme } from '../../src/theme/ThemeContext';
import { Product } from '../../src/types';
import { PRODUCT_BUCKET, tl, urunGorselUrl } from '../../src/lib/urun';
import { KlavyeKapsa } from '../../src/components/KlavyeKapsa';
import { Yukleniyor } from '../../src/components/Yukleniyor';

export default function UrunlerScreen() {
  const { profile } = useSession();
  const { renkler } = useTheme();
  const branchId = profile?.branch_id ?? null;

  const [urunler, setUrunler] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAcik, setModalAcik] = useState(false);
  const [duzenlenen, setDuzenlenen] = useState<Product | null>(null);
  const [ad, setAd] = useState('');
  const [kategori, setKategori] = useState('');
  const [aciklama, setAciklama] = useState('');
  const [fiyat, setFiyat] = useState('');
  const [stok, setStok] = useState('');
  const [minEsik, setMinEsik] = useState('');
  const [puan, setPuan] = useState('');
  const [puanBedeli, setPuanBedeli] = useState('');
  const [gorsel, setGorsel] = useState<string | null>(null);
  const [gorselYukleniyor, setGorselYukleniyor] = useState(false);
  const [oneCikan, setOneCikan] = useState(false);
  const [aktif, setAktif] = useState(true);
  const [kayit, setKayit] = useState(false);

  useFocusEffect(useCallback(() => { yukle(); }, [branchId]));

  async function yukle() {
    if (!branchId) { setLoading(false); return; }
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('branch_id', branchId)
      .eq('silindi_mi', false)
      .order('one_cikan', { ascending: false })
      .order('ad');
    if (error) uyari('Hata', error.message);
    else setUrunler((data as Product[]) ?? []);
    setLoading(false);
  }

  function formuSifirla() {
    setDuzenlenen(null);
    setAd(''); setKategori(''); setAciklama(''); setFiyat(''); setStok(''); setMinEsik(''); setPuan(''); setPuanBedeli('');
    setGorsel(null); setOneCikan(false); setAktif(true);
  }

  function yeni() { formuSifirla(); setModalAcik(true); }

  function ac(item: Product) {
    setDuzenlenen(item);
    setAd(item.ad);
    setKategori(item.kategori ?? '');
    setAciklama(item.aciklama ?? '');
    setFiyat(String(item.fiyat));
    setStok(String(item.stok));
    setMinEsik(String(item.min_esik ?? 0));
    setPuan(String(item.puan ?? 0));
    setPuanBedeli(String(item.puan_bedeli ?? 0));
    setGorsel(item.gorsel);
    setOneCikan(item.one_cikan);
    setAktif(item.aktif);
    setModalAcik(true);
  }

  async function gorselSec() {
    try {
      const izin = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!izin.granted) {
        uyari('İzin gerekli', 'Görsel seçmek için galeri erişimi gerekli.');
        return;
      }
      const sonuc = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'], quality: 0.7, allowsEditing: true, aspect: [1, 1],
      });
      if (sonuc.canceled || !sonuc.assets?.[0]) return;
      const asset = sonuc.assets[0];
      setGorselYukleniyor(true);
      const res = await fetch(asset.uri);
      const buf = await res.arrayBuffer();
      const mime = asset.mimeType ?? 'image/jpeg';
      const uzanti = mime === 'image/png' ? 'png' : 'jpg';
      const yol = `urunler/${branchId}/${Date.now()}.${uzanti}`;
      const { error } = await supabase.storage
        .from(PRODUCT_BUCKET).upload(yol, buf, { contentType: mime, upsert: false });
      setGorselYukleniyor(false);
      if (error) { uyari('Yüklenemedi', error.message); return; }
      setGorsel(yol);
    } catch (e: any) {
      setGorselYukleniyor(false);
      uyari('Hata', e?.message ?? 'Görsel yüklenemedi');
    }
  }

  async function kaydet() {
    if (!branchId) return;
    const f = parseFloat(fiyat.replace(',', '.'));
    const st = parseInt(stok, 10);
    if (!ad.trim()) { uyari('Hata', 'Ürün adı zorunlu'); return; }
    if (!Number.isFinite(f) || f < 0) { uyari('Hata', 'Geçerli bir fiyat girin'); return; }
    if (!Number.isFinite(st) || st < 0) { uyari('Hata', 'Geçerli bir stok adedi girin'); return; }

    const me = parseInt(minEsik || '0', 10);
    if (!Number.isFinite(me) || me < 0) { uyari('Hata', 'Min. stok 0 veya üzeri olmalı'); return; }

    const veri = {
      branch_id: branchId,
      ad: ad.trim(),
      kategori: kategori.trim() || null,
      aciklama: aciklama.trim() || null,
      fiyat: f,
      stok: st,
      min_esik: me,
      puan: parseInt(puan || '0', 10) || 0,
      puan_bedeli: parseInt(puanBedeli || '0', 10) || 0,
      gorsel,
      one_cikan: oneCikan,
      aktif,
    };

    setKayit(true);
    const { error } = duzenlenen
      ? await supabase.from('products').update(veri).eq('id', duzenlenen.id)
      : await supabase.from('products').insert(veri);
    setKayit(false);
    if (error) { uyari('Hata', error.message); return; }
    setModalAcik(false);
    formuSifirla();
    yukle();
  }

  function silOnayi() {
    if (!duzenlenen) return;
    uyari('Ürünü Sil', `${duzenlenen.ad} silinecek. Emin misin?`, [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: sil },
    ]);
  }

  async function sil() {
    if (!duzenlenen) return;
    setKayit(true);
    // Soft delete: sipariş geçmişi ürüne bağlı kalabilir
    const { error } = await supabase
      .from('products').update({ silindi_mi: true, aktif: false }).eq('id', duzenlenen.id);
    setKayit(false);
    if (error) { uyari('Hata', error.message); return; }
    setModalAcik(false);
    formuSifirla();
    yukle();
  }

  // Yalnızca yönetici (ürünler şube bazlı) + admin. Çalışan/müşteri giremez.
  if (profile && profile.rol !== 'yonetici' && profile.rol !== 'admin') {
    return <Redirect href="/(main)" />;
  }

  if (loading) return <Yukleniyor />;

  if (!branchId) {
    return (
      <View style={[s.container, { backgroundColor: renkler.bg }]}>
        <Text style={[s.bos, { color: renkler.subtext }]}>
          Ürün yönetimi için hesabına bağlı bir şube gerekli.
        </Text>
      </View>
    );
  }

  return (
    <View style={[s.container, { backgroundColor: renkler.bg }]}>
      <FlatList
        data={urunler}
        keyExtractor={p => p.id}
        contentContainerStyle={{ paddingTop: 8 }}
        ListHeaderComponent={
          <Text style={[s.sayfaBaslik, { color: renkler.text }]}>Ürünler</Text>
        }
        ListEmptyComponent={
          <Text style={[s.bos, { color: renkler.subtext }]}>
            Henüz ürün yok. "+ Ürün Ekle" ile başla.
          </Text>
        }
        renderItem={({ item }) => {
          const dusuk = item.min_esik > 0 && item.stok <= item.min_esik;
          return (
          <TouchableOpacity
            style={[s.kart, { backgroundColor: renkler.card }, !item.aktif && s.pasif]}
            onPress={() => ac(item)}
          >
            {item.gorsel ? (
              <Image source={{ uri: urunGorselUrl(item.gorsel)! }} style={s.kartGorsel} resizeMode="cover" />
            ) : (
              <View style={[s.kartGorsel, s.kartGorselBos, { backgroundColor: renkler.rozetBg }]}>
                <Ionicons name="cube-outline" size={22} color={renkler.subtext} />
              </View>
            )}
            <View style={s.kartSol}>
              <Text style={[s.ad, { color: renkler.text }]}>
                {item.ad}{item.one_cikan ? ' ⭐' : ''}
              </Text>
              <Text style={[s.alt, { color: renkler.subtext }]}>
                {item.kategori ? `${item.kategori} · ` : ''}Stok: {item.stok}
                {!item.aktif ? ' · pasif' : ''}
                {dusuk ? <Text style={{ color: renkler.danger, fontWeight: '700' }}> · ⚠ düşük</Text> : null}
              </Text>
            </View>
            <Text style={[s.fiyat, { color: renkler.primary }]}>{tl(item.fiyat)}</Text>
          </TouchableOpacity>
          );
        }}
      />
      <TouchableOpacity style={[s.ekleBtn, { backgroundColor: renkler.primary }]} onPress={yeni}>
        <Text style={[s.ekleBtnText, { color: renkler.primaryText }]}>+ Ürün Ekle</Text>
      </TouchableOpacity>

      <Modal visible={modalAcik} animationType="slide" presentationStyle="pageSheet">
        <KlavyeKapsa style={{ backgroundColor: renkler.card }}>
        <ScrollView
          style={{ backgroundColor: renkler.card }}
          contentContainerStyle={s.modal}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[s.modalBaslik, { color: renkler.text }]}>
            {duzenlenen ? 'Ürünü Düzenle' : 'Ürün Ekle'}
          </Text>

          <Text style={[s.label, { color: renkler.subtext }]}>Ürün Görseli</Text>
          <TouchableOpacity
            style={[s.gorselAlan, { borderColor: renkler.border, backgroundColor: renkler.input }]}
            onPress={gorselSec}
            disabled={gorselYukleniyor}
          >
            {gorselYukleniyor ? (
              <ActivityIndicator color={renkler.primary} />
            ) : gorsel ? (
              <Image source={{ uri: urunGorselUrl(gorsel)! }} style={s.gorselOnizleme} resizeMode="cover" />
            ) : (
              <View style={s.gorselBos}>
                <Ionicons name="image-outline" size={28} color={renkler.subtext} />
                <Text style={[s.gorselBosText, { color: renkler.subtext }]}>Görsel seç</Text>
              </View>
            )}
          </TouchableOpacity>
          {gorsel && !gorselYukleniyor && (
            <TouchableOpacity onPress={() => setGorsel(null)} style={s.gorselKaldir}>
              <Text style={[s.gorselKaldirText, { color: renkler.danger }]}>Görseli kaldır</Text>
            </TouchableOpacity>
          )}

          <Text style={[s.label, { color: renkler.subtext }]}>Ürün Adı *</Text>
          <TextInput
            style={[s.input, { borderColor: renkler.border, backgroundColor: renkler.input, color: renkler.text }]}
            placeholder="Cam Suyu / Koku / Mikrofiber Bez"
            placeholderTextColor={renkler.subtext}
            value={ad} onChangeText={setAd}
          />

          <Text style={[s.label, { color: renkler.subtext }]}>Kategori</Text>
          <TextInput
            style={[s.input, { borderColor: renkler.border, backgroundColor: renkler.input, color: renkler.text }]}
            placeholder="bakim / koku / aksesuar"
            placeholderTextColor={renkler.subtext}
            autoCapitalize="none"
            value={kategori} onChangeText={setKategori}
          />

          <View style={s.ikiliRow}>
            <View style={s.ikiliKol}>
              <Text style={[s.label, { color: renkler.subtext }]}>Fiyat (TL) *</Text>
              <TextInput
                style={[s.input, { borderColor: renkler.border, backgroundColor: renkler.input, color: renkler.text }]}
                placeholder="150"
                placeholderTextColor={renkler.subtext}
                keyboardType="decimal-pad"
                value={fiyat} onChangeText={setFiyat}
              />
            </View>
            <View style={s.ikiliKol}>
              <Text style={[s.label, { color: renkler.subtext }]}>Stok *</Text>
              <TextInput
                style={[s.input, { borderColor: renkler.border, backgroundColor: renkler.input, color: renkler.text }]}
                placeholder="20"
                placeholderTextColor={renkler.subtext}
                keyboardType="number-pad"
                value={stok} onChangeText={setStok}
              />
            </View>
            <View style={s.ikiliKol}>
              <Text style={[s.label, { color: renkler.subtext }]}>Min. stok</Text>
              <TextInput
                style={[s.input, { borderColor: renkler.border, backgroundColor: renkler.input, color: renkler.text }]}
                placeholder="0"
                placeholderTextColor={renkler.subtext}
                keyboardType="number-pad"
                value={minEsik} onChangeText={setMinEsik}
              />
            </View>
          </View>
          <Text style={[s.ipucu, { color: renkler.subtext }]}>
            Stok, min. stoğa düşünce panelde "düşük stok" uyarısı çıkar (0 = uyarı yok).
          </Text>

          <Text style={[s.label, { color: renkler.subtext }]}>Kazandıracağı Puan</Text>
          <TextInput
            style={[s.input, { borderColor: renkler.border, backgroundColor: renkler.input, color: renkler.text }]}
            placeholder="0"
            placeholderTextColor={renkler.subtext}
            keyboardType="number-pad"
            value={puan} onChangeText={setPuan}
          />
          <Text style={[s.ipucu, { color: renkler.subtext }]}>
            Sipariş teslim edilince adet başına bu kadar sadakat puanı verilir (0 = puan yok).
          </Text>

          <Text style={[s.label, { color: renkler.subtext }]}>Puanla Alım Bedeli</Text>
          <TextInput
            style={[s.input, { borderColor: renkler.border, backgroundColor: renkler.input, color: renkler.text }]}
            placeholder="0"
            placeholderTextColor={renkler.subtext}
            keyboardType="number-pad"
            value={puanBedeli} onChangeText={setPuanBedeli}
          />
          <Text style={[s.ipucu, { color: renkler.subtext }]}>
            Bu ürün Puan Mağazası'nda kaç puana alınır. 0 = puanla alınamaz.
          </Text>

          <Text style={[s.label, { color: renkler.subtext }]}>Açıklama</Text>
          <TextInput
            style={[s.input, s.cokSatir, { borderColor: renkler.border, backgroundColor: renkler.input, color: renkler.text }]}
            placeholder="Ürün hakkında kısa bilgi"
            placeholderTextColor={renkler.subtext}
            multiline
            value={aciklama} onChangeText={setAciklama}
          />

          <View style={s.switchRow}>
            <Switch value={oneCikan} onValueChange={setOneCikan} />
            <Text style={[s.switchText, { color: renkler.text }]}>Öne çıkar ("çok satan" rozeti + randevu ekranı)</Text>
          </View>
          <View style={s.switchRow}>
            <Switch value={aktif} onValueChange={setAktif} />
            <Text style={[s.switchText, { color: renkler.text }]}>Aktif (müşteriler görür)</Text>
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
            <TouchableOpacity style={[s.silBtn, { borderColor: renkler.danger }]} onPress={silOnayi} disabled={kayit}>
              <Text style={[s.silText, { color: renkler.danger }]}>Ürünü Sil</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={s.iptal} onPress={() => { setModalAcik(false); formuSifirla(); }}>
            <Text style={[s.iptalText, { color: renkler.subtext }]}>Vazgeç</Text>
          </TouchableOpacity>
        </ScrollView>
        </KlavyeKapsa>
        <UyariKatmani />
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  sayfaBaslik: { fontSize: 26, fontWeight: '800', paddingHorizontal: 16, marginTop: 8, marginBottom: 4 },
  bos: { textAlign: 'center', marginTop: 60, fontSize: 15, paddingHorizontal: 32 },
  kart: {
    margin: 12, marginBottom: 0, padding: 12, borderRadius: 12,
    flexDirection: 'row', alignItems: 'center',
  },
  pasif: { opacity: 0.5 },
  kartGorsel: { width: 52, height: 52, borderRadius: 8, marginRight: 12 },
  kartGorselBos: { alignItems: 'center', justifyContent: 'center' },
  kartSol: { flex: 1 },
  ad: { fontSize: 16, fontWeight: '600' },
  alt: { fontSize: 13, marginTop: 2 },
  fiyat: { fontSize: 16, fontWeight: '700' },
  ekleBtn: { margin: 16, padding: 16, borderRadius: 12, alignItems: 'center' },
  ekleBtnText: { fontWeight: '700', fontSize: 16 },
  modal: { padding: 24, paddingBottom: 48 },
  modalBaslik: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, marginTop: 8 },
  label: { fontSize: 14, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, padding: 13, fontSize: 16, marginBottom: 16 },
  ipucu: { fontSize: 12, lineHeight: 17, marginTop: -8, marginBottom: 16 },
  cokSatir: { minHeight: 80, textAlignVertical: 'top' },
  ikiliRow: { flexDirection: 'row', gap: 12 },
  ikiliKol: { flex: 1 },
  gorselAlan: {
    borderWidth: 1, borderRadius: 12, height: 150, marginBottom: 8,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  gorselOnizleme: { width: '100%', height: '100%' },
  gorselBos: { alignItems: 'center', gap: 8, padding: 16 },
  gorselBosText: { fontSize: 13 },
  gorselKaldir: { alignSelf: 'flex-start', paddingVertical: 4, marginBottom: 12 },
  gorselKaldirText: { fontSize: 13, fontWeight: '600' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  switchText: { flex: 1, fontSize: 14 },
  btn: { borderRadius: 10, padding: 16, alignItems: 'center', marginBottom: 12, marginTop: 4 },
  btnText: { fontSize: 16, fontWeight: '600' },
  silBtn: { borderWidth: 1, borderRadius: 10, padding: 14, alignItems: 'center', marginBottom: 12 },
  silText: { fontSize: 15, fontWeight: '600' },
  iptal: { alignItems: 'center', padding: 12 },
  iptalText: {},
});
