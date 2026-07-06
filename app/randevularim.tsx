import { uyari } from '../src/lib/uyari';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Image, RefreshControl,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { Stack, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../src/lib/supabase';
import { privateUrls } from '../src/lib/storage';
import { useSession } from '../src/hooks/useSession';
import { useTheme } from '../src/theme/ThemeContext';
import { Appointment, IsDurum, RandevuDurum } from '../src/types';
import { Yukleniyor } from '../src/components/Yukleniyor';

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
const IPTAL_SINIRI_DK = 60;  // randevu saatine bu kadar dakikadan az kala iptal kapanır

// Slot başlangıcına kaç dakika kaldığı (geçmişse negatif). null = slot yok
function dakikaKala(baslangic?: string | null): number | null {
  if (!baslangic) return null;
  return (new Date(baslangic).getTime() - Date.now()) / 60000;
}

export default function RandevularimScreen() {
  const { session } = useSession();
  const { renkler } = useTheme();
  const [randevular, setRandevular] = useState<Appointment[]>([]);
  const [signedMap, setSignedMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [yenileniyor, setYenileniyor] = useState(false);

  const headerOpts = useMemo(() => ({
    title: 'Hizmetlerim',
    headerShown: true,
    headerStyle: { backgroundColor: renkler.card },
    headerTitleStyle: { color: renkler.text },
    headerTintColor: renkler.primary,
    headerShadowVisible: false,
  }), [renkler]);

  useFocusEffect(useCallback(() => { yukle(); }, [session?.user?.id]));

  async function yukle() {
    if (!session?.user) { setLoading(false); return; }
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        services (ad),
        branches (ad),
        jobs (durum, job_photos (tip, url)),
        appointment_changes ( id, tip, durum, yeni_baslangic )
      `)
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      uyari('Hata', error.message);
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

    try {
      setSignedMap(await privateUrls(PHOTO_BUCKET, yollar));
    } catch { /* sessiz — foto imzası alınamazsa liste yine görünür */ }
  }

  async function elleYenile() {
    setYenileniyor(true);
    await yukle();
    setYenileniyor(false);
  }

  function iptalOnayi(r: Appointment) {
    uyari(
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
            if (error) uyari('Hata', error.message);
            else yukle();
          },
        },
      ],
    );
  }

  // Yöneticiden gelen değişiklik talebine yanıt (onay/ret). Uygulama adımı
  // SECURITY DEFINER RPC içinde sahiplik doğrulanarak yapılır.
  function talebeYanitVer(talepId: string, onay: boolean) {
    uyari(
      onay ? 'Talebi Onayla' : 'Talebi Reddet',
      onay
        ? 'Yöneticinin önerdiği değişikliği onaylıyor musun?'
        : 'Talebi reddedersen randevun olduğu gibi kalır.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: onay ? 'Onayla' : 'Reddet',
          style: onay ? 'default' : 'destructive',
          onPress: async () => {
            const { error } = await supabase.rpc('randevu_talep_yanitla', {
              p_talep_id: talepId, p_onay: onay,
            });
            if (error) uyari('Hata', error.message);
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

  if (loading) {
    return (
      <>
        <Stack.Screen options={headerOpts} />
        <Yukleniyor />
      </>
    );
  }

  return (
    <View style={[s.container, { backgroundColor: renkler.bg }]}>
      <Stack.Screen options={headerOpts} />
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
          const slot = item.baslangic ? new Date(item.baslangic) : null;
          const is = item.jobs?.[0];
          const fotolar = is?.job_photos ?? [];
          const oncekiler = fotolar.filter(f => f.tip === 'once');
          const sonrakiler = fotolar.filter(f => f.tip === 'sonra');
          const kala = dakikaKala(item.baslangic);
          // Randevu saatine 1 saatten az kala iptal kapanır
          const sureyeUyar = kala === null || kala >= IPTAL_SINIRI_DK;
          const iptalEdilebilir = item.durum !== 'iptal' && !is && sureyeUyar;
          const iptalKapandi = item.durum !== 'iptal' && !is && !sureyeUyar;
          const bekleyen = item.appointment_changes?.find(c => c.durum === 'beklemede');

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
                {[item.branches?.ad, item.odeme_yontemi === 'online' ? 'Online ödeme' : 'Şubede ödeme']
                  .filter(Boolean).join(' · ')}
              </Text>

              {/* İş durumu (çalışan güncelledikçe) */}
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

              {/* Yöneticiden gelen bekleyen değişiklik talebi — müşteri onayı */}
              {bekleyen && (
                <View style={[s.talepKutu, { backgroundColor: renkler.rozetBg, borderColor: renkler.primary }]}>
                  <View style={s.talepBaslikSatir}>
                    <Ionicons name="notifications" size={16} color={renkler.primary} />
                    <Text style={[s.talepBaslik, { color: renkler.primary }]}>
                      {bekleyen.tip === 'iptal' ? 'İptal talebi' : 'Saat değişikliği talebi'}
                    </Text>
                  </View>
                  <Text style={[s.talepMetin, { color: renkler.text }]}>
                    {bekleyen.tip === 'iptal'
                      ? 'Şube bu randevuyu iptal etmek istiyor. Onaylıyor musun?'
                      : `Şube randevu saatini ${
                          bekleyen.yeni_baslangic
                            ? new Date(bekleyen.yeni_baslangic).toLocaleString('tr-TR', {
                                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                              })
                            : 'yeni bir saate'
                        } olarak değiştirmek istiyor. Onaylıyor musun?`}
                  </Text>
                  <View style={s.talepEylem}>
                    <TouchableOpacity
                      style={[s.talepBtn, { backgroundColor: renkler.primary }]}
                      onPress={() => talebeYanitVer(bekleyen.id, true)}
                    >
                      <Text style={[s.talepBtnText, { color: renkler.primaryText }]}>Onayla</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.talepBtnRet, { borderColor: renkler.danger }]}
                      onPress={() => talebeYanitVer(bekleyen.id, false)}
                    >
                      <Text style={[s.talepBtnText, { color: renkler.danger }]}>Reddet</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {iptalEdilebilir && (
                <>
                  <TouchableOpacity
                    style={[s.iptalBtn, { borderColor: renkler.danger }]}
                    onPress={() => iptalOnayi(item)}
                  >
                    <Text style={[s.iptalText, { color: renkler.danger }]}>İptal Et</Text>
                  </TouchableOpacity>
                  <Text style={[s.iptalBilgi, { color: renkler.subtext }]}>
                    Randevunu, saatine 1 saat kalaya kadar iptal edebilirsin.
                  </Text>
                </>
              )}
              {iptalKapandi && (
                <Text style={[s.iptalBilgi, { color: renkler.subtext }]}>
                  Randevu saatine 1 saatten az kaldığı için iptal kapandı.
                </Text>
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
  iptalBilgi: { fontSize: 12, marginTop: 8, lineHeight: 17 },
  talepKutu: { borderWidth: 1, borderRadius: 10, padding: 12, marginTop: 12 },
  talepBaslikSatir: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  talepBaslik: { fontSize: 13, fontWeight: '700' },
  talepMetin: { fontSize: 13, lineHeight: 19, marginTop: 6 },
  talepEylem: { flexDirection: 'row', gap: 10, marginTop: 12 },
  talepBtn: { borderRadius: 8, paddingVertical: 9, paddingHorizontal: 18 },
  talepBtnRet: { borderWidth: 1, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 18 },
  talepBtnText: { fontSize: 13, fontWeight: '700' },
});
