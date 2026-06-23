import { useCallback, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Image, Modal, ScrollView,
  StyleSheet, Switch, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../src/lib/supabase';
import { useSession } from '../../src/hooks/useSession';
import { useTheme } from '../../src/theme/ThemeContext';
import { BranchPrice, CalismaPenceresi, KampanyaTip, ProgramMod, Service } from '../../src/types';
import { fiyatMetni, gorselUrl, SERVICE_BUCKET } from '../../src/lib/hizmet';
import { Etiket, Bilgi } from '../../src/components/Bilgi';
import { Yukleniyor } from '../../src/components/Yukleniyor';
import {
  GUNLER, TUM_GUNLER, VARSAYILAN_PENCERELER, saatGecerli, saatDk,
} from '../../src/data/calisma-duzeni';
import { SEGMENTLER } from '../../src/data/arac-katalogu';

const tl = (n: number) => n.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });
const tl0 = (n: number) =>
  n.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 });

// Bir segmentin marka tabanı ve şubenin izinli fiyat bandı
function fiyatBandi(h: Service, segment: string) {
  const sf = h.segment_fiyatlari ?? {};
  const taban = sf[segment] ?? h.taban_fiyat;
  return { taban, alt: taban * (1 - h.oynama_orani), ust: taban * (1 + h.oynama_orani) };
}
const fiyatAnahtar = (serviceId: string, segment: string) => `${serviceId}:${segment}`;

// Kampanya seçenekleri (admin formundaki segmentli buton grubu)
const KAMPANYA_SECENEK: { value: KampanyaTip | null; label: string }[] = [
  { value: null, label: 'Yok' },
  { value: 'yildiz', label: '⭐ Yıldız' },
  { value: 'fiyat', label: '% Fiyat' },
];

export default function HizmetlerScreen() {
  const { profile } = useSession();
  const { renkler } = useTheme();
  const admin = profile?.rol === 'admin';   // admin = katalog, şube sahibi = program
  const [hizmetler, setHizmetler] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAcik, setModalAcik] = useState(false);
  const [duzenlenen, setDuzenlenen] = useState<Service | null>(null);
  const [ad, setAd] = useState('');
  const [kategori, setKategori] = useState('');
  const [fiyatKucuk, setFiyatKucuk] = useState('');
  const [fiyatBuyuk, setFiyatBuyuk] = useState('');
  const [aciklama, setAciklama] = useState('');
  const [kampanyaTip, setKampanyaTip] = useState<KampanyaTip | null>(null);
  const [indirim, setIndirim] = useState('');  // yüzde, yalnızca 'fiyat'
  const [gorsel, setGorsel] = useState<string | null>(null);  // storage yolu
  const [gorselYukleniyor, setGorselYukleniyor] = useState(false);
  const [aktif, setAktif] = useState(true);
  const [kayit, setKayit] = useState(false);

  // Şube sahibi: hizmet bazlı fiyat + randevu programı düzenleyici (tek modal)
  const [programHizmet, setProgramHizmet] = useState<Service | null>(null);
  const [mod, setMod] = useState<ProgramMod>('saatli');
  const [pencereler, setPencereler] = useState<CalismaPenceresi[]>([]);
  const [aralik, setAralik] = useState('40');
  const [kapasite, setKapasite] = useState('1');
  const [brakmaSaati, setBrakmaSaati] = useState('09:00');  // günlük mod bırakma saati
  const [gunSayisi, setGunSayisi] = useState('1');          // günlük mod: iş kaç gün sürer
  const [gunler, setGunler] = useState<number[]>(TUM_GUNLER);
  const [programYukleniyor, setProgramYukleniyor] = useState(false);
  const [programKayit, setProgramKayit] = useState(false);

  // Şube fiyatları (sube_sahibi): tüm branch_prices haritası + seçilen hizmetin girdileri
  const [branchFiyatlar, setBranchFiyatlar] = useState<Record<string, BranchPrice>>({});
  const [fiyatGirdiler, setFiyatGirdiler] = useState<Record<string, string>>({});

  useFocusEffect(useCallback(() => { yukle(); }, []));

  async function yukle() {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .order('kategori')
      .order('ad');
    if (error) Alert.alert('Hata', error.message);
    else setHizmetler(data ?? []);

    // Şube sahibi: kendi şube fiyatlarını da getir (birleşik editör için)
    if (profile?.branch_id) {
      const { data: fdata } = await supabase
        .from('branch_prices').select('*').eq('branch_id', profile.branch_id);
      const harita: Record<string, BranchPrice> = {};
      ((fdata as BranchPrice[]) ?? []).forEach(f => {
        harita[fiyatAnahtar(f.service_id, f.segment)] = f;
      });
      setBranchFiyatlar(harita);
    }
    setLoading(false);
  }

  function formuSifirla() {
    setDuzenlenen(null);
    setAd(''); setKategori(''); setFiyatKucuk(''); setFiyatBuyuk('');
    setAciklama(''); setKampanyaTip(null); setIndirim('');
    setGorsel(null); setAktif(true);
  }

  function yeni() {
    formuSifirla();
    setModalAcik(true);
  }

  function ac(item: Service) {
    setDuzenlenen(item);
    setAd(item.ad);
    setKategori(item.kategori);
    // Segment fiyatları varsa onlardan, yoksa eski tek taban_fiyat'tan doldur
    const sf = item.segment_fiyatlari ?? {};
    setFiyatKucuk(String(sf.kucuk ?? item.taban_fiyat));
    setFiyatBuyuk(String(sf.buyuk ?? item.taban_fiyat));
    setAciklama(item.aciklama ?? '');
    setKampanyaTip(item.kampanya_tip ?? null);
    setIndirim(item.kampanya_indirim_yuzde ? String(item.kampanya_indirim_yuzde) : '');
    setGorsel(item.gorsel ?? null);
    setAktif(item.aktif);
    setModalAcik(true);
  }

  // --- Şube sahibi: hizmet bazlı fiyat + randevu programı (tek modal) ---
  async function programAc(item: Service) {
    if (!profile?.branch_id) {
      Alert.alert('Şube yok', 'Ayar için hesabına bağlı bir şube gerekli.');
      return;
    }
    setProgramHizmet(item);

    // Fiyat girdilerini mevcut şube fiyatlarından doldur
    const fg: Record<string, string> = {};
    SEGMENTLER.forEach(seg => {
      const mevcut = branchFiyatlar[fiyatAnahtar(item.id, seg.value)];
      fg[seg.value] = mevcut ? String(mevcut.fiyat) : '';
    });
    setFiyatGirdiler(fg);

    setProgramYukleniyor(true);
    const { data } = await supabase
      .from('service_schedules')
      .select('*')
      .eq('branch_id', profile.branch_id)
      .eq('service_id', item.id)
      .maybeSingle();
    if (data) {
      const m = (data.mod as ProgramMod) ?? 'saatli';
      setMod(m);
      const ws = (data.windows as CalismaPenceresi[]) ?? VARSAYILAN_PENCERELER;
      setPencereler(ws);
      setAralik(String(data.aralik_dk));
      setKapasite(String(data.kapasite));
      setBrakmaSaati(ws[0]?.bas ?? '09:00');
      setGunSayisi(String(data.gun_sayisi ?? 1));
      setGunler((data.gunler as number[] | null) ?? TUM_GUNLER);
    } else {
      setMod('saatli');
      setPencereler(VARSAYILAN_PENCERELER.map(p => ({ ...p })));
      setAralik('40');
      setKapasite('1');
      setBrakmaSaati('09:00');
      setGunSayisi('1');
      setGunler(TUM_GUNLER);
    }
    setProgramYukleniyor(false);
  }

  function pencereDegis(i: number, alan: 'bas' | 'son', deger: string) {
    setPencereler(p => p.map((w, j) => (j === i ? { ...w, [alan]: deger } : w)));
  }
  function pencereEkle() {
    setPencereler(p => [...p, { bas: '', son: '' }]);
  }
  function pencereSil(i: number) {
    setPencereler(p => p.filter((_, j) => j !== i));
  }
  function gunToggle(dow: number) {
    setGunler(g => (g.includes(dow) ? g.filter(d => d !== dow) : [...g, dow].sort((a, b) => a - b)));
  }

  async function programKaydet() {
    if (!profile?.branch_id || !programHizmet) return;
    const branchId = profile.branch_id;

    // --- 1) Program (mod'a göre) doğrula + windows/kapasite hazırla ---
    let windows: CalismaPenceresi[];
    let ar = 40;
    let gs = 1;
    if (mod === 'saatli') {
      if (pencereler.length === 0) { Alert.alert('Hata', 'En az bir saat aralığı ekle'); return; }
      for (const w of pencereler) {
        if (!saatGecerli(w.bas) || !saatGecerli(w.son)) {
          Alert.alert('Hata', 'Saatleri SS:DD biçiminde gir (örn. 09:00)'); return;
        }
        if (saatDk(w.bas) >= saatDk(w.son)) {
          Alert.alert('Hata', `Bitiş saati başlangıçtan sonra olmalı (${w.bas}–${w.son})`); return;
        }
      }
      ar = parseInt(aralik, 10);
      if (!Number.isFinite(ar) || ar < 5 || ar > 600) { Alert.alert('Hata', 'Aralık 5–600 dk olmalı'); return; }
      windows = pencereler;
    } else {
      // günlük: tek bırakma saati, windows[0]'a yazılır
      if (!saatGecerli(brakmaSaati)) {
        Alert.alert('Hata', 'Bırakma saatini SS:DD biçiminde gir (örn. 09:00)'); return;
      }
      gs = parseInt(gunSayisi, 10);
      if (!Number.isFinite(gs) || gs < 1 || gs > 30) {
        Alert.alert('Hata', 'İşin süresi 1–30 gün arası olmalı'); return;
      }
      windows = [{ bas: brakmaSaati, son: brakmaSaati }];
    }
    const kap = parseInt(kapasite, 10);
    if (!Number.isFinite(kap) || kap < 1 || kap > 50) { Alert.alert('Hata', 'Kapasite 1–50 olmalı'); return; }
    if (gunler.length === 0) { Alert.alert('Hata', 'En az bir gün seç'); return; }

    // --- 2) Şube fiyatları doğrula (banda göre) → eklenecek/silinecek ---
    const eklenecek: Array<Pick<BranchPrice, 'branch_id' | 'service_id' | 'segment' | 'fiyat'>> = [];
    const silinecek: string[] = [];
    for (const seg of SEGMENTLER) {
      const ham = (fiyatGirdiler[seg.value] ?? '').trim();
      const mevcut = branchFiyatlar[fiyatAnahtar(programHizmet.id, seg.value)];
      if (ham === '') {
        if (mevcut) silinecek.push(mevcut.id);   // boş = tabana dön
        continue;
      }
      const f = parseFloat(ham.replace(',', '.'));
      if (!Number.isFinite(f) || f <= 0) {
        Alert.alert('Hata', `${seg.label} için geçerli bir fiyat girin`); return;
      }
      const { alt, ust, taban } = fiyatBandi(programHizmet, seg.value);
      if (f < alt || f > ust) {
        Alert.alert('Banda uymuyor',
          `${seg.label} fiyatı ${tl(alt)} – ${tl(ust)} aralığında olmalı ` +
          `(marka tabanı ${tl(taban)} ± %${Math.round(programHizmet.oynama_orani * 100)}).`);
        return;
      }
      eklenecek.push({ branch_id: branchId, service_id: programHizmet.id, segment: seg.value, fiyat: f });
    }

    // --- 3) Kaydet: program + fiyatlar ---
    setProgramKayit(true);
    const { error: pErr } = await supabase.from('service_schedules').upsert({
      branch_id: branchId,
      service_id: programHizmet.id,
      mod,
      windows,
      aralik_dk: ar,
      kapasite: kap,
      gun_sayisi: gs,
      gunler: gunler.length === 7 ? null : gunler,   // hepsi = her gün
      updated_at: new Date().toISOString(),
    }, { onConflict: 'branch_id,service_id' });
    if (pErr) { setProgramKayit(false); Alert.alert('Hata', pErr.message); return; }

    if (eklenecek.length) {
      const { error } = await supabase.from('branch_prices')
        .upsert(eklenecek, { onConflict: 'branch_id,service_id,segment' });
      if (error) { setProgramKayit(false); Alert.alert('Hata', error.message); return; }
    }
    if (silinecek.length) {
      const { error } = await supabase.from('branch_prices').delete().in('id', silinecek);
      if (error) { setProgramKayit(false); Alert.alert('Hata', error.message); return; }
    }
    setProgramKayit(false);
    setProgramHizmet(null);
    yukle();   // fiyat haritasını tazele
  }

  // Galeriden kapak görseli seç → public service-images bucket'ına yükle.
  async function gorselSec() {
    try {
      const izin = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!izin.granted) {
        Alert.alert('İzin gerekli', 'Görsel seçmek için galeri erişimi gerekli.');
        return;
      }
      const sonuc = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'], quality: 0.7, allowsEditing: true, aspect: [16, 10],
      });
      if (sonuc.canceled || !sonuc.assets?.[0]) return;

      const asset = sonuc.assets[0];
      setGorselYukleniyor(true);
      const res = await fetch(asset.uri);
      const buf = await res.arrayBuffer();
      const mime = asset.mimeType ?? 'image/jpeg';
      const uzanti = mime === 'image/png' ? 'png' : 'jpg';
      const yol = `hizmetler/${Date.now()}.${uzanti}`;

      const { error } = await supabase.storage
        .from(SERVICE_BUCKET).upload(yol, buf, { contentType: mime, upsert: false });
      setGorselYukleniyor(false);
      if (error) { Alert.alert('Yüklenemedi', error.message); return; }
      setGorsel(yol);
    } catch (e: any) {
      setGorselYukleniyor(false);
      Alert.alert('Hata', e?.message ?? 'Görsel yüklenemedi');
    }
  }

  async function kaydet() {
    const fk = parseFloat(fiyatKucuk.replace(',', '.'));
    const fb = parseFloat(fiyatBuyuk.replace(',', '.'));
    if (!ad.trim()) { Alert.alert('Hata', 'Hizmet adı zorunlu'); return; }
    if (!kategori.trim()) { Alert.alert('Hata', 'Kategori zorunlu'); return; }
    if (!Number.isFinite(fk) || fk <= 0) { Alert.alert('Hata', 'Küçük araç için geçerli bir fiyat girin'); return; }
    if (!Number.isFinite(fb) || fb <= 0) { Alert.alert('Hata', 'Büyük araç için geçerli bir fiyat girin'); return; }
    if (fb < fk) { Alert.alert('Hata', 'Büyük araç fiyatı küçükten az olamaz'); return; }

    let indirimYuzde: number | null = null;
    if (kampanyaTip === 'fiyat') {
      indirimYuzde = parseInt(indirim, 10);
      if (!Number.isFinite(indirimYuzde) || indirimYuzde < 1 || indirimYuzde > 90) {
        Alert.alert('Hata', 'Fiyat kampanyası için %1–90 arası bir indirim girin');
        return;
      }
    }

    const veri = {
      ad: ad.trim(),
      kategori: kategori.trim().toLocaleLowerCase('tr'),
      taban_fiyat: fk,                                  // fallback = küçük taban
      segment_fiyatlari: { kucuk: fk, buyuk: fb },
      aciklama: aciklama.trim() || null,
      kampanya_tip: kampanyaTip,
      kampanya_indirim_yuzde: indirimYuzde,
      gorsel,
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

  if (loading) return <Yukleniyor />;

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
        ListHeaderComponent={
          admin ? null : (
            <View style={s.baslikIpucu}>
              <Bilgi
                baslik="Nasıl ayarlanır?"
                metin="Bir hizmete dokunarak şubenin o hizmete özel fiyatını ve randevu saatlerini ayarla."
              />
            </View>
          )
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[s.kart, { backgroundColor: renkler.card }, !item.aktif && s.pasif]}
            onPress={() => (admin ? ac(item) : programAc(item))}
          >
            {item.gorsel ? (
              <Image source={{ uri: gorselUrl(item.gorsel)! }} style={s.kartGorsel} resizeMode="cover" />
            ) : (
              <View style={[s.kartGorsel, s.kartGorselBos, { backgroundColor: renkler.rozetBg }]}>
                <Ionicons name="image-outline" size={20} color={renkler.subtext} />
              </View>
            )}
            <View style={s.kartSol}>
              <Text style={[s.ad, { color: renkler.text }]}>{item.ad}</Text>
              <Text style={[s.kategori, { color: renkler.subtext }]}>
                {item.kategori}{!item.aktif ? ' · pasif' : ''}
              </Text>
            </View>
            {admin ? (
              <Text style={[s.fiyat, { color: renkler.primary }]}>
                {fiyatMetni(item)}
              </Text>
            ) : (
              <Ionicons name="time-outline" size={22} color={renkler.primary} />
            )}
          </TouchableOpacity>
        )}
      />
      {admin && (
        <TouchableOpacity
          style={[s.ekleBtn, { backgroundColor: renkler.primary }]}
          onPress={yeni}
        >
          <Text style={[s.ekleBtnText, { color: renkler.primaryText }]}>+ Hizmet Ekle</Text>
        </TouchableOpacity>
      )}

      <Modal visible={modalAcik} animationType="slide" presentationStyle="pageSheet">
        <ScrollView
          style={{ backgroundColor: renkler.card }}
          contentContainerStyle={s.modal}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[s.modalBaslik, { color: renkler.text }]}>
            {duzenlenen ? 'Hizmeti Düzenle' : 'Hizmet Ekle'}
          </Text>

          <Text style={[s.label, { color: renkler.subtext }]}>Kapak Görseli</Text>
          <TouchableOpacity
            style={[s.gorselAlan, { borderColor: renkler.border, backgroundColor: renkler.input }]}
            onPress={gorselSec}
            disabled={gorselYukleniyor}
          >
            {gorselYukleniyor ? (
              <ActivityIndicator color={renkler.primary} />
            ) : gorsel ? (
              <Image source={{ uri: gorselUrl(gorsel)! }} style={s.gorselOnizleme} resizeMode="cover" />
            ) : (
              <View style={s.gorselBos}>
                <Ionicons name="image-outline" size={28} color={renkler.subtext} />
                <Text style={[s.gorselBosText, { color: renkler.subtext }]}>
                  Görsel seç (müşteri anasayfasında görünür)
                </Text>
              </View>
            )}
          </TouchableOpacity>
          {gorsel && !gorselYukleniyor && (
            <TouchableOpacity onPress={() => setGorsel(null)} style={s.gorselKaldir}>
              <Text style={[s.gorselKaldirText, { color: renkler.danger }]}>Görseli kaldır</Text>
            </TouchableOpacity>
          )}

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

          <Text style={[s.label, { color: renkler.subtext }]}>Küçük Araç Fiyatı (TL) *</Text>
          <TextInput
            style={[s.input, { borderColor: renkler.border, backgroundColor: renkler.input, color: renkler.text }]}
            placeholder="600"
            placeholderTextColor={renkler.subtext}
            keyboardType="decimal-pad"
            value={fiyatKucuk} onChangeText={setFiyatKucuk}
          />

          <Etiket
            zorunlu
            bilgi={'SUV, pickup, MPV, crossover ve panelvan "büyük" sayılır; diğerleri "küçük".'}
          >Büyük Araç Fiyatı (TL)</Etiket>
          <TextInput
            style={[s.input, { borderColor: renkler.border, backgroundColor: renkler.input, color: renkler.text }]}
            placeholder="700"
            placeholderTextColor={renkler.subtext}
            keyboardType="decimal-pad"
            value={fiyatBuyuk} onChangeText={setFiyatBuyuk}
          />

          <Text style={[s.label, { color: renkler.subtext }]}>Kampanya</Text>
          <View style={s.kampanyaRow}>
            {KAMPANYA_SECENEK.map(sec => {
              const secili = kampanyaTip === sec.value;
              return (
                <TouchableOpacity
                  key={sec.label}
                  style={[
                    s.kampanyaBtn,
                    { borderColor: renkler.border },
                    secili && { backgroundColor: renkler.primary, borderColor: renkler.primary },
                  ]}
                  onPress={() => setKampanyaTip(sec.value)}
                >
                  <Text style={[s.kampanyaBtnText, { color: secili ? renkler.primaryText : renkler.subtext }]}>
                    {sec.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {kampanyaTip === 'yildiz' && (
            <Text style={[s.ipucu, { color: renkler.subtext }]}>
              Hizmet ana sayfada "öne çıkan" rozetiyle gösterilir.
            </Text>
          )}
          {kampanyaTip === 'fiyat' && (
            <>
              <TextInput
                style={[s.input, { borderColor: renkler.border, backgroundColor: renkler.input, color: renkler.text }]}
                placeholder="İndirim yüzdesi (örn. 20)"
                placeholderTextColor={renkler.subtext}
                keyboardType="number-pad"
                value={indirim} onChangeText={setIndirim}
              />
              <Text style={[s.ipucu, { color: renkler.subtext }]}>
                Ana sayfada eski fiyat üstü çizili, indirimli fiyat gösterilir.
              </Text>
            </>
          )}

          <Text style={[s.label, { color: renkler.subtext }]}>Açıklama</Text>
          <TextInput
            style={[s.input, s.cokSatir, { borderColor: renkler.border, backgroundColor: renkler.input, color: renkler.text }]}
            placeholder="Bu hizmette neler yapıyoruz? (müşteri detay ekranında görür)"
            placeholderTextColor={renkler.subtext}
            multiline
            value={aciklama} onChangeText={setAciklama}
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

      {/* Şube sahibi: hizmet bazlı FİYAT + randevu programı (tek modal) */}
      <Modal visible={!!programHizmet} animationType="slide" presentationStyle="pageSheet">
        <ScrollView
          style={{ backgroundColor: renkler.card }}
          contentContainerStyle={s.modal}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[s.modalBaslik, { color: renkler.text }]}>{programHizmet?.ad}</Text>
          <Text style={[s.programAltBaslik, { color: renkler.subtext }]}>
            Şube fiyatı ve randevu programı
          </Text>

          {programYukleniyor ? (
            <ActivityIndicator color={renkler.primary} style={{ marginTop: 24 }} />
          ) : programHizmet ? (
            <>
              {/* ---------- ŞUBE FİYATLARI ---------- */}
              <Text style={[s.bolumBaslik, { color: renkler.text }]}>Şube Fiyatları</Text>
              <Bilgi metin="Boş bırakırsan o segmentte marka tabanı geçerli olur. Yerel fiyat, tabanın ± oynama oranı bandı dışına çıkamaz." />
              {SEGMENTLER.map(seg => {
                const { taban, alt, ust } = fiyatBandi(programHizmet, seg.value);
                return (
                  <View key={seg.value} style={s.segmentBlok}>
                    <Text style={[s.label, { color: renkler.text }]}>{seg.label}</Text>
                    <Text style={[s.bandNot, { color: renkler.subtext }]}>
                      Marka tabanı {tl(taban)} · İzinli {tl(alt)} – {tl(ust)}
                    </Text>
                    <TextInput
                      style={[s.input, { borderColor: renkler.border, backgroundColor: renkler.input, color: renkler.text }]}
                      placeholder={`Boş = taban (${tl0(taban)})`}
                      placeholderTextColor={renkler.subtext}
                      keyboardType="decimal-pad"
                      value={fiyatGirdiler[seg.value] ?? ''}
                      onChangeText={t => setFiyatGirdiler(g => ({ ...g, [seg.value]: t }))}
                    />
                  </View>
                );
              })}

              {/* ---------- RANDEVU PROGRAMI ---------- */}
              <Text style={[s.bolumBaslik, { color: renkler.text, marginTop: 8 }]}>Randevu Programı</Text>

              <View style={s.modRow}>
                {([
                  { v: 'saatli', l: 'Saatli', alt: 'Saat seçilir' },
                  { v: 'gunluk', l: 'Günlük', alt: 'Gün seçilir' },
                ] as const).map(m => {
                  const secili = mod === m.v;
                  return (
                    <TouchableOpacity
                      key={m.v}
                      style={[
                        s.modBtn,
                        { borderColor: renkler.border },
                        secili && { backgroundColor: renkler.primary, borderColor: renkler.primary },
                      ]}
                      onPress={() => setMod(m.v)}
                    >
                      <Text style={[s.modBtnText, { color: secili ? renkler.primaryText : renkler.text }]}>
                        {m.l}
                      </Text>
                      <Text style={[s.modBtnAlt, { color: secili ? renkler.primaryText : renkler.subtext }]}>
                        {m.alt}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Bilgi
                baslik="Hangisini seçmeliyim?"
                metin="Saatli: müşteri belirli bir saat seçer; aynı gün teslim edilen işler için (oto yıkama, iç temizlik). Günlük: müşteri yalnızca gün seçer; birden çok gün sürebilen işler için (boya koruma, kaplama)."
              />

              {mod === 'saatli' ? (
                <>
                  <Etiket bilgi="Öğle molası için iki ayrı aralık gir (örn. 09:00–12:20 ve 13:40–17:00).">Saat Aralıkları (ilk–son randevu)</Etiket>
                  {pencereler.map((w, i) => (
                    <View key={i} style={s.pencereRow}>
                      <TextInput
                        style={[s.pencereInput, { borderColor: renkler.border, backgroundColor: renkler.input, color: renkler.text }]}
                        placeholder="09:00"
                        placeholderTextColor={renkler.subtext}
                        keyboardType="numbers-and-punctuation"
                        maxLength={5}
                        value={w.bas}
                        onChangeText={t => pencereDegis(i, 'bas', t)}
                      />
                      <Text style={[s.pencereTire, { color: renkler.subtext }]}>–</Text>
                      <TextInput
                        style={[s.pencereInput, { borderColor: renkler.border, backgroundColor: renkler.input, color: renkler.text }]}
                        placeholder="12:20"
                        placeholderTextColor={renkler.subtext}
                        keyboardType="numbers-and-punctuation"
                        maxLength={5}
                        value={w.son}
                        onChangeText={t => pencereDegis(i, 'son', t)}
                      />
                      <TouchableOpacity onPress={() => pencereSil(i)} hitSlop={8} style={s.pencereSil}>
                        <Ionicons name="close-circle" size={22} color={renkler.danger} />
                      </TouchableOpacity>
                    </View>
                  ))}
                  <TouchableOpacity onPress={pencereEkle} style={s.araliEkle}>
                    <Ionicons name="add-circle-outline" size={18} color={renkler.primary} />
                    <Text style={[s.araliEkleText, { color: renkler.primary }]}>Aralık ekle</Text>
                  </TouchableOpacity>

                  <Etiket bilgi="Müşterinin seçebileceği bırakma saatleri arasındaki boşluk. İşlem süresi DEĞİL.">Randevu Aralığı (dakika)</Etiket>
                  <TextInput
                    style={[s.input, { borderColor: renkler.border, backgroundColor: renkler.input, color: renkler.text }]}
                    placeholder="40"
                    placeholderTextColor={renkler.subtext}
                    keyboardType="number-pad"
                    value={aralik} onChangeText={setAralik}
                  />

                  <Etiket bilgi="Aynı saate kaç araç alabileceğin (örn. 2 yıkama bölmesi = 2).">Slot Başına Kapasite</Etiket>
                  <TextInput
                    style={[s.input, { borderColor: renkler.border, backgroundColor: renkler.input, color: renkler.text }]}
                    placeholder="1"
                    placeholderTextColor={renkler.subtext}
                    keyboardType="number-pad"
                    value={kapasite} onChangeText={setKapasite}
                  />
                </>
              ) : (
                <>
                  <Etiket bilgi="Müşteri yalnızca bir GÜN seçer; aracı bu saatte bırakır.">Bırakma Saati</Etiket>
                  <TextInput
                    style={[s.input, { borderColor: renkler.border, backgroundColor: renkler.input, color: renkler.text }]}
                    placeholder="09:00"
                    placeholderTextColor={renkler.subtext}
                    keyboardType="numbers-and-punctuation"
                    maxLength={5}
                    value={brakmaSaati} onChangeText={setBrakmaSaati}
                  />

                  <Etiket bilgi="Randevu alındığında başlangıç gününden itibaren bu kadar gün dolu sayılır; o günlerde kapasite aşılmaz.">İş Kaç Gün Sürer?</Etiket>
                  <TextInput
                    style={[s.input, { borderColor: renkler.border, backgroundColor: renkler.input, color: renkler.text }]}
                    placeholder="3"
                    placeholderTextColor={renkler.subtext}
                    keyboardType="number-pad"
                    value={gunSayisi} onChangeText={setGunSayisi}
                  />

                  <Etiket bilgi="Aynı anda kaç aracı bu işe alabileceğin. Dolunca o günler kapanır.">Günlük Kapasite</Etiket>
                  <TextInput
                    style={[s.input, { borderColor: renkler.border, backgroundColor: renkler.input, color: renkler.text }]}
                    placeholder="1"
                    placeholderTextColor={renkler.subtext}
                    keyboardType="number-pad"
                    value={kapasite} onChangeText={setKapasite}
                  />
                </>
              )}

              <Etiket>Çalışılan Günler</Etiket>
              <View style={s.gunRow}>
                {GUNLER.map(g => {
                  const secili = gunler.includes(g.dow);
                  return (
                    <TouchableOpacity
                      key={g.dow}
                      style={[
                        s.gunChip,
                        { borderColor: renkler.border },
                        secili && { backgroundColor: renkler.primary, borderColor: renkler.primary },
                      ]}
                      onPress={() => gunToggle(g.dow)}
                    >
                      <Text style={[s.gunChipText, { color: secili ? renkler.primaryText : renkler.subtext }]}>
                        {g.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity
                style={[s.btn, { backgroundColor: renkler.primary, marginTop: 20 }]}
                onPress={programKaydet}
                disabled={programKayit}
              >
                {programKayit
                  ? <ActivityIndicator color={renkler.primaryText} />
                  : <Text style={[s.btnText, { color: renkler.primaryText }]}>Kaydet</Text>}
              </TouchableOpacity>
            </>
          ) : null}
          <TouchableOpacity style={s.iptal} onPress={() => setProgramHizmet(null)}>
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
  kartGorsel: { width: 52, height: 52, borderRadius: 8, marginRight: 12 },
  kartGorselBos: { alignItems: 'center', justifyContent: 'center' },
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
  cokSatir: { minHeight: 90, textAlignVertical: 'top' },
  ipucu: { fontSize: 12, lineHeight: 17, marginTop: -8, marginBottom: 16 },
  kampanyaRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  kampanyaBtn: {
    flex: 1, borderWidth: 1, borderRadius: 8,
    paddingVertical: 10, alignItems: 'center',
  },
  kampanyaBtnText: { fontSize: 14, fontWeight: '600' },
  baslikIpucu: { paddingHorizontal: 16, paddingTop: 8 },
  programAltBaslik: { fontSize: 14, marginTop: -16, marginBottom: 16 },
  bolumBaslik: {
    fontSize: 17, fontWeight: '800', marginTop: 8, marginBottom: 10,
    paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#8884',
  },
  segmentBlok: { marginBottom: 16 },
  bandNot: { fontSize: 12, marginBottom: 8 },
  modRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  modBtn: {
    flex: 1, borderWidth: 1, borderRadius: 10,
    paddingVertical: 10, paddingHorizontal: 8, alignItems: 'center',
  },
  modBtnText: { fontSize: 15, fontWeight: '700' },
  modBtnAlt: { fontSize: 11, marginTop: 2 },
  pencereRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  pencereInput: {
    flex: 1, borderWidth: 1, borderRadius: 10,
    padding: 12, fontSize: 16, textAlign: 'center',
  },
  pencereTire: { fontSize: 16, fontWeight: '700' },
  pencereSil: { padding: 2 },
  araliEkle: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, marginBottom: 4 },
  araliEkleText: { fontSize: 14, fontWeight: '600' },
  gunRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  gunChip: { borderWidth: 1, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 },
  gunChipText: { fontSize: 13, fontWeight: '600' },
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
