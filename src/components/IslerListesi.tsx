import { uyari } from '../lib/uyari';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Image, RefreshControl, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { useSession } from '../hooks/useSession';
import { useTheme } from '../theme/ThemeContext';
import { Appointment, IsDurum } from '../types';
import { avatarUrl } from '../lib/avatar';
import { tl } from '../lib/urun';
import { SatisModal } from './SatisModal';
import { Yukleniyor } from './Yukleniyor';

const PHOTO_BUCKET = 'job-photos';
const SIGNED_TTL = 60 * 60;

// İş durumu ilerleme zinciri: basladi → tamamlandi → hazir
const SONRAKI: Record<IsDurum, IsDurum | null> = {
  basladi: 'tamamlandi',
  tamamlandi: 'hazir',
  hazir: null,
};
const SONRAKI_ETIKET: Record<IsDurum, string> = {
  basladi: 'Tamamlandı işaretle',
  tamamlandi: 'Hazır işaretle',
  hazir: '',
};
const IS_ETIKET: Record<IsDurum, string> = {
  basladi: 'İşlem başladı',
  tamamlandi: 'İşlem tamamlandı',
  hazir: 'Araç hazır',
};

// Tarih şeridi: bugün + geçmiş 13 gün (bugün başta). İşler "o günün işleri" mantığı.
function gunListesi(): Date[] {
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i); return d;
  });
}

// İşler listesi: onaylı randevulardan iş üstlenme + foto + durum ilerletme.
// Tek başına ekran değil; Randevular sekmesi içinde "İşler" sekmesinde gösterilir.
export default function IslerListesi() {
  const { session, profile } = useSession();
  const { renkler } = useTheme();
  const [randevular, setRandevular] = useState<Appointment[]>([]);
  const [signedMap, setSignedMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [yenileniyor, setYenileniyor] = useState(false);
  const [mesgul, setMesgul] = useState<string | null>(null);  // işlenen job/appt id
  const [seciliGun, setSeciliGun] = useState<Date>(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d;
  });
  // Satış modalı hedefi: { appointmentId, baslik }. null = kapalı.
  const [satisHedef, setSatisHedef] = useState<{ appointmentId: string | null; baslik: string } | null>(null);

  const branchId = profile?.branch_id ?? null;

  function satisAc(r: Appointment | null) {
    setSatisHedef({
      appointmentId: r?.id ?? null,
      baslik: r ? (r.users?.ad_soyad ?? 'Randevu müşterisi') : 'Hızlı satış · randevusuz',
    });
  }

  // Şubede ödeme tahsil edildi işareti (yalnız 'subede' ödeme yöntemli randevuda)
  function odemeAl(r: Appointment) {
    uyari(
      'Ödeme Alındı',
      `${r.users?.ad_soyad ?? 'Müşteri'} için şubede ödeme tahsil edildi olarak işaretlensin mi?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Ödeme Alındı',
          onPress: async () => {
            const { error } = await supabase.rpc('randevu_odeme_al', { p_appointment_id: r.id });
            if (error) { uyari('Hata', error.message); return; }
            yukle();
          },
        },
      ],
    );
  }

  useFocusEffect(useCallback(() => { yukle(); }, [seciliGun]));

  async function yukle() {
    setLoading(true);
    // Seçili GÜNÜN onaylı randevuları (yerel gün → UTC aralığı). Sunucu-tarafı
    // tarih filtresi sayesinde çok kullanımda da yalnız o günün işleri gelir.
    const bas = new Date(seciliGun);
    const son = new Date(seciliGun); son.setDate(son.getDate() + 1);
    // RLS: personel yalnızca kendi şubesinin randevularını görür
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        users (ad_soyad, telefon, avatar_url),
        vehicles (plaka, marka, model),
        services (ad),
        jobs (id, durum, assigned_to, job_photos (id, tip, url)),
        orders (id, toplam, kaynak, durum, order_items (ad, adet))
      `)
      .eq('durum', 'onayli')
      .gte('baslangic', bas.toISOString())
      .lt('baslangic', son.toISOString())
      .order('baslangic', { ascending: true })
      .limit(200);

    if (error) { uyari('Hata', error.message); setLoading(false); return; }

    const liste = (data as Appointment[]) ?? [];
    setRandevular(liste);
    await fotolariImzala(liste);
    setLoading(false);
  }

  async function fotolariImzala(liste: Appointment[]) {
    const yollar = liste
      .flatMap(r => r.jobs ?? [])
      .flatMap(j => j.job_photos ?? [])
      .map(p => p.url);
    if (yollar.length === 0) { setSignedMap({}); return; }
    const { data } = await supabase.storage
      .from(PHOTO_BUCKET).createSignedUrls(yollar, SIGNED_TTL);
    if (!data) return;
    const harita: Record<string, string> = {};
    data.forEach(d => { if (d.signedUrl && d.path) harita[d.path] = d.signedUrl; });
    setSignedMap(harita);
  }

  async function elleYenile() {
    setYenileniyor(true);
    await yukle();
    setYenileniyor(false);
  }

  // Onaylı randevudan işi üstlen — assigned_to = giriş yapan personel
  async function isiBaslat(r: Appointment) {
    if (!session?.user) return;
    setMesgul(r.id);
    const { error } = await supabase.from('jobs').insert({
      appointment_id: r.id,
      assigned_to: session.user.id,
      durum: 'basladi',
    });
    setMesgul(null);
    if (error) { uyari('Hata', error.message); return; }
    yukle();
  }

  async function durumIlerlet(jobId: string, mevcut: IsDurum) {
    const yeni = SONRAKI[mevcut];
    if (!yeni) return;
    setMesgul(jobId);
    const { error } = await supabase.from('jobs').update({ durum: yeni }).eq('id', jobId);
    setMesgul(null);
    if (error) { uyari('Hata', error.message); return; }
    yukle();
  }

  // Kamera / galeri seçtir, seçilen görseli storage'a yükle, job_photos'a yaz
  function fotoSec(jobId: string, tip: 'once' | 'sonra') {
    uyari('Fotoğraf Ekle', tip === 'once' ? 'Önce fotoğrafı' : 'Sonra fotoğrafı', [
      { text: 'Kamera', onPress: () => fotoCekVeYukle(jobId, tip, 'kamera') },
      { text: 'Galeri', onPress: () => fotoCekVeYukle(jobId, tip, 'galeri') },
      { text: 'Vazgeç', style: 'cancel' },
    ]);
  }

  async function fotoCekVeYukle(jobId: string, tip: 'once' | 'sonra', kaynak: 'kamera' | 'galeri') {
    try {
      const izin = kaynak === 'kamera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!izin.granted) {
        uyari('İzin gerekli', 'Fotoğraf eklemek için erişim izni vermelisin.');
        return;
      }

      const sonuc = kaynak === 'kamera'
        ? await ImagePicker.launchCameraAsync({ quality: 0.6 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6 });
      if (sonuc.canceled || !sonuc.assets?.[0]) return;

      const asset = sonuc.assets[0];
      setMesgul(jobId);

      // RN: yerel uri → arrayBuffer (Supabase storage'ın önerdiği yol)
      const res = await fetch(asset.uri);
      const buf = await res.arrayBuffer();
      const mime = asset.mimeType ?? 'image/jpeg';
      const uzanti = mime === 'image/png' ? 'png' : 'jpg';
      const yol = `${jobId}/${tip}-${Date.now()}.${uzanti}`;

      const { error: upErr } = await supabase.storage
        .from(PHOTO_BUCKET)
        .upload(yol, buf, { contentType: mime, upsert: false });
      if (upErr) { setMesgul(null); uyari('Yüklenemedi', upErr.message); return; }

      const { error: dbErr } = await supabase
        .from('job_photos')
        .insert({ job_id: jobId, tip, url: yol });
      setMesgul(null);
      if (dbErr) { uyari('Hata', dbErr.message); return; }
      yukle();
    } catch (e: any) {
      setMesgul(null);
      uyari('Hata', e?.message ?? 'Fotoğraf eklenemedi');
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: renkler.bg }}>
      <View style={[s.seritKutu, { borderColor: renkler.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.gunSerit}>
          {gunListesi().map(g => {
            const aktif = g.getTime() === seciliGun.getTime();
            const bugun = g.getTime() === new Date().setHours(0, 0, 0, 0);
            return (
              <TouchableOpacity
                key={g.toISOString()}
                style={[
                  s.gunBtn,
                  { backgroundColor: renkler.card, borderColor: renkler.border },
                  aktif && { backgroundColor: renkler.primary, borderColor: renkler.primary },
                ]}
                onPress={() => setSeciliGun(g)}
              >
                <Text style={[s.gunUst, { color: aktif ? renkler.primaryText : renkler.subtext }]}>
                  {bugun ? 'Bugün' : g.toLocaleDateString('tr-TR', { weekday: 'short' })}
                </Text>
                <Text style={[s.gunAlt, { color: aktif ? renkler.primaryText : renkler.text }]}>
                  {g.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {branchId && (
        <TouchableOpacity
          style={[s.hizliSatis, { backgroundColor: renkler.card, borderColor: renkler.primary }]}
          onPress={() => satisAc(null)}
        >
          <Ionicons name="bag-add-outline" size={18} color={renkler.primary} />
          <Text style={[s.hizliSatisText, { color: renkler.primary }]}>
            Hızlı Satış · randevusuz ürün
          </Text>
        </TouchableOpacity>
      )}

      {loading ? (
        <Yukleniyor />
      ) : (
    <FlatList
      style={{ flex: 1, backgroundColor: renkler.bg }}
      data={randevular}
      keyExtractor={r => r.id}
      refreshControl={<RefreshControl refreshing={yenileniyor} onRefresh={elleYenile} />}
      contentContainerStyle={randevular.length === 0 && s.bosContainer}
      ListEmptyComponent={
        <View style={s.bosKutu}>
          <Ionicons name="build-outline" size={48} color={renkler.subtext} />
          <Text style={[s.bosBaslik, { color: renkler.text }]}>Bu gün için iş yok</Text>
          <Text style={[s.bosAlt, { color: renkler.subtext }]}>
            Seçili günde onaylı randevu yok. Başka bir gün seç.
          </Text>
        </View>
      }
      renderItem={({ item }) => {
        const slot = item.baslangic ? new Date(item.baslangic) : null;
        const is = item.jobs?.[0];
        const fotolar = is?.job_photos ?? [];
        const oncekiler = fotolar.filter(f => f.tip === 'once');
        const sonrakiler = fotolar.filter(f => f.tip === 'sonra');
        const busy = mesgul === item.id || (is && mesgul === is.id);
        const musteriFoto = avatarUrl(item.users?.avatar_url);

        return (
          <View style={[s.kart, { backgroundColor: renkler.card }]}>
            <View style={s.kartUst}>
              <Text style={[s.saat, { color: renkler.text }]}>
                {slot
                  ? slot.toLocaleString('tr-TR', {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                    })
                  : 'Saat yok'}
              </Text>
              {is && (
                <View style={[s.rozet, { backgroundColor: renkler.rozetBg }]}>
                  <Text style={[s.rozetText, {
                    color: is.durum === 'hazir' ? '#16a34a' : renkler.primary,
                  }]}>
                    {IS_ETIKET[is.durum]}
                  </Text>
                </View>
              )}
            </View>

            <Text style={[s.hizmet, { color: renkler.primary }]}>
              {item.services?.ad ?? 'Hizmet'}
            </Text>
            <View style={s.musteriRow}>
              {musteriFoto ? (
                <Image source={{ uri: musteriFoto }} style={[s.musteriFoto, { borderColor: renkler.border }]} />
              ) : (
                <View style={[s.musteriFoto, s.musteriFotoBos, { backgroundColor: renkler.rozetBg }]}>
                  <Ionicons name="person" size={18} color={renkler.primary} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={[s.detay, { color: renkler.text }]}>
                  {item.users?.ad_soyad ?? 'Müşteri'}
                  {item.users?.telefon ? ` · ${item.users.telefon}` : ''}
                </Text>
                <Text style={[s.detay, { color: renkler.subtext }]}>
                  {item.vehicles?.plaka ?? ''}
                  {item.vehicles ? `  ${[item.vehicles.marka, item.vehicles.model].filter(Boolean).join(' ')}` : ''}
                </Text>
              </View>
            </View>

            {!is ? (
              <TouchableOpacity
                style={[s.anaBtn, { backgroundColor: renkler.primary }]}
                onPress={() => isiBaslat(item)}
                disabled={busy}
              >
                {busy
                  ? <ActivityIndicator color={renkler.primaryText} />
                  : <Text style={[s.anaBtnText, { color: renkler.primaryText }]}>İşi Başlat</Text>}
              </TouchableOpacity>
            ) : (
              <>
                {/* Foto bölümleri */}
                <FotoBolum
                  baslik="Önce" tip="once" fotolar={oncekiler}
                  signedMap={signedMap} renkler={renkler}
                  onEkle={() => fotoSec(is.id, 'once')} busy={!!busy}
                />
                <FotoBolum
                  baslik="Sonra" tip="sonra" fotolar={sonrakiler}
                  signedMap={signedMap} renkler={renkler}
                  onEkle={() => fotoSec(is.id, 'sonra')} busy={!!busy}
                />

                {/* Durum ilerlet */}
                {SONRAKI[is.durum] && (
                  <TouchableOpacity
                    style={[s.anaBtn, { backgroundColor: renkler.primary }]}
                    onPress={() => durumIlerlet(is.id, is.durum)}
                    disabled={busy}
                  >
                    {busy
                      ? <ActivityIndicator color={renkler.primaryText} />
                      : (
                        <Text style={[s.anaBtnText, { color: renkler.primaryText }]}>
                          {SONRAKI_ETIKET[is.durum]}
                        </Text>
                      )}
                  </TouchableOpacity>
                )}
              </>
            )}

            {/* Dükkan satışı (hesap) + şubede ödeme tahsilatı */}
            {(() => {
              const dukkanlar = (item.orders ?? []).filter(o => o.kaynak === 'dukkan');
              const hesap = dukkanlar.reduce((a, o) => a + Number(o.toplam), 0);
              const satilanlar = dukkanlar.flatMap(o => o.order_items ?? []);
              const subede = item.odeme_yontemi === 'subede';
              return (
                <View style={[s.satisBolum, { borderColor: renkler.border }]}>
                  {hesap > 0 && (
                    <View style={[s.hesapKutu, { backgroundColor: renkler.rozetBg }]}>
                      {satilanlar.map((oi, i) => (
                        <Text key={i} style={[s.hesapSatir, { color: renkler.text }]}>
                          {oi.adet}× {oi.ad}
                        </Text>
                      ))}
                      <View style={s.hesapToplamRow}>
                        <Text style={[s.hesapToplamLabel, { color: renkler.subtext }]}>Dükkan hesabı</Text>
                        <Text style={[s.hesapToplam, { color: renkler.primary }]}>{tl(hesap)}</Text>
                      </View>
                    </View>
                  )}
                  <View style={s.satisBtnRow}>
                    <TouchableOpacity
                      style={[s.satisBtn, { borderColor: renkler.primary }]}
                      onPress={() => satisAc(item)}
                    >
                      <Ionicons name="cart-outline" size={17} color={renkler.primary} />
                      <Text style={[s.satisBtnText, { color: renkler.primary }]}>Ürün Sat</Text>
                    </TouchableOpacity>
                    {subede && (item.odeme_alindi ? (
                      <View style={[s.odemeRozet, { borderColor: '#16a34a' }]}>
                        <Ionicons name="checkmark-circle" size={17} color="#16a34a" />
                        <Text style={[s.odemeRozetText, { color: '#16a34a' }]}>Ödeme alındı</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={[s.satisBtn, s.odemeBtn, { backgroundColor: renkler.primary, borderColor: renkler.primary }]}
                        onPress={() => odemeAl(item)}
                      >
                        <Ionicons name="cash-outline" size={17} color={renkler.primaryText} />
                        <Text style={[s.satisBtnText, { color: renkler.primaryText }]}>Ödeme Al</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              );
            })()}
          </View>
        );
      }}
    />
      )}

      <SatisModal
        visible={!!satisHedef}
        onClose={() => setSatisHedef(null)}
        branchId={branchId}
        appointmentId={satisHedef?.appointmentId ?? null}
        baslik={satisHedef?.baslik}
        onDone={yukle}
      />
    </View>
  );
}

function FotoBolum({
  baslik, fotolar, signedMap, renkler, onEkle, busy,
}: {
  baslik: string;
  tip: 'once' | 'sonra';
  fotolar: { url: string }[];
  signedMap: Record<string, string>;
  renkler: any;
  onEkle: () => void;
  busy: boolean;
}) {
  return (
    <View style={s.fotoBolum}>
      <Text style={[s.fotoBaslik, { color: renkler.subtext }]}>{baslik}</Text>
      <View style={s.fotoLista}>
        {fotolar.map((f, i) => {
          const uri = signedMap[f.url];
          return uri ? (
            <Image key={`${f.url}-${i}`} source={{ uri }} style={[s.foto, { borderColor: renkler.border }]} />
          ) : null;
        })}
        <TouchableOpacity
          style={[s.fotoEkle, { borderColor: renkler.primary }]}
          onPress={onEkle}
          disabled={busy}
        >
          <Ionicons name="camera" size={22} color={renkler.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  seritKutu: { paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  gunSerit: { gap: 8, paddingHorizontal: 12, paddingVertical: 2 },
  gunBtn: {
    borderWidth: 1, borderRadius: 10,
    paddingVertical: 8, paddingHorizontal: 14, alignItems: 'center',
  },
  gunUst: { fontSize: 12 },
  gunAlt: { fontSize: 14, fontWeight: '700', marginTop: 2 },
  bosContainer: { flexGrow: 1, justifyContent: 'center' },
  bosKutu: { alignItems: 'center', padding: 32 },
  bosBaslik: { fontSize: 17, fontWeight: '700', marginTop: 16 },
  bosAlt: { fontSize: 14, textAlign: 'center', marginTop: 6, lineHeight: 20 },
  kart: { margin: 12, marginBottom: 0, padding: 16, borderRadius: 12 },
  kartUst: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 8,
  },
  saat: { fontSize: 16, fontWeight: '700' },
  rozet: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  rozetText: { fontSize: 12, fontWeight: '700' },
  hizmet: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  musteriRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2 },
  musteriFoto: { width: 38, height: 38, borderRadius: 19, borderWidth: 1 },
  musteriFotoBos: { alignItems: 'center', justifyContent: 'center' },
  detay: { fontSize: 14, marginTop: 2 },
  anaBtn: { borderRadius: 10, padding: 13, alignItems: 'center', marginTop: 14 },
  anaBtnText: { fontSize: 15, fontWeight: '700' },
  // Hızlı satış (randevusuz) butonu — liste üstünde
  hizliSatis: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginHorizontal: 12, marginTop: 12, borderWidth: 1.5, borderRadius: 12, padding: 12,
  },
  hizliSatisText: { fontSize: 14, fontWeight: '700' },
  // Dükkan satışı + ödeme bölümü (kart içi)
  satisBolum: { marginTop: 14, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12 },
  hesapKutu: { borderRadius: 10, padding: 12, marginBottom: 10 },
  hesapSatir: { fontSize: 13, marginBottom: 2 },
  hesapToplamRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6,
  },
  hesapToplamLabel: { fontSize: 13, fontWeight: '600' },
  hesapToplam: { fontSize: 16, fontWeight: '800' },
  satisBtnRow: { flexDirection: 'row', gap: 10 },
  satisBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1.5, borderRadius: 10, paddingVertical: 11,
  },
  satisBtnText: { fontSize: 14, fontWeight: '700' },
  odemeBtn: { borderWidth: 0 },
  odemeRozet: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1.5, borderRadius: 10, paddingVertical: 11,
  },
  odemeRozetText: { fontSize: 14, fontWeight: '700' },
  fotoBolum: { marginTop: 12 },
  fotoBaslik: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5, marginBottom: 6 },
  fotoLista: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  foto: { width: 72, height: 72, borderRadius: 8, borderWidth: 1 },
  fotoEkle: {
    width: 72, height: 72, borderRadius: 8, borderWidth: 1.5, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
  },
});
