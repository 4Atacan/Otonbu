import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text,
  TouchableOpacity, View,
} from 'react-native';
import { useFocusEffect, useRouter, useSegments } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../src/lib/supabase';
import { useSession } from '../../src/hooks/useSession';
import { Tema, useTheme } from '../../src/theme/ThemeContext';
import { PERSONEL_ROLLER } from '../../src/types';
import { AVATAR_BUCKET, avatarUrl } from '../../src/lib/avatar';

const ROL_ADLARI: Record<string, string> = {
  musteri: 'Müşteri',
  yonetici: 'Yönetici',
  calisan: 'Çalışan',
  admin: 'Admin',
};

export default function ProfilScreen() {
  const { profile } = useSession();
  const { tema, renkler, setTema } = useTheme();
  const router = useRouter();
  const segments = useSegments();

  // Personel iki panel arasında geçebilir (örn. yöneticinin kendi aracı varsa)
  const personel = !!profile && PERSONEL_ROLLER.includes(profile.rol);
  const yonetimde = segments[0] === '(yonetim)';

  // Profil fotoğrafı: yereldeki kopyayı yüklemeden sonra anında göstermek için
  // session profilinden ayrı tutulur (session bir sonraki yüklemede tazelenir).
  const [avatarYol, setAvatarYol] = useState<string | null>(profile?.avatar_url ?? null);
  const [fotoYukleniyor, setFotoYukleniyor] = useState(false);
  useEffect(() => { setAvatarYol(profile?.avatar_url ?? null); }, [profile?.avatar_url]);
  const avatarGoster = avatarUrl(avatarYol);

  // Sadakat puanı (loyalty_ledger toplamı)
  const [puan, setPuan] = useState(0);
  useFocusEffect(useCallback(() => { puanYukle(); }, [profile?.id]));

  async function puanYukle() {
    if (!profile?.id) { setPuan(0); return; }
    const { data } = await supabase
      .from('loyalty_ledger').select('puan_degisim').eq('user_id', profile.id);
    setPuan(((data as { puan_degisim: number }[]) ?? [])
      .reduce((a, r) => a + r.puan_degisim, 0));
  }

  function avatarSec() {
    Alert.alert('Profil Fotoğrafı', undefined, [
      { text: 'Kamera', onPress: () => avatarYukle('kamera') },
      { text: 'Galeriden Seç', onPress: () => avatarYukle('galeri') },
      ...(avatarYol
        ? [{ text: 'Kaldır', style: 'destructive' as const, onPress: avatarKaldir }]
        : []),
      { text: 'Vazgeç', style: 'cancel' as const },
    ]);
  }

  async function avatarYukle(kaynak: 'kamera' | 'galeri') {
    try {
      if (!profile?.id) return;
      const izin = kaynak === 'kamera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!izin.granted) {
        Alert.alert('İzin gerekli', 'Fotoğraf eklemek için erişim izni vermelisin.');
        return;
      }
      const sonuc = kaynak === 'kamera'
        ? await ImagePicker.launchCameraAsync({ quality: 0.6, allowsEditing: true, aspect: [1, 1] })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'], quality: 0.6, allowsEditing: true, aspect: [1, 1],
          });
      if (sonuc.canceled || !sonuc.assets?.[0]) return;

      setFotoYukleniyor(true);
      const asset = sonuc.assets[0];
      // RN: yerel uri → arrayBuffer (Supabase storage'ın önerdiği yol)
      const res = await fetch(asset.uri);
      const buf = await res.arrayBuffer();
      const mime = asset.mimeType ?? 'image/jpeg';
      const uzanti = mime === 'image/png' ? 'png' : 'jpg';
      // Yol ilk segmenti = sahibinin uid'i (storage RLS bunu zorlar)
      const yol = `${profile.id}/${Date.now()}.${uzanti}`;

      const { error: upErr } = await supabase.storage
        .from(AVATAR_BUCKET).upload(yol, buf, { contentType: mime, upsert: true });
      if (upErr) { setFotoYukleniyor(false); Alert.alert('Yüklenemedi', upErr.message); return; }

      const { error: dbErr } = await supabase
        .from('users').update({ avatar_url: yol }).eq('id', profile.id);
      setFotoYukleniyor(false);
      if (dbErr) { Alert.alert('Hata', dbErr.message); return; }
      setAvatarYol(yol);
    } catch (e: any) {
      setFotoYukleniyor(false);
      Alert.alert('Hata', e?.message ?? 'Fotoğraf yüklenemedi');
    }
  }

  async function avatarKaldir() {
    if (!profile?.id) return;
    setFotoYukleniyor(true);
    const { error } = await supabase
      .from('users').update({ avatar_url: null }).eq('id', profile.id);
    setFotoYukleniyor(false);
    if (error) { Alert.alert('Hata', error.message); return; }
    setAvatarYol(null);
  }

  function cikisOnayi() {
    Alert.alert('Çıkış Yap', 'Hesabından çıkış yapılacak. Emin misin?', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Çıkış Yap', style: 'destructive', onPress: () => supabase.auth.signOut() },
    ]);
  }

  // KVKK silme hakkı: kişisel veriler anonimleştirilir (geri alınamaz),
  // muhasebe kaydı kişiye bağlanamaz halde kalır. Sunucu RPC yapar.
  function verileriSilOnayi() {
    Alert.alert(
      'Verilerimi Sil',
      'Kişisel verilerin (ad, e-posta, telefon, araç plakası, profil fotoğrafı) kalıcı olarak ' +
        'anonimleştirilecek, aktif aboneliklerin ve gelecekteki randevuların iptal edilecek. ' +
        'Bu işlem GERİ ALINAMAZ. Devam etmek istiyor musun?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Verilerimi Sil', style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.rpc('hesabimi_sil');
            if (error) { Alert.alert('Hata', error.message); return; }
            Alert.alert(
              'Verilerin silindi',
              'Kişisel verilerin anonimleştirildi. Hesabından çıkış yapılıyor.',
              [{ text: 'Tamam', onPress: () => supabase.auth.signOut() }],
            );
          },
        },
      ],
    );
  }

  const temalar: { value: Tema; label: string; ikon: 'sunny' | 'moon' }[] = [
    { value: 'acik', label: 'Aydınlık', ikon: 'sunny' },
    { value: 'koyu', label: 'Koyu', ikon: 'moon' },
  ];

  return (
    <ScrollView style={{ backgroundColor: renkler.bg }} contentContainerStyle={s.container}>
      {/* Kullanıcı kartı — avatar dokununca foto yükleme */}
      <View style={[s.kart, { backgroundColor: renkler.card }]}>
        <TouchableOpacity activeOpacity={0.8} onPress={avatarSec} disabled={fotoYukleniyor}>
          <View style={[s.avatar, { backgroundColor: renkler.rozetBg }]}>
            {fotoYukleniyor ? (
              <ActivityIndicator color={renkler.primary} />
            ) : avatarGoster ? (
              <Image source={{ uri: avatarGoster }} style={s.avatarFoto} />
            ) : (
              <Ionicons name="person" size={28} color={renkler.primary} />
            )}
            <View style={[s.avatarRozet, { backgroundColor: renkler.primary, borderColor: renkler.card }]}>
              <Ionicons name="camera" size={13} color={renkler.primaryText} />
            </View>
          </View>
        </TouchableOpacity>
        <Text style={[s.ad, { color: renkler.text }]}>
          {profile?.ad_soyad ?? '—'}
        </Text>
        <Text style={[s.rol, { color: renkler.subtext }]}>
          {ROL_ADLARI[profile?.rol ?? ''] ?? profile?.rol ?? ''}
        </Text>

        <View style={[s.ayrac, { backgroundColor: renkler.border }]} />

        <View style={s.bilgiSatir}>
          <Ionicons name="mail-outline" size={18} color={renkler.subtext} />
          <Text style={[s.bilgi, { color: renkler.text }]}>{profile?.email ?? '—'}</Text>
        </View>
        <View style={s.bilgiSatir}>
          <Ionicons name="call-outline" size={18} color={renkler.subtext} />
          <Text style={[s.bilgi, { color: renkler.text }]}>{profile?.telefon ?? '—'}</Text>
        </View>
      </View>

      {/* Sadakat puanı — hizmet/ürün tamamlanınca birikir */}
      <Text style={[s.bolumBaslik, { color: renkler.subtext }]}>SADAKAT PUANIM</Text>
      <View style={[s.puanKart, { backgroundColor: renkler.primary }]}>
        <Ionicons name="star" size={28} color="#fff" />
        <View style={{ flex: 1 }}>
          <Text style={s.puanSayi}>{puan}</Text>
          <Text style={s.puanAlt}>puan</Text>
        </View>
        <Text style={s.puanNot}>Aldığın hizmet ve{'\n'}ürünlerden kazan</Text>
      </View>

      {/* Hesabım — tüm işlemler tek tarz satır listesi (aşağı doğru) */}
      <Text style={[s.bolumBaslik, { color: renkler.subtext }]}>HESABIM</Text>
      <View style={[s.menuKart, { backgroundColor: renkler.card }]}>
        <MenuSatir ikon="car" etiket="Araçlarım" renkler={renkler}
          onPress={() => router.push('/araclar')} />
        <Ayrac renkler={renkler} />
        <MenuSatir ikon="construct" etiket="Hizmetlerim" renkler={renkler}
          onPress={() => router.push('/randevularim')} />
        <Ayrac renkler={renkler} />
        <MenuSatir ikon="ticket-outline" etiket="Aboneliğim" renkler={renkler}
          onPress={() => router.push('/abonelik')} />
      </View>

      {/* Görünüm */}
      <Text style={[s.bolumBaslik, { color: renkler.subtext }]}>GÖRÜNÜM</Text>
      <View style={[s.kart, { backgroundColor: renkler.card }]}>
        <View style={s.temaRow}>
          {temalar.map(t => {
            const aktif = tema === t.value;
            return (
              <TouchableOpacity
                key={t.value}
                style={[
                  s.temaBtn,
                  { borderColor: renkler.border },
                  aktif && { backgroundColor: renkler.primary, borderColor: renkler.primary },
                ]}
                onPress={() => setTema(t.value)}
              >
                <Ionicons name={t.ikon} size={18} color={aktif ? renkler.primaryText : renkler.subtext} />
                <Text style={[s.temaText, { color: aktif ? renkler.primaryText : renkler.text }]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Gizlilik / KVKK */}
      <Text style={[s.bolumBaslik, { color: renkler.subtext }]}>GİZLİLİK</Text>
      <View style={[s.menuKart, { backgroundColor: renkler.card }]}>
        <MenuSatir ikon="shield-checkmark" etiket="KVKK Aydınlatma Metni" renkler={renkler}
          onPress={() => router.push('/kvkk')} />
        <Ayrac renkler={renkler} />
        <MenuSatir ikon="trash-outline" etiket="Verilerimi Sil" renkler={renkler}
          danger onPress={verileriSilOnayi} />
      </View>

      {/* Hesap — panel geçişi (personel) çıkışın hemen üstünde */}
      <Text style={[s.bolumBaslik, { color: renkler.subtext }]}>HESAP</Text>
      <View style={[s.menuKart, { backgroundColor: renkler.card }]}>
        {personel && (
          <>
            <MenuSatir
              ikon={yonetimde ? 'car-outline' : 'speedometer-outline'}
              etiket={yonetimde ? 'Müşteri Paneline Geç' : 'Yönetici Paneline Geç'}
              renkler={renkler}
              onPress={() => router.replace(yonetimde ? '/(main)' : '/(yonetim)')}
            />
            <Ayrac renkler={renkler} />
          </>
        )}
        <MenuSatir ikon="log-out-outline" etiket="Çıkış Yap" renkler={renkler}
          danger onPress={cikisOnayi} />
      </View>
    </ScrollView>
  );
}

// Tek tarz menü satırı — Araçlarım/Hizmetlerim formatı (ikon + etiket + ok)
function MenuSatir({
  ikon, etiket, renkler, onPress, danger,
}: {
  ikon: keyof typeof Ionicons.glyphMap;
  etiket: string;
  renkler: any;
  onPress: () => void;
  danger?: boolean;
}) {
  const renk = danger ? renkler.danger : renkler.text;
  return (
    <TouchableOpacity style={s.menuSatir} onPress={onPress}>
      <View style={[s.menuIkon, { backgroundColor: renkler.rozetBg }]}>
        <Ionicons name={ikon} size={20} color={danger ? renkler.danger : renkler.primary} />
      </View>
      <Text style={[s.menuText, { color: renk }]}>{etiket}</Text>
      <Ionicons name="chevron-forward" size={20} color={renkler.subtext} />
    </TouchableOpacity>
  );
}

function Ayrac({ renkler }: { renkler: any }) {
  return <View style={[s.menuAyrac, { backgroundColor: renkler.border }]} />;
}

const s = StyleSheet.create({
  container: { padding: 16, paddingBottom: 48 },
  kart: { borderRadius: 12, padding: 20, alignItems: 'center' },
  avatar: {
    width: 64, height: 64, borderRadius: 32,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  avatarFoto: { width: 64, height: 64, borderRadius: 32 },
  avatarRozet: {
    position: 'absolute', right: -2, bottom: 10,
    width: 24, height: 24, borderRadius: 12, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  ad: { fontSize: 18, fontWeight: '700' },
  rol: { fontSize: 13, marginTop: 2 },
  ayrac: { alignSelf: 'stretch', height: 1, marginVertical: 16 },
  bilgiSatir: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    alignSelf: 'stretch', paddingVertical: 6,
  },
  bilgi: { fontSize: 15 },
  bolumBaslik: {
    fontSize: 11, fontWeight: '700', letterSpacing: 1,
    marginTop: 24, marginBottom: 8, marginLeft: 4,
  },
  puanKart: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderRadius: 16, padding: 18,
  },
  puanSayi: { color: '#fff', fontSize: 30, fontWeight: '800' },
  puanAlt: { color: '#fff', fontSize: 13, opacity: 0.9, marginTop: -2 },
  puanNot: { color: '#fff', fontSize: 12, opacity: 0.9, textAlign: 'right' },
  temaRow: { flexDirection: 'row', gap: 10, alignSelf: 'stretch' },
  temaBtn: {
    flex: 1, flexDirection: 'row', gap: 8,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderRadius: 10, paddingVertical: 12,
  },
  temaText: { fontSize: 15, fontWeight: '600' },
  menuKart: { borderRadius: 12, overflow: 'hidden' },
  menuSatir: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, paddingHorizontal: 16,
  },
  menuIkon: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  menuText: { flex: 1, fontSize: 15, fontWeight: '600' },
  menuAyrac: { height: 1, marginLeft: 64 },
});
