import { useCallback, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Image, RefreshControl,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../src/lib/supabase';
import { useSession } from '../../src/hooks/useSession';
import { useTheme } from '../../src/theme/ThemeContext';
import { Appointment, IsDurum } from '../../src/types';

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

export default function IslerScreen() {
  const { session } = useSession();
  const { renkler } = useTheme();
  const [randevular, setRandevular] = useState<Appointment[]>([]);
  const [signedMap, setSignedMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [yenileniyor, setYenileniyor] = useState(false);
  const [mesgul, setMesgul] = useState<string | null>(null);  // işlenen job/appt id

  useFocusEffect(useCallback(() => { yukle(); }, []));

  async function yukle() {
    // RLS: personel yalnızca kendi şubesinin randevularını görür
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        users (ad_soyad, telefon),
        vehicles (plaka, marka, model),
        services (ad),
        time_slots (baslangic),
        jobs (id, durum, assigned_to, job_photos (id, tip, url))
      `)
      .eq('durum', 'onayli')
      .limit(100);

    if (error) { Alert.alert('Hata', error.message); setLoading(false); return; }

    const liste = (data as Appointment[]) ?? [];
    // Slot saatine göre artan sırala (yaklaşan iş önce)
    liste.sort((a, b) => {
      const ta = a.time_slots?.baslangic ?? '';
      const tb = b.time_slots?.baslangic ?? '';
      return ta.localeCompare(tb);
    });
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
    if (error) { Alert.alert('Hata', error.message); return; }
    yukle();
  }

  async function durumIlerlet(jobId: string, mevcut: IsDurum) {
    const yeni = SONRAKI[mevcut];
    if (!yeni) return;
    setMesgul(jobId);
    const { error } = await supabase.from('jobs').update({ durum: yeni }).eq('id', jobId);
    setMesgul(null);
    if (error) { Alert.alert('Hata', error.message); return; }
    yukle();
  }

  // Kamera / galeri seçtir, seçilen görseli storage'a yükle, job_photos'a yaz
  function fotoSec(jobId: string, tip: 'once' | 'sonra') {
    Alert.alert('Fotoğraf Ekle', tip === 'once' ? 'Önce fotoğrafı' : 'Sonra fotoğrafı', [
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
        Alert.alert('İzin gerekli', 'Fotoğraf eklemek için erişim izni vermelisin.');
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
      if (upErr) { setMesgul(null); Alert.alert('Yüklenemedi', upErr.message); return; }

      const { error: dbErr } = await supabase
        .from('job_photos')
        .insert({ job_id: jobId, tip, url: yol });
      setMesgul(null);
      if (dbErr) { Alert.alert('Hata', dbErr.message); return; }
      yukle();
    } catch (e: any) {
      setMesgul(null);
      Alert.alert('Hata', e?.message ?? 'Fotoğraf eklenemedi');
    }
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color={renkler.primary} />;

  return (
    <View style={[s.container, { backgroundColor: renkler.bg }]}>
      <FlatList
        data={randevular}
        keyExtractor={r => r.id}
        refreshControl={<RefreshControl refreshing={yenileniyor} onRefresh={elleYenile} />}
        contentContainerStyle={randevular.length === 0 && s.bosContainer}
        ListEmptyComponent={
          <View style={s.bosKutu}>
            <Ionicons name="build-outline" size={48} color={renkler.subtext} />
            <Text style={[s.bosBaslik, { color: renkler.text }]}>Aktif iş yok</Text>
            <Text style={[s.bosAlt, { color: renkler.subtext }]}>
              Onaylı randevular burada listelenir; iş başlatıp foto ekleyebilirsin.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const slot = item.time_slots?.baslangic
            ? new Date(item.time_slots.baslangic) : null;
          const is = item.jobs?.[0];
          const fotolar = is?.job_photos ?? [];
          const oncekiler = fotolar.filter(f => f.tip === 'once');
          const sonrakiler = fotolar.filter(f => f.tip === 'sonra');
          const busy = mesgul === item.id || (is && mesgul === is.id);

          return (
            <View style={[s.kart, { backgroundColor: renkler.card }]}>
              <View style={s.kartUst}>
                <Text style={[s.saat, { color: renkler.text }]}>
                  {slot
                    ? slot.toLocaleString('tr-TR', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                      })
                    : 'Slot yok'}
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
              <Text style={[s.detay, { color: renkler.text }]}>
                {item.users?.ad_soyad ?? 'Müşteri'}
                {item.users?.telefon ? ` · ${item.users.telefon}` : ''}
              </Text>
              <Text style={[s.detay, { color: renkler.subtext }]}>
                {item.vehicles?.plaka ?? ''}
                {item.vehicles ? `  ${[item.vehicles.marka, item.vehicles.model].filter(Boolean).join(' ')}` : ''}
              </Text>

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
            </View>
          );
        }}
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
  container: { flex: 1 },
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
  detay: { fontSize: 14, marginTop: 2 },
  anaBtn: { borderRadius: 10, padding: 13, alignItems: 'center', marginTop: 14 },
  anaBtnText: { fontSize: 15, fontWeight: '700' },
  fotoBolum: { marginTop: 12 },
  fotoBaslik: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5, marginBottom: 6 },
  fotoLista: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  foto: { width: 72, height: 72, borderRadius: 8, borderWidth: 1 },
  fotoEkle: {
    width: 72, height: 72, borderRadius: 8, borderWidth: 1.5, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
  },
});
