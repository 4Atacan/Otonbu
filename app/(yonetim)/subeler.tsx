import { uyari } from '../../src/lib/uyari';
import { UyariKatmani } from '../../src/components/UyariProvider';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Modal, ScrollView,
  StyleSheet, Switch, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { useTheme } from '../../src/theme/ThemeContext';
import { Branch } from '../../src/types';
import { KlavyeKapsa } from '../../src/components/KlavyeKapsa';
import { Yukleniyor } from '../../src/components/Yukleniyor';

// Bir şubeye atanmış personel satırı (yönetici veya çalışan)
type PersonelSatir = {
  id: string;
  email: string | null;     // KİŞİSEL VERİ
  ad_soyad: string | null;  // KİŞİSEL VERİ
  rol: 'yonetici' | 'calisan';
};

export default function SubelerScreen() {
  const { renkler } = useTheme();
  const [subeler, setSubeler] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAcik, setModalAcik] = useState(false);
  const [duzenlenen, setDuzenlenen] = useState<Branch | null>(null);
  const [ad, setAd] = useState('');
  const [adres, setAdres] = useState('');
  const [aktif, setAktif] = useState(true);
  const [kayit, setKayit] = useState(false);
  // Şube personeli (çoklu yönetici + çoklu çalışan)
  const [personel, setPersonel] = useState<PersonelSatir[]>([]);
  const [yoneticiEmail, setYoneticiEmail] = useState('');
  const [calisanEmail, setCalisanEmail] = useState('');

  useFocusEffect(useCallback(() => { yukle(); }, []));

  async function yukle() {
    const { data, error } = await supabase
      .from('branches').select('*').order('ad');
    if (error) uyari('Hata', error.message);
    else setSubeler(data ?? []);
    setLoading(false);
  }

  function formuSifirla() {
    setDuzenlenen(null);
    setAd(''); setAdres(''); setAktif(true);
    setPersonel([]); setYoneticiEmail(''); setCalisanEmail('');
  }

  function yeni() {
    formuSifirla();
    setModalAcik(true);
  }

  async function ac(item: Branch) {
    setDuzenlenen(item);
    setAd(item.ad);
    setAdres(item.adres ?? '');
    setAktif(item.aktif);
    setYoneticiEmail(''); setCalisanEmail('');
    setModalAcik(true);
    personelYukle(item.id);
  }

  // Bu şubeye atanmış yönetici + çalışanları getir (admin tüm kullanıcıları okur)
  async function personelYukle(branchId: string) {
    const { data } = await supabase
      .from('users')
      .select('id, email, ad_soyad, rol')
      .eq('branch_id', branchId)
      .in('rol', ['yonetici', 'calisan'])
      .order('rol');
    setPersonel((data as PersonelSatir[]) ?? []);
  }

  async function kaydet() {
    if (!ad.trim()) { uyari('Hata', 'Şube adı zorunlu'); return; }

    const veri = { ad: ad.trim(), adres: adres.trim() || null, aktif };

    setKayit(true);
    const { data, error } = duzenlenen
      ? await supabase.from('branches').update(veri).eq('id', duzenlenen.id).select().single()
      : await supabase.from('branches').insert(veri).select().single();
    setKayit(false);

    if (error) { uyari('Hata', error.message); return; }
    // Yeni şube eklendiyse modalı kapatmadan düzenleme moduna geç ki personel
    // ataması yapılabilsin (personel atama mevcut şube gerektirir).
    if (!duzenlenen && data) {
      setDuzenlenen(data as Branch);
      personelYukle((data as Branch).id);
    }
    yukle();
    if (duzenlenen) { setModalAcik(false); formuSifirla(); }
  }

  // E-postayla kullanıcı bul, ilgili role + bu şubeye ata (çoklu atama)
  async function rolAta(email: string, rol: 'yonetici' | 'calisan', temizle: () => void) {
    if (!duzenlenen) return;
    const mail = email.trim().toLowerCase();
    if (!mail) { uyari('Hata', 'Kullanıcının e-postasını gir'); return; }

    setKayit(true);
    const { data: kullanici } = await supabase
      .from('users')
      .select('id, ad_soyad')
      .eq('email', mail)
      .maybeSingle();

    if (!kullanici) {
      setKayit(false);
      uyari('Bulunamadı',
        'Bu e-postayla kayıtlı kullanıcı yok. Kişi önce uygulamaya kayıt olmalı.');
      return;
    }

    const { error } = await supabase
      .from('users')
      .update({ rol, branch_id: duzenlenen.id })
      .eq('id', kullanici.id);
    setKayit(false);

    if (error) { uyari('Hata', error.message); return; }
    temizle();
    personelYukle(duzenlenen.id);
  }

  // Personeli şubeden çıkar → müşteriye düşür (şube erişimi kalkar)
  function personelCikar(item: PersonelSatir) {
    if (!duzenlenen) return;
    uyari(
      'Şubeden Çıkar',
      `${item.ad_soyad ?? item.email ?? 'Kişi'} bu şubeden çıkarılacak ve müşteriye düşürülecek. Emin misin?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Çıkar',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('users')
              .update({ rol: 'musteri', branch_id: null })
              .eq('id', item.id);
            if (error) { uyari('Hata', error.message); return; }
            personelYukle(duzenlenen.id);
          },
        },
      ],
    );
  }

  if (loading) return <Yukleniyor />;

  return (
    <View style={[s.container, { backgroundColor: renkler.bg }]}>
      <FlatList
        data={subeler}
        keyExtractor={b => b.id}
        ListEmptyComponent={
          <Text style={[s.bos, { color: renkler.subtext }]}>
            Henüz şube yok. İlk şubeyi ekle!
          </Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[s.kart, { backgroundColor: renkler.card }, !item.aktif && s.pasif]}
            onPress={() => ac(item)}
          >
            <Text style={[s.ad, { color: renkler.text }]}>
              {item.ad}{!item.aktif ? '  (pasif)' : ''}
            </Text>
            <Text style={[s.adres, { color: renkler.subtext }]}>{item.adres ?? '—'}</Text>
          </TouchableOpacity>
        )}
      />
      <TouchableOpacity
        style={[s.ekleBtn, { backgroundColor: renkler.primary }]}
        onPress={yeni}
      >
        <Text style={[s.ekleBtnText, { color: renkler.primaryText }]}>+ Şube Ekle</Text>
      </TouchableOpacity>

      <Modal visible={modalAcik} animationType="slide" presentationStyle="pageSheet">
        <KlavyeKapsa style={{ backgroundColor: renkler.card }}>
        <ScrollView
          style={{ backgroundColor: renkler.card }}
          contentContainerStyle={s.modal}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[s.modalBaslik, { color: renkler.text }]}>
            {duzenlenen ? 'Şube Detayı' : 'Şube Ekle'}
          </Text>

          <Text style={[s.label, { color: renkler.subtext }]}>Şube Adı *</Text>
          <TextInput
            style={[s.input, { borderColor: renkler.border, backgroundColor: renkler.input, color: renkler.text }]}
            placeholder="OTONBU Serdivan"
            placeholderTextColor={renkler.subtext}
            value={ad} onChangeText={setAd}
          />

          <Text style={[s.label, { color: renkler.subtext }]}>Adres</Text>
          <TextInput
            style={[s.input, { borderColor: renkler.border, backgroundColor: renkler.input, color: renkler.text }]}
            placeholder="Mah. Cad. No, Serdivan/Sakarya"
            placeholderTextColor={renkler.subtext}
            value={adres} onChangeText={setAdres}
          />

          <View style={s.switchRow}>
            <Switch value={aktif} onValueChange={setAktif} />
            <Text style={[s.switchText, { color: renkler.text }]}>Aktif</Text>
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
            <>
              <PersonelGrup
                baslik="Yöneticiler"
                alt="Tam şube paneli yönetimi · şube başına birden çok olabilir"
                liste={personel.filter(p => p.rol === 'yonetici')}
                email={yoneticiEmail}
                setEmail={setYoneticiEmail}
                ekleEtiket="Yönetici Ata"
                onEkle={() => rolAta(yoneticiEmail, 'yonetici', () => setYoneticiEmail(''))}
                onCikar={personelCikar}
                kayit={kayit}
                renkler={renkler}
              />
              <PersonelGrup
                baslik="Çalışanlar"
                alt="Yalnızca randevu + iş paneli görür"
                liste={personel.filter(p => p.rol === 'calisan')}
                email={calisanEmail}
                setEmail={setCalisanEmail}
                ekleEtiket="Çalışan Ata"
                onEkle={() => rolAta(calisanEmail, 'calisan', () => setCalisanEmail(''))}
                onCikar={personelCikar}
                kayit={kayit}
                renkler={renkler}
              />
            </>
          )}

          <TouchableOpacity
            style={s.iptal}
            onPress={() => { setModalAcik(false); formuSifirla(); }}
          >
            <Text style={[s.iptalText, { color: renkler.subtext }]}>Kapat</Text>
          </TouchableOpacity>
        </ScrollView>
        </KlavyeKapsa>
        <UyariKatmani />
      </Modal>
    </View>
  );
}

// Bir rol grubu (Yöneticiler / Çalışanlar): mevcut liste + e-postayla atama
function PersonelGrup({
  baslik, alt, liste, email, setEmail, ekleEtiket, onEkle, onCikar, kayit, renkler,
}: {
  baslik: string;
  alt: string;
  liste: PersonelSatir[];
  email: string;
  setEmail: (v: string) => void;
  ekleEtiket: string;
  onEkle: () => void;
  onCikar: (item: PersonelSatir) => void;
  kayit: boolean;
  renkler: any;
}) {
  return (
    <View style={[s.personelKutu, { borderColor: renkler.border }]}>
      <Text style={[s.personelBaslik, { color: renkler.text }]}>{baslik}</Text>
      <Text style={[s.personelAlt, { color: renkler.subtext }]}>{alt}</Text>

      {liste.length === 0 ? (
        <Text style={[s.personelBos, { color: renkler.subtext }]}>Henüz atanmadı</Text>
      ) : (
        liste.map(p => (
          <View key={p.id} style={[s.personelSatir, { borderColor: renkler.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[s.personelAd, { color: renkler.text }]}>
                {p.ad_soyad ?? '(isimsiz)'}
              </Text>
              <Text style={[s.personelMail, { color: renkler.subtext }]}>{p.email ?? '—'}</Text>
            </View>
            <TouchableOpacity onPress={() => onCikar(p)} disabled={kayit} style={s.cikarBtn}>
              <Text style={[s.cikarText, { color: renkler.danger }]}>Çıkar</Text>
            </TouchableOpacity>
          </View>
        ))
      )}

      <TextInput
        style={[s.input, { borderColor: renkler.border, backgroundColor: renkler.input, color: renkler.text, marginTop: 12 }]}
        placeholder="kullanici@email.com"
        placeholderTextColor={renkler.subtext}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email} onChangeText={setEmail}
      />
      <TouchableOpacity
        style={[s.ataBtn, { borderColor: renkler.primary }]}
        onPress={onEkle}
        disabled={kayit}
      >
        <Text style={[s.ataText, { color: renkler.primary }]}>{ekleEtiket}</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  bos: { textAlign: 'center', marginTop: 60, fontSize: 15 },
  kart: { margin: 12, marginBottom: 0, padding: 16, borderRadius: 12 },
  pasif: { opacity: 0.5 },
  ad: { fontSize: 16, fontWeight: '600' },
  adres: { fontSize: 13, marginTop: 4 },
  ekleBtn: { margin: 16, padding: 16, borderRadius: 12, alignItems: 'center' },
  ekleBtnText: { fontWeight: '700', fontSize: 16 },
  modal: { padding: 24, paddingBottom: 48 },
  modalBaslik: { fontSize: 22, fontWeight: 'bold', marginBottom: 24, marginTop: 8 },
  label: { fontSize: 14, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, padding: 13, fontSize: 16, marginBottom: 16 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  switchText: { fontSize: 15 },
  btn: { borderRadius: 10, padding: 16, alignItems: 'center', marginBottom: 12 },
  btnText: { fontSize: 16, fontWeight: '600' },
  // Personel grupları
  personelKutu: { borderWidth: 1, borderRadius: 12, padding: 16, marginTop: 12 },
  personelBaslik: { fontSize: 16, fontWeight: '700' },
  personelAlt: { fontSize: 12, marginTop: 2, marginBottom: 8 },
  personelBos: { fontSize: 13, fontStyle: 'italic', marginTop: 4 },
  personelSatir: {
    flexDirection: 'row', alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: 10, gap: 8,
  },
  personelAd: { fontSize: 15, fontWeight: '600' },
  personelMail: { fontSize: 12, marginTop: 1 },
  cikarBtn: { paddingVertical: 6, paddingHorizontal: 10 },
  cikarText: { fontSize: 13, fontWeight: '700' },
  ataBtn: { borderWidth: 1, borderRadius: 10, padding: 12, alignItems: 'center' },
  ataText: { fontWeight: '600' },
  iptal: { alignItems: 'center', padding: 12, marginTop: 8 },
  iptalText: {},
});
