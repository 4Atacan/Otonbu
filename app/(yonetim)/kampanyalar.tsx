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
import { Campaign, KampanyaKategori } from '../../src/types';
import { CAMPAIGN_BUCKET, kampanyaGorselUrl, kampanyaRozet } from '../../src/lib/kampanya';
import { yukle as dosyaYukle } from '../../src/lib/storage';
import { KlavyeKapsa } from '../../src/components/KlavyeKapsa';
import { Yukleniyor } from '../../src/components/Yukleniyor';

// Kampanya tip seçenekleri (admin formundaki buton grubu)
const TIP_SECENEK: { value: KampanyaKategori; label: string; ipucu: string }[] = [
  { value: 'duyuru', label: 'Duyuru', ipucu: 'Sade tanıtım banner\'ı (mekanik yok).' },
  { value: 'indirim', label: '% İndirim', ipucu: 'Seçili hizmette yüzde fiyat indirimi.' },
  { value: 'puan', label: '+ Puan', ipucu: 'Seçili hizmette ekstra sadakat puanı.' },
  { value: 'hediye', label: 'Hediye', ipucu: 'Örn. "Yıkamada cam suyu hediye".' },
];

// Kampanyalar abonelikten BAĞIMSIZDIR — admin merkezden yönetir.
export default function KampanyalarYonetimScreen() {
  const { profile } = useSession();
  const { renkler } = useTheme();

  const [kampanyalar, setKampanyalar] = useState<Campaign[]>([]);
  const [hizmetler, setHizmetler] = useState<{ id: string; ad: string }[]>([]);
  const [urunlerListe, setUrunlerListe] = useState<{ id: string; ad: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAcik, setModalAcik] = useState(false);
  const [duzenlenen, setDuzenlenen] = useState<Campaign | null>(null);

  // form
  const [baslik, setBaslik] = useState('');
  const [aciklama, setAciklama] = useState('');
  const [tip, setTip] = useState<KampanyaKategori>('duyuru');
  const [hedef, setHedef] = useState<'genel' | 'hizmet' | 'urun'>('genel');
  const [hizmetId, setHizmetId] = useState<string | null>(null);
  const [urunId, setUrunId] = useState<string | null>(null);
  const [indirim, setIndirim] = useState('');
  const [bonusPuan, setBonusPuan] = useState('');
  const [hediye, setHediye] = useState('');
  const [gorsel, setGorsel] = useState<string | null>(null);
  const [gorselYukleniyor, setGorselYukleniyor] = useState(false);
  const [baslangic, setBaslangic] = useState('');
  const [bitis, setBitis] = useState('');
  const [aktif, setAktif] = useState(true);
  const [kayit, setKayit] = useState(false);

  useFocusEffect(useCallback(() => { yukle(); }, []));

  async function yukle() {
    const [{ data: kdata, error }, { data: hdata }, { data: udata }] = await Promise.all([
      supabase.from('campaigns').select('*').order('created_at', { ascending: false }),
      supabase.from('services').select('id, ad').eq('aktif', true).order('ad'),
      supabase.from('products').select('id, ad').eq('silindi_mi', false).order('ad'),
    ]);
    if (error) uyari('Hata', error.message);
    else setKampanyalar((kdata as Campaign[]) ?? []);
    setHizmetler((hdata as { id: string; ad: string }[]) ?? []);
    setUrunlerListe((udata as { id: string; ad: string }[]) ?? []);
    setLoading(false);
  }

  function formuSifirla() {
    setDuzenlenen(null);
    setBaslik(''); setAciklama(''); setTip('duyuru');
    setHedef('genel'); setHizmetId(null); setUrunId(null);
    setIndirim(''); setBonusPuan(''); setHediye(''); setGorsel(null);
    setBaslangic(''); setBitis(''); setAktif(true);
  }
  function yeni() { formuSifirla(); setModalAcik(true); }

  function ac(k: Campaign) {
    setDuzenlenen(k);
    setBaslik(k.baslik);
    setAciklama(k.aciklama ?? '');
    setTip(k.tip);
    setHizmetId(k.hizmet_id);
    setUrunId(k.urun_id);
    setHedef(k.hizmet_id ? 'hizmet' : k.urun_id ? 'urun' : 'genel');
    setIndirim(k.indirim_yuzde ? String(k.indirim_yuzde) : '');
    setBonusPuan(k.bonus_puan ? String(k.bonus_puan) : '');
    setHediye(k.hediye ?? '');
    setGorsel(k.gorsel);
    setBaslangic(k.baslangic ?? '');
    setBitis(k.bitis ?? '');
    setAktif(k.aktif);
    setModalAcik(true);
  }

  // Galeriden banner görseli seç → public campaign-images bucket'ına yükle.
  async function gorselSec() {
    try {
      const izin = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!izin.granted) {
        uyari('İzin gerekli', 'Görsel seçmek için galeri erişimi gerekli.');
        return;
      }
      const sonuc = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'], quality: 0.8, allowsEditing: true, aspect: [1, 1],
      });
      if (sonuc.canceled || !sonuc.assets?.[0]) return;

      const asset = sonuc.assets[0];
      setGorselYukleniyor(true);
      const yol = `kampanya/${Date.now()}.jpg`; // yukle jpeg üretir
      await dosyaYukle(CAMPAIGN_BUCKET, yol, asset.uri);
      setGorselYukleniyor(false);
      setGorsel(yol);
    } catch (e: any) {
      setGorselYukleniyor(false);
      uyari('Hata', e?.message ?? 'Görsel yüklenemedi');
    }
  }

  // Boş veya YYYY-MM-DD biçimi
  function tarihGecerli(t: string): boolean {
    if (!t.trim()) return true;
    return /^\d{4}-\d{2}-\d{2}$/.test(t.trim()) && !Number.isNaN(Date.parse(t.trim()));
  }

  async function kaydet() {
    if (!baslik.trim()) { uyari('Hata', 'Başlık zorunlu'); return; }

    // Hedefi (hizmet/ürün) hedef seçimine göre çöz — biri seçiliyse diğeri null.
    const kHizmet = hedef === 'hizmet' ? hizmetId : null;
    const kUrun = hedef === 'urun' ? urunId : null;

    let indirimYuzde: number | null = null;
    let bonus: number | null = null;
    let hed: string | null = null;

    if (tip === 'indirim') {
      indirimYuzde = parseInt(indirim, 10);
      if (!Number.isFinite(indirimYuzde) || indirimYuzde < 1 || indirimYuzde > 90) {
        uyari('Hata', 'İndirim için %1–90 arası bir değer girin'); return;
      }
      // İndirim sunucuda yalnız hedefe (hizmet/ürün) uygulanır → hedef zorunlu.
      if (!kHizmet && !kUrun) {
        uyari('Hata', 'İndirim kampanyası bir hizmete veya ürüne bağlanmalı'); return;
      }
    } else if (tip === 'puan') {
      bonus = parseInt(bonusPuan, 10);
      if (!Number.isFinite(bonus) || bonus <= 0) {
        uyari('Hata', 'Puan için 0\'dan büyük bir değer girin'); return;
      }
    } else if (tip === 'hediye') {
      hed = hediye.trim();
      if (!hed) { uyari('Hata', 'Hediye açıklaması girin (örn. "Cam suyu hediye")'); return; }
    }

    if (!tarihGecerli(baslangic) || !tarihGecerli(bitis)) {
      uyari('Hata', 'Tarihleri YYYY-AA-GG biçiminde girin (örn. 2026-07-01)'); return;
    }

    const veri = {
      baslik: baslik.trim(),
      aciklama: aciklama.trim() || null,
      tip,
      hizmet_id: kHizmet,
      urun_id: kUrun,
      indirim_yuzde: indirimYuzde,
      bonus_puan: bonus,
      hediye: hed,
      gorsel,
      baslangic: baslangic.trim() || null,
      bitis: bitis.trim() || null,
      aktif,
    };

    setKayit(true);
    const { error } = duzenlenen
      ? await supabase.from('campaigns').update(veri).eq('id', duzenlenen.id)
      : await supabase.from('campaigns').insert(veri);
    setKayit(false);

    if (error) { uyari('Hata', error.message); return; }
    setModalAcik(false);
    formuSifirla();
    yukle();
  }

  function sil(k: Campaign) {
    uyari('Kampanyayı sil', `"${k.baslik}" silinsin mi?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil', style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('campaigns').delete().eq('id', k.id);
          if (error) uyari('Hata', error.message);
          else yukle();
        },
      },
    ]);
  }

  if (profile && profile.rol !== 'admin') {
    return <Redirect href="/(yonetim)" />;
  }
  if (loading) return <Yukleniyor />;

  // Kampanyanın hedef etiketi (bağlı hizmet veya ürün adı)
  const hedefAdi = (k: Campaign): string | null => {
    if (k.hizmet_id) return hizmetler.find(h => h.id === k.hizmet_id)?.ad ?? '—';
    if (k.urun_id) return urunlerListe.find(u => u.id === k.urun_id)?.ad ?? '—';
    return null;
  };

  return (
    <View style={[s.container, { backgroundColor: renkler.bg }]}>
      <FlatList
        data={kampanyalar}
        keyExtractor={k => k.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 90 }}
        ListHeaderComponent={
          <Text style={[s.sayfaBaslik, { color: renkler.text }]}>Kampanyalar</Text>
        }
        ListEmptyComponent={
          <Text style={[s.bos, { color: renkler.subtext }]}>
            Henüz kampanya yok. "+ Kampanya Ekle" ile başla.
          </Text>
        }
        renderItem={({ item }) => {
          const rozet = kampanyaRozet(item);
          const uri = kampanyaGorselUrl(item.gorsel);
          return (
            <TouchableOpacity
              style={[s.kart, { backgroundColor: renkler.card }, !item.aktif && s.pasif]}
              onPress={() => ac(item)}
            >
              {uri ? (
                <Image source={{ uri }} style={s.kartGorsel} resizeMode="cover" />
              ) : (
                <View style={[s.kartGorsel, s.kartGorselBos, { backgroundColor: renkler.rozetBg }]}>
                  <Ionicons name="megaphone-outline" size={20} color={renkler.subtext} />
                </View>
              )}
              <View style={s.kartSol}>
                <Text style={[s.ad, { color: renkler.text }]} numberOfLines={1}>{item.baslik}</Text>
                <Text style={[s.alt, { color: renkler.subtext }]} numberOfLines={1}>
                  {rozet ? rozet.metin : 'Duyuru'}
                  {hedefAdi(item) ? ` · ${hedefAdi(item)}` : ''}
                  {!item.aktif ? ' · pasif' : ''}
                </Text>
              </View>
              <TouchableOpacity onPress={() => sil(item)} hitSlop={10} style={s.silBtn}>
                <Ionicons name="trash-outline" size={20} color={renkler.danger} />
              </TouchableOpacity>
            </TouchableOpacity>
          );
        }}
      />
      <TouchableOpacity
        style={[s.ekleBtn, { backgroundColor: renkler.primary }]}
        onPress={yeni}
      >
        <Text style={[s.ekleBtnText, { color: renkler.primaryText }]}>+ Kampanya Ekle</Text>
      </TouchableOpacity>

      <Modal visible={modalAcik} animationType="slide" presentationStyle="pageSheet">
        <KlavyeKapsa style={{ backgroundColor: renkler.card }}>
        <ScrollView
          style={{ backgroundColor: renkler.card }}
          contentContainerStyle={s.modal}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[s.modalBaslik, { color: renkler.text }]}>
            {duzenlenen ? 'Kampanyayı Düzenle' : 'Kampanya Ekle'}
          </Text>

          <Text style={[s.label, { color: renkler.subtext }]}>Banner Görseli</Text>
          <TouchableOpacity
            style={[s.gorselAlan, { borderColor: renkler.border, backgroundColor: renkler.input }]}
            onPress={gorselSec}
            disabled={gorselYukleniyor}
          >
            {gorselYukleniyor ? (
              <ActivityIndicator color={renkler.primary} />
            ) : gorsel ? (
              <Image source={{ uri: kampanyaGorselUrl(gorsel)! }} style={s.gorselOnizleme} resizeMode="cover" />
            ) : (
              <View style={s.gorselBos}>
                <Ionicons name="image-outline" size={28} color={renkler.subtext} />
                <Text style={[s.gorselBosText, { color: renkler.subtext }]}>
                  Görsel seç (1:1 kare — ana sayfa banner'ında büyük görünür)
                </Text>
              </View>
            )}
          </TouchableOpacity>
          {gorsel && !gorselYukleniyor && (
            <TouchableOpacity onPress={() => setGorsel(null)} style={s.gorselKaldir}>
              <Text style={[s.gorselKaldirText, { color: renkler.danger }]}>Görseli kaldır</Text>
            </TouchableOpacity>
          )}

          <Text style={[s.label, { color: renkler.subtext }]}>Başlık *</Text>
          <TextInput
            style={[s.input, { borderColor: renkler.border, backgroundColor: renkler.input, color: renkler.text }]}
            placeholder="3 al 2 öde!"
            placeholderTextColor={renkler.subtext}
            value={baslik} onChangeText={setBaslik}
          />

          <Text style={[s.label, { color: renkler.subtext }]}>Açıklama</Text>
          <TextInput
            style={[s.input, s.cokSatir, { borderColor: renkler.border, backgroundColor: renkler.input, color: renkler.text }]}
            placeholder="Kampanya detayını kısaca yaz"
            placeholderTextColor={renkler.subtext}
            multiline
            value={aciklama} onChangeText={setAciklama}
          />

          <Text style={[s.label, { color: renkler.subtext }]}>Kampanya Tipi</Text>
          <View style={s.tipRow}>
            {TIP_SECENEK.map(sec => {
              const secili = tip === sec.value;
              return (
                <TouchableOpacity
                  key={sec.value}
                  style={[
                    s.tipBtn,
                    { borderColor: renkler.border },
                    secili && { backgroundColor: renkler.primary, borderColor: renkler.primary },
                  ]}
                  onPress={() => setTip(sec.value)}
                >
                  <Text style={[s.tipBtnText, { color: secili ? renkler.primaryText : renkler.subtext }]}>
                    {sec.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={[s.ipucu, { color: renkler.subtext }]}>
            {TIP_SECENEK.find(t => t.value === tip)?.ipucu}
          </Text>

          {tip === 'indirim' && (
            <>
              <Text style={[s.label, { color: renkler.subtext }]}>İndirim Yüzdesi *</Text>
              <TextInput
                style={[s.input, { borderColor: renkler.border, backgroundColor: renkler.input, color: renkler.text }]}
                placeholder="20"
                placeholderTextColor={renkler.subtext}
                keyboardType="number-pad"
                value={indirim} onChangeText={setIndirim}
              />
            </>
          )}
          {tip === 'puan' && (
            <>
              <Text style={[s.label, { color: renkler.subtext }]}>Ekstra Puan *</Text>
              <TextInput
                style={[s.input, { borderColor: renkler.border, backgroundColor: renkler.input, color: renkler.text }]}
                placeholder="100"
                placeholderTextColor={renkler.subtext}
                keyboardType="number-pad"
                value={bonusPuan} onChangeText={setBonusPuan}
              />
            </>
          )}
          {tip === 'hediye' && (
            <>
              <Text style={[s.label, { color: renkler.subtext }]}>Hediye Açıklaması *</Text>
              <TextInput
                style={[s.input, { borderColor: renkler.border, backgroundColor: renkler.input, color: renkler.text }]}
                placeholder="Cam suyu hediye"
                placeholderTextColor={renkler.subtext}
                value={hediye} onChangeText={setHediye}
              />
            </>
          )}

          <Text style={[s.label, { color: renkler.subtext }]}>
            Hedef {tip === 'indirim' ? '*' : '(opsiyonel)'}
          </Text>
          <View style={s.tipRow}>
            {([
              { v: 'genel', l: 'Genel' },
              { v: 'hizmet', l: 'Hizmet' },
              { v: 'urun', l: 'Ürün' },
            ] as const).map(o => {
              const secili = hedef === o.v;
              return (
                <TouchableOpacity
                  key={o.v}
                  style={[
                    s.tipBtn,
                    { borderColor: renkler.border },
                    secili && { backgroundColor: renkler.primary, borderColor: renkler.primary },
                  ]}
                  onPress={() => setHedef(o.v)}
                >
                  <Text style={[s.tipBtnText, { color: secili ? renkler.primaryText : renkler.subtext }]}>
                    {o.l}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={[s.ipucu, { color: renkler.subtext }]}>
            İndirim, seçilen hizmetin randevu fiyatına veya ürünün satış fiyatına sunucuda uygulanır.
          </Text>

          {hedef === 'hizmet' && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.hizmetSerit}>
              {hizmetler.map(h => {
                const secili = hizmetId === h.id;
                return (
                  <TouchableOpacity
                    key={h.id}
                    style={[
                      s.hizmetChip,
                      { borderColor: renkler.border },
                      secili && { backgroundColor: renkler.primary, borderColor: renkler.primary },
                    ]}
                    onPress={() => setHizmetId(h.id)}
                  >
                    <Text style={[s.hizmetChipText, { color: secili ? renkler.primaryText : renkler.subtext }]}>
                      {h.ad}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
          {hedef === 'urun' && (
            urunlerListe.length === 0 ? (
              <Text style={[s.ipucu, { color: renkler.subtext }]}>
                Henüz ürün yok. Önce bir şubeye ürün ekleyin.
              </Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.hizmetSerit}>
                {urunlerListe.map(u => {
                  const secili = urunId === u.id;
                  return (
                    <TouchableOpacity
                      key={u.id}
                      style={[
                        s.hizmetChip,
                        { borderColor: renkler.border },
                        secili && { backgroundColor: renkler.primary, borderColor: renkler.primary },
                      ]}
                      onPress={() => setUrunId(u.id)}
                    >
                      <Text style={[s.hizmetChipText, { color: secili ? renkler.primaryText : renkler.subtext }]}>
                        {u.ad}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )
          )}

          <View style={s.tarihRow}>
            <View style={{ flex: 1 }}>
              <Text style={[s.label, { color: renkler.subtext }]}>Başlangıç</Text>
              <TextInput
                style={[s.input, { borderColor: renkler.border, backgroundColor: renkler.input, color: renkler.text }]}
                placeholder="2026-07-01"
                placeholderTextColor={renkler.subtext}
                keyboardType="numbers-and-punctuation"
                value={baslangic} onChangeText={setBaslangic}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.label, { color: renkler.subtext }]}>Bitiş</Text>
              <TextInput
                style={[s.input, { borderColor: renkler.border, backgroundColor: renkler.input, color: renkler.text }]}
                placeholder="2026-07-31"
                placeholderTextColor={renkler.subtext}
                keyboardType="numbers-and-punctuation"
                value={bitis} onChangeText={setBitis}
              />
            </View>
          </View>
          <Text style={[s.ipucu, { color: renkler.subtext }]}>
            Boş bırakırsan kampanya süresiz olur. Bitiş geçince müşteride gizlenir.
          </Text>

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
  sayfaBaslik: { fontSize: 26, fontWeight: '800', marginBottom: 12, marginTop: 4 },
  bos: { textAlign: 'center', marginTop: 60, fontSize: 15, paddingHorizontal: 32 },
  kart: {
    padding: 12, borderRadius: 12, marginBottom: 12,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  pasif: { opacity: 0.5 },
  kartGorsel: { width: 56, height: 56, borderRadius: 10 },
  kartGorselBos: { alignItems: 'center', justifyContent: 'center' },
  kartSol: { flex: 1 },
  ad: { fontSize: 16, fontWeight: '700' },
  alt: { fontSize: 13, marginTop: 3 },
  silBtn: { padding: 4 },
  ekleBtn: {
    position: 'absolute', left: 16, right: 16, bottom: 20,
    padding: 16, borderRadius: 12, alignItems: 'center',
  },
  ekleBtnText: { fontWeight: '700', fontSize: 16 },
  modal: { padding: 24, paddingBottom: 48 },
  modalBaslik: { fontSize: 22, fontWeight: 'bold', marginBottom: 24, marginTop: 8 },
  label: { fontSize: 14, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, padding: 13, fontSize: 16, marginBottom: 16 },
  cokSatir: { minHeight: 80, textAlignVertical: 'top' },
  ipucu: { fontSize: 12, lineHeight: 17, marginTop: -8, marginBottom: 16 },
  tipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  tipBtn: {
    borderWidth: 1, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 14,
  },
  tipBtnText: { fontSize: 14, fontWeight: '600' },
  hizmetSerit: { gap: 8, paddingBottom: 16 },
  hizmetChip: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  hizmetChipText: { fontSize: 13, fontWeight: '600' },
  tarihRow: { flexDirection: 'row', gap: 12 },
  gorselAlan: {
    borderWidth: 1, borderRadius: 12, height: 150, marginBottom: 8,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  gorselOnizleme: { width: '100%', height: '100%' },
  gorselBos: { alignItems: 'center', gap: 8, padding: 16 },
  gorselBosText: { fontSize: 13, textAlign: 'center' },
  gorselKaldir: { alignSelf: 'flex-start', paddingVertical: 4, marginBottom: 12 },
  gorselKaldirText: { fontSize: 13, fontWeight: '600' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  switchText: { fontSize: 15 },
  btn: { borderRadius: 10, padding: 16, alignItems: 'center', marginBottom: 12 },
  btnText: { fontSize: 16, fontWeight: '600' },
  iptal: { alignItems: 'center', padding: 12 },
  iptalText: {},
});
