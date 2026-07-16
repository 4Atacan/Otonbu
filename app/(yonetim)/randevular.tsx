import { uyari } from '../../src/lib/uyari';
import { UyariKatmani } from '../../src/components/UyariProvider';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert, Modal, RefreshControl, ScrollView,
  SectionList, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../src/lib/supabase';
import { useTheme } from '../../src/theme/ThemeContext';
import { useSession } from '../../src/hooks/useSession';
import { Appointment, MusaitSlot, RandevuDurum, YONETICI_ROLLER } from '../../src/types';
import IslerListesi from '../../src/components/IslerListesi';
import { Yukleniyor } from '../../src/components/Yukleniyor';

const DURUM_ETIKET: Record<RandevuDurum, string> = {
  beklemede: 'Beklemede',
  onayli: 'Onaylı',
  iptal: 'İptal',
};

const GUN_SAYISI = 14;
const IPTAL_SINIRI_DK = 60;  // randevu saatine bu kadar dakikadan az kala değişiklik kapanır

function gunler(): Date[] {
  return Array.from({ length: GUN_SAYISI }, (_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function dakikaKala(baslangic?: string | null): number | null {
  if (!baslangic) return null;
  return (new Date(baslangic).getTime() - Date.now()) / 60000;
}

// Randevuyu ait olduğu YEREL güne göre grupla (UTC kayması olmadan)
function gunKey(iso: string | null): string {
  if (!iso) return 'tarihsiz';
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Gün başlığı: Bugün/Yarın/Dün + tam tarih
function gunBasligi(key: string): string {
  if (key === 'tarihsiz') return 'Saat atanmadı';
  const d = new Date(`${key}T00:00:00`);
  const bugun = new Date(); bugun.setHours(0, 0, 0, 0);
  const fark = Math.round((d.getTime() - bugun.getTime()) / 86400000);
  const tam = d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' });
  if (fark === 0) return `Bugün · ${tam}`;
  if (fark === 1) return `Yarın · ${tam}`;
  if (fark === -1) return `Dün · ${tam}`;
  return tam;
}

export default function RandevularScreen() {
  const { renkler } = useTheme();
  const { profile } = useSession();
  // Şube personeli (yönetici + çalışan) hem randevuları hem işleri görür → iki sekmeli geçiş
  const isGoren = profile ? ['calisan', 'yonetici'].includes(profile.rol) : false;
  // Randevu YÖNETİMİ (onay/iptal/saat değişikliği) yalnızca yöneticide; çalışan
  // randevuyu yalnızca görür (RLS appt_branch_manage de bunu zorlar).
  const yonetebilir = profile ? YONETICI_ROLLER.includes(profile.rol) : false;
  const [gorunum, setGorunum] = useState<'randevular' | 'isler'>('randevular');
  // Panel'deki istatistik kartından gelindiğinde randevu listesine dön (sekme
  // "İşler" görünümünde kalmış olabilir). ts damgası her dokunuşta tetikler.
  const { odak, ts } = useLocalSearchParams<{ odak?: string; ts?: string }>();
  useEffect(() => {
    if (odak === 'randevular') setGorunum('randevular');
  }, [odak, ts]);
  const [randevular, setRandevular] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [yenileniyor, setYenileniyor] = useState(false);

  // Saat değiştirme talebi modalı
  const [degisRandevu, setDegisRandevu] = useState<Appointment | null>(null);
  const [degisGun, setDegisGun] = useState<Date>(gunler()[0]);
  const [degisSlotlar, setDegisSlotlar] = useState<MusaitSlot[]>([]);
  const [degisBaslangic, setDegisBaslangic] = useState<string | null>(null);
  const [degisYukleniyor, setDegisYukleniyor] = useState(false);
  const [gonderiliyor, setGonderiliyor] = useState(false);

  useFocusEffect(useCallback(() => { yukle(); }, []));

  async function yukle() {
    // RLS: personel şubesininkini, admin hepsini görür
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        users (ad_soyad, telefon),
        vehicles (plaka, marka, model),
        services (ad, sure_dk),
        appointment_changes ( id, tip, durum )
      `)
      .order('baslangic', { ascending: false, nullsFirst: false })
      .limit(100);
    if (error) uyari('Hata', error.message);
    else setRandevular((data as Appointment[]) ?? []);
    setLoading(false);
  }

  async function elleYenile() {
    setYenileniyor(true);
    await yukle();
    setYenileniyor(false);
  }

  // Beklemede randevuyu doğrudan onayla (değişiklik değil — ilk onay)
  function onaylaOnayi(r: Appointment) {
    uyari('Randevuyu Onayla', 'Randevu onaylanacak. Emin misin?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Onayla',
        onPress: async () => {
          const { error } = await supabase
            .from('appointments').update({ durum: 'onayli' }).eq('id', r.id);
          if (error) uyari('Hata', error.message);
          else yukle();
        },
      },
    ]);
  }

  // Yönetici doğrudan iptal/saat değiştiremez — müşteri onayına giden talep oluşturur
  async function talepGonder(r: Appointment, tip: 'iptal' | 'saat', yeniBaslangic?: string) {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('appointment_changes').insert({
      appointment_id: r.id,
      branch_id: r.branch_id,
      tip,
      yeni_baslangic: tip === 'saat' ? yeniBaslangic : null,
      olusturan: user?.id ?? null,
    });
    if (error) {
      // 23505 = tek bekleyen talep unique ihlali
      uyari('Gönderilemedi', error.code === '23505'
        ? 'Bu randevu için zaten bekleyen bir talep var.'
        : error.message);
      return false;
    }
    uyari('Talep gönderildi', 'Değişiklik isteği müşteriye iletildi, onayı bekleniyor.');
    yukle();
    return true;
  }

  function iptalTalebiOnayi(r: Appointment) {
    uyari(
      'İptal Talebi',
      'Bu randevunun iptali için müşteriye onay isteği gönderilecek. Onaylarsa randevu iptal olur.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'İstek Gönder', style: 'destructive', onPress: () => talepGonder(r, 'iptal') },
      ],
    );
  }

  function saatDegistirAc(r: Appointment) {
    setDegisRandevu(r);
    setDegisGun(gunler()[0]);
    setDegisBaslangic(null);
    setDegisSlotlar([]);
  }

  // Modal açıkken: hizmetin programına göre seçilen günün uygun saatlerini getir
  useEffect(() => {
    if (!degisRandevu) return;
    setDegisBaslangic(null);
    setDegisYukleniyor(true);
    const p_gun = `${degisGun.getFullYear()}-${String(degisGun.getMonth() + 1).padStart(2, '0')}-${String(degisGun.getDate()).padStart(2, '0')}`;
    let iptal = false;
    supabase
      .rpc('musait_slotlar', {
        p_branch_id: degisRandevu.branch_id,
        p_service_id: degisRandevu.service_id,
        p_gun,
      })
      .then(({ data, error }) => {
        if (iptal) return;
        if (error) uyari('Hata', error.message);
        else setDegisSlotlar((data as MusaitSlot[]) ?? []);
        setDegisYukleniyor(false);
      });
    return () => { iptal = true; };
  }, [degisRandevu, degisGun]);

  async function saatDegistirGonder() {
    if (!degisRandevu || !degisBaslangic) return;
    setGonderiliyor(true);
    const ok = await talepGonder(degisRandevu, 'saat', degisBaslangic);
    setGonderiliyor(false);
    if (ok) setDegisRandevu(null);
  }

  function durumRenk(durum: RandevuDurum): string {
    if (durum === 'onayli') return '#16a34a';
    if (durum === 'iptal') return renkler.danger;
    return '#d97706';
  }

  // Güne göre grupla: en yeni gün üstte; gün içinde saate göre artan
  const sections = useMemo(() => {
    const grup: Record<string, Appointment[]> = {};
    for (const r of randevular) {
      const k = gunKey(r.baslangic);
      (grup[k] ??= []).push(r);
    }
    return Object.keys(grup)
      .sort((a, b) => (a === 'tarihsiz' ? 1 : b === 'tarihsiz' ? -1 : b.localeCompare(a)))
      .map(k => ({
        title: k,
        data: grup[k].sort((a, b) => (a.baslangic ?? '').localeCompare(b.baslangic ?? '')),
      }));
  }, [randevular]);

  return (
    <View style={[s.container, { backgroundColor: renkler.bg }]}>
      {/* İki sekmeli geçiş: Bekleyen Randevular ↔ İşler (sahada çalışan roller) */}
      {isGoren && (
        <View style={[s.gecisRow, { borderColor: renkler.border }]}>
          {([
            { v: 'randevular', l: 'Randevular' },
            { v: 'isler', l: 'İşler' },
          ] as const).map(t => {
            const aktif = gorunum === t.v;
            return (
              <TouchableOpacity
                key={t.v}
                style={[s.gecisBtn, aktif && { backgroundColor: renkler.primary }]}
                onPress={() => setGorunum(t.v)}
              >
                <Text style={[s.gecisText, { color: aktif ? renkler.primaryText : renkler.subtext }]}>
                  {t.l}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {gorunum === 'isler' ? (
        <IslerListesi />
      ) : loading ? (
        <Yukleniyor />
      ) : (
      <SectionList
        sections={sections}
        keyExtractor={r => r.id}
        stickySectionHeadersEnabled={false}
        refreshControl={
          <RefreshControl refreshing={yenileniyor} onRefresh={elleYenile} />
        }
        contentContainerStyle={sections.length === 0 && s.bosContainer}
        ListEmptyComponent={
          <View style={s.bosKutu}>
            <Ionicons name="calendar-outline" size={48} color={renkler.subtext} />
            <Text style={[s.bosBaslik, { color: renkler.text }]}>Henüz randevu yok</Text>
            <Text style={[s.bosAlt, { color: renkler.subtext }]}>
              Müşteriler randevu aldıkça burada listelenecek.
            </Text>
          </View>
        }
        renderSectionHeader={({ section }) => (
          <Text style={[s.gunBaslik, { color: renkler.subtext, backgroundColor: renkler.bg }]}>
            {gunBasligi(section.title)}
          </Text>
        )}
        renderItem={({ item }) => {
          const slot = item.baslangic ? new Date(item.baslangic) : null;
          const kala = dakikaKala(item.baslangic);
          const sureyeUyar = kala === null || kala >= IPTAL_SINIRI_DK;
          const bekleyen = item.appointment_changes?.find(c => c.durum === 'beklemede');
          const degistirilebilir = item.durum !== 'iptal' && !bekleyen && sureyeUyar;
          return (
            <View style={[s.kart, { backgroundColor: renkler.card }]}>
              <View style={s.kartUst}>
                <Text style={[s.saat, { color: renkler.text }]}>
                  {slot
                    ? slot.toLocaleString('tr-TR', {
                        day: 'numeric', month: 'short',
                        hour: '2-digit', minute: '2-digit',
                      })
                    : 'Saat atanmadı'}
                </Text>
                <View style={[s.durumRozet, { backgroundColor: renkler.rozetBg }]}>
                  <Text style={[s.durumText, { color: durumRenk(item.durum) }]}>
                    {DURUM_ETIKET[item.durum]}
                  </Text>
                </View>
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
              <View style={s.odemeSatir}>
                <Ionicons
                  name={item.odeme_yontemi === 'online' ? 'card-outline' : 'storefront-outline'}
                  size={14}
                  color={renkler.subtext}
                />
                <Text style={[s.detay, { color: renkler.subtext }]}>
                  {item.odeme_yontemi === 'online' ? 'Online ödeme' : 'Şubede ödeme'}
                </Text>
              </View>

              {/* Bekleyen değişiklik talebi durumu */}
              {bekleyen && (
                <View style={[s.bilgiSatir, { borderColor: renkler.border }]}>
                  <Ionicons name="hourglass-outline" size={15} color={renkler.subtext} />
                  <Text style={[s.bilgiText, { color: renkler.subtext }]}>
                    {bekleyen.tip === 'iptal' ? 'İptal' : 'Saat değişikliği'} talebi gönderildi — müşteri onayı bekleniyor.
                  </Text>
                </View>
              )}

              {/* Randevu saatine 1 saatten az kala değişiklik kapalı */}
              {item.durum !== 'iptal' && !bekleyen && !sureyeUyar && (
                <Text style={[s.bilgiText, { color: renkler.subtext, marginTop: 10 }]}>
                  Randevu saatine 1 saatten az kaldığı için iptal/saat değişikliği kapandı.
                </Text>
              )}

              {yonetebilir && (
                <View style={s.eylemler}>
                  {item.durum === 'beklemede' && (
                    <TouchableOpacity
                      style={[s.eylemBtn, { borderColor: '#16a34a' }]}
                      onPress={() => onaylaOnayi(item)}
                    >
                      <Text style={[s.eylemText, { color: '#16a34a' }]}>Onayla</Text>
                    </TouchableOpacity>
                  )}
                  {degistirilebilir && (
                    <>
                      <TouchableOpacity
                        style={[s.eylemBtn, { borderColor: renkler.primary }]}
                        onPress={() => saatDegistirAc(item)}
                      >
                        <Text style={[s.eylemText, { color: renkler.primary }]}>Saati Değiştir</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[s.eylemBtn, { borderColor: renkler.danger }]}
                        onPress={() => iptalTalebiOnayi(item)}
                      >
                        <Text style={[s.eylemText, { color: renkler.danger }]}>İptal İste</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              )}
            </View>
          );
        }}
      />
      )}

      {/* Saat değiştirme talebi modalı */}
      <Modal visible={!!degisRandevu} animationType="slide" presentationStyle="pageSheet">
        <View style={{ flex: 1, backgroundColor: renkler.card }}>
          <ScrollView contentContainerStyle={s.modal}>
            <Text style={[s.modalBaslik, { color: renkler.text }]}>Yeni Saat Öner</Text>
            <Text style={[s.modalAlt, { color: renkler.subtext }]}>
              {degisRandevu?.services?.ad ?? 'Hizmet'} · {degisRandevu?.users?.ad_soyad ?? 'Müşteri'}
              {'\n'}Seçtiğin saat müşteriye onay isteği olarak gider.
            </Text>

            <Text style={[s.bolum, { color: renkler.subtext }]}>TARİH</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.gunSerit}>
              {gunler().map(g => {
                const aktif = g.getTime() === degisGun.getTime();
                return (
                  <TouchableOpacity
                    key={g.toISOString()}
                    style={[
                      s.gunBtn,
                      { backgroundColor: renkler.bg, borderColor: renkler.border },
                      aktif && { backgroundColor: renkler.primary, borderColor: renkler.primary },
                    ]}
                    onPress={() => setDegisGun(g)}
                  >
                    <Text style={[s.gunUst, { color: aktif ? renkler.primaryText : renkler.subtext }]}>
                      {g.toLocaleDateString('tr-TR', { weekday: 'short' })}
                    </Text>
                    <Text style={[s.gunAlt, { color: aktif ? renkler.primaryText : renkler.text }]}>
                      {g.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={[s.bolum, { color: renkler.subtext }]}>SAAT</Text>
            {degisYukleniyor ? (
              <ActivityIndicator color={renkler.primary} style={{ marginVertical: 16 }} />
            ) : degisSlotlar.length === 0 ? (
              <Text style={[s.modalAlt, { color: renkler.subtext }]}>
                Bu gün için tanımlı saat yok. Başka gün dene.
              </Text>
            ) : (
              <View style={s.slotGrid}>
                {degisSlotlar.map(sl => {
                  const dolu = sl.dolu >= sl.kapasite;
                  const aktif = degisBaslangic === sl.baslangic;
                  return (
                    <TouchableOpacity
                      key={sl.baslangic}
                      disabled={dolu}
                      style={[
                        s.slotBtn,
                        { backgroundColor: renkler.bg, borderColor: renkler.border },
                        aktif && { backgroundColor: renkler.primary, borderColor: renkler.primary },
                        dolu && { opacity: 0.4 },
                      ]}
                      onPress={() => setDegisBaslangic(sl.baslangic)}
                    >
                      <Text style={[s.slotText, { color: aktif ? renkler.primaryText : renkler.text }]}>
                        {new Date(sl.baslangic).toLocaleTimeString('tr-TR', {
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </Text>
                      {dolu && <Text style={[s.slotDolu, { color: renkler.subtext }]}>dolu</Text>}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </ScrollView>

          <View style={[s.modalAlt2, { borderColor: renkler.border }]}>
            <TouchableOpacity
              style={[s.gonderBtn, { backgroundColor: degisBaslangic ? renkler.primary : renkler.border }]}
              disabled={!degisBaslangic || gonderiliyor}
              onPress={saatDegistirGonder}
            >
              {gonderiliyor
                ? <ActivityIndicator color={renkler.primaryText} />
                : (
                  <Text style={[s.gonderText, { color: degisBaslangic ? renkler.primaryText : renkler.subtext }]}>
                    Onay İsteği Gönder
                  </Text>
                )}
            </TouchableOpacity>
            <TouchableOpacity style={s.iptalModal} onPress={() => setDegisRandevu(null)}>
              <Text style={[s.iptalModalText, { color: renkler.subtext }]}>Vazgeç</Text>
            </TouchableOpacity>
          </View>
        </View>
        <UyariKatmani />
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  gecisRow: {
    flexDirection: 'row', gap: 6, padding: 12, paddingBottom: 8,
  },
  gecisBtn: {
    flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: 'center',
  },
  gecisText: { fontSize: 14, fontWeight: '700' },
  bosContainer: { flexGrow: 1, justifyContent: 'center' },
  bosKutu: { alignItems: 'center', padding: 32 },
  bosBaslik: { fontSize: 17, fontWeight: '700', marginTop: 16 },
  bosAlt: { fontSize: 14, textAlign: 'center', marginTop: 6, lineHeight: 20 },
  gunBaslik: {
    fontSize: 13, fontWeight: '800', letterSpacing: 0.3,
    paddingHorizontal: 16, paddingTop: 18, paddingBottom: 4,
  },
  kart: { margin: 12, marginBottom: 0, padding: 16, borderRadius: 12 },
  kartUst: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 8,
  },
  saat: { fontSize: 16, fontWeight: '700' },
  durumRozet: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  durumText: { fontSize: 12, fontWeight: '700' },
  hizmet: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  detay: { fontSize: 14, marginTop: 2 },
  odemeSatir: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  bilgiSatir: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderRadius: 8, padding: 10, marginTop: 12,
  },
  bilgiText: { fontSize: 13, flex: 1, lineHeight: 18 },
  eylemler: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  eylemBtn: {
    borderWidth: 1, borderRadius: 8,
    paddingVertical: 8, paddingHorizontal: 16,
  },
  eylemText: { fontSize: 13, fontWeight: '600' },
  // Modal
  modal: { padding: 20, paddingBottom: 24 },
  modalBaslik: { fontSize: 20, fontWeight: '800', marginTop: 8 },
  modalAlt: { fontSize: 13, lineHeight: 19, marginTop: 6 },
  bolum: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginTop: 20, marginBottom: 8 },
  gunSerit: { gap: 8, paddingVertical: 2 },
  gunBtn: {
    borderWidth: 1, borderRadius: 10,
    paddingVertical: 8, paddingHorizontal: 14, alignItems: 'center',
  },
  gunUst: { fontSize: 12 },
  gunAlt: { fontSize: 14, fontWeight: '700', marginTop: 2 },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slotBtn: {
    borderWidth: 1, borderRadius: 10,
    paddingVertical: 10, paddingHorizontal: 14, alignItems: 'center', minWidth: 76,
  },
  slotText: { fontSize: 15, fontWeight: '600' },
  slotDolu: { fontSize: 10, marginTop: 1 },
  modalAlt2: { borderTopWidth: 1, padding: 16, paddingBottom: 28 },
  gonderBtn: { borderRadius: 12, padding: 16, alignItems: 'center' },
  gonderText: { fontSize: 16, fontWeight: '700' },
  iptalModal: { alignItems: 'center', padding: 12, marginTop: 4 },
  iptalModalText: { fontSize: 14 },
});
