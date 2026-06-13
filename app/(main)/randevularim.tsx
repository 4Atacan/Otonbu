import { useCallback, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Image, RefreshControl,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../src/lib/supabase';
import { useSession } from '../../src/hooks/useSession';
import { useTheme } from '../../src/theme/ThemeContext';
import { Appointment, IsDurum, RandevuDurum } from '../../src/types';

const RANDEVU_ETIKET: Record<RandevuDurum, string> = {
  beklemede: 'Beklemede',
  onayli: 'Onaylı',
  iptal: 'İptal edildi',
};

const IS_ETIKET: Record<IsDurum, string> = {
  basladi: 'İşlem başladı',
  tamamlandi: 'İşlem tamamlandı',
  hazir: 'Aracın hazır 🎉',
};

const PHOTO_BUCKET = 'job-photos';
const SIGNED_TTL = 60 * 60;  // 1 saat — signed URL süre dolunca ölür

export default function RandevularimScreen() {
  const { session } = useSession();
  const { renkler } = useTheme();
  const [randevular, setRandevular] = useState<Appointment[]>([]);
  const [signedMap, setSignedMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [yenileniyor, setYenileniyor] = useState(false);

  useFocusEffect(useCallback(() => { yukle(); }, [session?.user?.id]));

  async function yukle() {
    if (!session?.user) { setLoading(false); return; }
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        services (ad),
        branches (ad),
        time_slots (baslangic),
        jobs (durum, job_photos (tip, url))
      `)
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      Alert.alert('Hata', error.message);
      setLoading(false);
      return;
    }

    const liste = (data as Appointment[]) ?? [];
    setRandevular(liste);
    await fotolariImzala(liste);
    setLoading(false);
  }

  // Tüm iş fotoğraflarının storage yollarını toplu signed URL'e çevir
  async function fotolariImzala(liste: Appointment[]) {
    const yollar = liste
      .flatMap(r => r.jobs ?? [])
      .flatMap(j => j.job_photos ?? [])
      .map(p => p.url);
    if (yollar.length === 0) { setSignedMap({}); return; }

    const { data, error } = await supabase.storage
      .from(PHOTO_BUCKET)
      .createSignedUrls(yollar, SIGNED_TTL);
    if (error || !data) return;

    const harita: Record<string, string> = {};
    data.forEach(d => { if (d.signedUrl && d.path) harita[d.path] = d.signedUrl; });
    setSignedMap(harita);
  }

  async function elleYenile() {
    setYenileniyor(true);
    await yukle();
    setYenileniyor(false);
  }

  function iptalOnayi(r: Appointment) {
    Alert.alert(
      'Randevuyu İptal Et',
      'Bu randevuyu iptal etmek istediğine emin misin?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'İptal Et', style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('appointments')
              .update({ durum: 'iptal' })
              .eq('id', r.id);
            if (error) Alert.alert('Hata', error.message);
            else yukle();
          },
        },
      ],
    );
  }

  function randevuRenk(durum: RandevuDurum): string {
    if (durum === 'onayli') return '#16a34a';
    if (durum === 'iptal') return renkler.danger;
    return '#d97706';
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color={renkler.primary} />;

  return (
    <View style={[s.container, { backgroundColor: renkler.bg }]}>
      <FlatList
        data={randevular}
        keyExtractor={r => r.id}
        refreshControl={
          <RefreshControl refreshing={yenileniyor} onRefresh={elleYenile} />
        }
        contentContainerStyle={randevular.length === 0 && s.bosContainer}
        ListEmptyComponent={
          <View style={s.bosKutu}>
            <Ionicons name="calendar-outline" size={48} color={renkler.subtext} />
            <Text style={[s.bosBaslik, { color: renkler.text }]}>Henüz randevun yok</Text>
            <Text style={[s.bosAlt, { color: renkler.subtext }]}>
              Ana sayfadan bir hizmet seçerek randevu alabilirsin.
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
          const iptalEdilebilir = item.durum !== 'iptal' && !is;

          return (
            <View style={[s.kart, { backgroundColor: renkler.card }]}>
              <View style={s.kartUst}>
                <Text style={[s.saat, { color: renkler.text }]}>
                  {slot
                    ? slot.toLocaleString('tr-TR', {
                        day: 'numeric', month: 'short',
                        hour: '2-digit', minute: '2-digit',
                      })
                    : 'Slot yok'}
                </Text>
                <View style={[s.rozet, { backgroundColor: renkler.rozetBg }]}>
                  <Text style={[s.rozetText, { color: randevuRenk(item.durum) }]}>
                    {RANDEVU_ETIKET[item.durum]}
                  </Text>
                </View>
              </View>

              <Text style={[s.hizmet, { color: renkler.primary }]}>
                {item.services?.ad ?? 'Hizmet'}
              </Text>
              <Text style={[s.detay, { color: renkler.subtext }]}>
                {item.branches?.ad ?? ''}
              </Text>

              {/* İş durumu (usta güncelledikçe) */}
              {is && (
                <View style={[s.isKutu, { borderColor: renkler.border }]}>
                  <Ionicons
                    name={is.durum === 'hazir' ? 'checkmark-done-circle' : 'build'}
                    size={16}
                    color={is.durum === 'hazir' ? '#16a34a' : renkler.primary}
                  />
                  <Text style={[s.isDurum, { color: renkler.text }]}>
                    {IS_ETIKET[is.durum]}
                  </Text>
                </View>
              )}

              {/* Önce / Sonra fotoğrafları (signed URL) */}
              {(oncekiler.length > 0 || sonrakiler.length > 0) && (
                <View style={s.fotoBolum}>
                  {oncekiler.length > 0 && (
                    <FotoSatiri
                      baslik="Önce" fotolar={oncekiler} signedMap={signedMap} renkler={renkler}
                    />
                  )}
                  {sonrakiler.length > 0 && (
                    <FotoSatiri
                      baslik="Sonra" fotolar={sonrakiler} signedMap={signedMap} renkler={renkler}
                    />
                  )}
                </View>
              )}

              {iptalEdilebilir && (
                <TouchableOpacity
                  style={[s.iptalBtn, { borderColor: renkler.danger }]}
                  onPress={() => iptalOnayi(item)}
                >
                  <Text style={[s.iptalText, { color: renkler.danger }]}>İptal Et</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        }}
      />
    </View>
  );
}

function FotoSatiri({
  baslik, fotolar, signedMap, renkler,
}: {
  baslik: string;
  fotolar: { url: string }[];
  signedMap: Record<string, string>;
  renkler: { subtext: string; border: string };
}) {
  return (
    <View style={s.fotoSatir}>
      <Text style={[s.fotoBaslik, { color: renkler.subtext }]}>{baslik}</Text>
      <View style={s.fotoLista}>
        {fotolar.map((f, i) => {
          const uri = signedMap[f.url];
          if (!uri) return null;
          return (
            <Image
              key={`${f.url}-${i}`}
              source={{ uri }}
              style={[s.foto, { borderColor: renkler.border }]}
            />
          );
        })}
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
  hizmet: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  detay: { fontSize: 14, marginTop: 2 },
  isKutu: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderRadius: 8, padding: 10, marginTop: 12,
  },
  isDurum: { fontSize: 14, fontWeight: '600' },
  fotoBolum: { marginTop: 12, gap: 10 },
  fotoSatir: { gap: 6 },
  fotoBaslik: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  fotoLista: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  foto: { width: 90, height: 90, borderRadius: 8, borderWidth: 1 },
  iptalBtn: {
    borderWidth: 1, borderRadius: 8,
    paddingVertical: 9, paddingHorizontal: 16,
    alignSelf: 'flex-start', marginTop: 12,
  },
  iptalText: { fontSize: 13, fontWeight: '600' },
});
