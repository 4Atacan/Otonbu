import { uyari } from '../../src/lib/uyari';
import { UyariKatmani } from '../../src/components/UyariProvider';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Modal, ScrollView,
  StyleSheet, Switch, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../src/lib/supabase';
import { useSession } from '../../src/hooks/useSession';
import { useTheme } from '../../src/theme/ThemeContext';
import { Plan, PlanHak, PlanKademe, Service } from '../../src/types';
import { KlavyeKapsa } from '../../src/components/KlavyeKapsa';
import { Yukleniyor } from '../../src/components/Yukleniyor';

const KADEMELER: { deger: PlanKademe; etiket: string }[] = [
  { deger: 'temel', etiket: 'Temel' },
  { deger: 'orta', etiket: 'Orta' },
  { deger: 'ust', etiket: 'Üst' },
];

// Boş plan formu
function bosForm() {
  return { ad: '', kademe: 'temel' as PlanKademe, aylik_ucret: '', aciklama: '', aktif: true };
}

export default function PaketlerScreen() {
  const { profile } = useSession();
  const { renkler } = useTheme();

  const [planlar, setPlanlar] = useState<Plan[]>([]);
  const [hizmetler, setHizmetler] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  // Düzenleme modalı
  const [modalAcik, setModalAcik] = useState(false);
  const [duzenlenen, setDuzenlenen] = useState<Plan | null>(null);  // null = yeni
  const [form, setForm] = useState(bosForm());
  const [kaydediliyor, setKaydediliyor] = useState(false);

  // Hak ekleme
  const [yeniHakService, setYeniHakService] = useState<string | null>(null);
  const [yeniHakAdet, setYeniHakAdet] = useState('1');

  useFocusEffect(useCallback(() => { yukle(); }, []));

  async function yukle() {
    const [planRes, hizmetRes] = await Promise.all([
      supabase
        .from('plans')
        .select('*, plan_haklari ( id, plan_id, aylik_adet, service_id, services ( ad ) )')
        .order('aylik_ucret'),
      supabase.from('services').select('id, ad').eq('aktif', true).order('ad'),
    ]);
    setPlanlar((planRes.data as Plan[]) ?? []);
    setHizmetler((hizmetRes.data as Service[]) ?? []);
    setLoading(false);
  }

  function yeniPaket() {
    setDuzenlenen(null);
    setForm(bosForm());
    setYeniHakService(null);
    setYeniHakAdet('1');
    setModalAcik(true);
  }

  function paketiDuzenle(plan: Plan) {
    setDuzenlenen(plan);
    setForm({
      ad: plan.ad,
      kademe: plan.kademe,
      aylik_ucret: String(plan.aylik_ucret),
      aciklama: plan.aciklama ?? '',
      aktif: plan.aktif,
    });
    setYeniHakService(null);
    setYeniHakAdet('1');
    setModalAcik(true);
  }

  async function planiKaydet() {
    const ucret = Number(form.aylik_ucret.replace(',', '.'));
    if (!form.ad.trim()) { uyari('Eksik', 'Paket adı gir.'); return; }
    if (!Number.isFinite(ucret) || ucret < 0) { uyari('Hatalı', 'Geçerli bir aylık ücret gir.'); return; }

    setKaydediliyor(true);
    const govde = {
      ad: form.ad.trim(),
      kademe: form.kademe,
      aylik_ucret: ucret,
      aciklama: form.aciklama.trim() || null,
      aktif: form.aktif,
    };

    let hata;
    if (duzenlenen) {
      ({ error: hata } = await supabase.from('plans').update(govde).eq('id', duzenlenen.id));
    } else {
      const { data, error } = await supabase.from('plans').insert(govde).select('*').single();
      hata = error;
      // Yeni planda hak eklemek için modalı düzenleme moduna geçir
      if (!error && data) setDuzenlenen(data as Plan);
    }
    setKaydediliyor(false);
    if (hata) { uyari('Hata', hata.message); return; }
    await yukle();
    if (duzenlenen) setModalAcik(false);
    else uyari('Kaydedildi', 'Paket oluşturuldu. Şimdi aylık hakları ekleyebilirsin.');
  }

  async function hakEkle() {
    if (!duzenlenen) { uyari('Önce kaydet', 'Hak eklemek için paketi kaydet.'); return; }
    if (!yeniHakService) { uyari('Hizmet seç', 'Hangi hizmet için hak vereceğini seç.'); return; }
    const adet = Number(yeniHakAdet);
    if (!Number.isInteger(adet) || adet < 1) { uyari('Hatalı', 'Adet en az 1 olmalı.'); return; }

    const { error } = await supabase.from('plan_haklari').insert({
      plan_id: duzenlenen.id,
      service_id: yeniHakService,
      aylik_adet: adet,
    });
    if (error) { uyari('Hata', error.message); return; }
    setYeniHakService(null);
    setYeniHakAdet('1');
    await yukleVeModaliTazele();
  }

  async function hakSil(hak: PlanHak) {
    const { error } = await supabase.from('plan_haklari').delete().eq('id', hak.id);
    if (error) { uyari('Hata', error.message); return; }
    await yukleVeModaliTazele();
  }

  // Modal açıkken hak listesi değişince, düzenlenen plan referansını tazele
  async function yukleVeModaliTazele() {
    const { data } = await supabase
      .from('plans')
      .select('*, plan_haklari ( id, plan_id, aylik_adet, service_id, services ( ad ) )')
      .order('aylik_ucret');
    const liste = (data as Plan[]) ?? [];
    setPlanlar(liste);
    if (duzenlenen) {
      const guncel = liste.find(p => p.id === duzenlenen.id);
      if (guncel) setDuzenlenen(guncel);
    }
  }

  if (profile && profile.rol !== 'admin') {
    return (
      <View style={[s.merkez, { backgroundColor: renkler.bg }]}>
        <Text style={{ color: renkler.subtext }}>Bu ekran yalnızca yöneticiye açıktır.</Text>
      </View>
    );
  }

  if (loading) return <Yukleniyor />;

  const modalHaklari = duzenlenen?.plan_haklari ?? [];
  const eklenebilirHizmetler = hizmetler.filter(
    h => !modalHaklari.some(mh => mh.service_id === h.id),
  );

  return (
    <View style={[s.container, { backgroundColor: renkler.bg }]}>
      <FlatList
        data={planlar}
        keyExtractor={p => p.id}
        contentContainerStyle={s.liste}
        ListHeaderComponent={
          <TouchableOpacity
            style={[s.yeniBtn, { backgroundColor: renkler.primary }]}
            onPress={yeniPaket}
          >
            <Ionicons name="add" size={20} color={renkler.primaryText} />
            <Text style={[s.yeniBtnText, { color: renkler.primaryText }]}>Yeni Paket</Text>
          </TouchableOpacity>
        }
        ListEmptyComponent={
          <Text style={[s.bos, { color: renkler.subtext }]}>Henüz paket yok.</Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[s.kart, { backgroundColor: renkler.card, borderColor: renkler.border }]}
            onPress={() => paketiDuzenle(item)}
          >
            <View style={s.kartUst}>
              <View style={{ flex: 1 }}>
                <Text style={[s.kartAd, { color: renkler.text }]}>
                  {item.ad}
                  {!item.aktif && <Text style={{ color: renkler.danger }}>  (pasif)</Text>}
                </Text>
                <Text style={[s.kartAlt, { color: renkler.subtext }]}>
                  {KADEMELER.find(k => k.deger === item.kademe)?.etiket} ·{' '}
                  {item.aylik_ucret.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}/ay
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={renkler.subtext} />
            </View>
            <View style={s.kartHaklar}>
              {(item.plan_haklari ?? []).length === 0 ? (
                <Text style={[s.kartHakBos, { color: renkler.danger }]}>
                  ⚠ Hak tanımlı değil — müşteri bu paketten yararlanamaz
                </Text>
              ) : (
                (item.plan_haklari ?? []).map(h => (
                  <Text key={h.id} style={[s.kartHak, { color: renkler.subtext }]}>
                    • Ayda {h.aylik_adet} × {h.services?.ad ?? 'Hizmet'}
                  </Text>
                ))
              )}
            </View>
          </TouchableOpacity>
        )}
      />

      {/* Düzenleme / oluşturma modalı */}
      <Modal visible={modalAcik} animationType="slide" onRequestClose={() => setModalAcik(false)}>
        <View style={[s.modal, { backgroundColor: renkler.bg }]}>
          <View style={[s.modalBaslikSatir, { borderColor: renkler.border }]}>
            <Text style={[s.modalBaslik, { color: renkler.text }]}>
              {duzenlenen ? 'Paketi Düzenle' : 'Yeni Paket'}
            </Text>
            <TouchableOpacity onPress={() => setModalAcik(false)}>
              <Ionicons name="close" size={26} color={renkler.text} />
            </TouchableOpacity>
          </View>

          <KlavyeKapsa>
          <ScrollView contentContainerStyle={s.modalIcerik} keyboardShouldPersistTaps="handled">
            <Text style={[s.etiket, { color: renkler.subtext }]}>PAKET ADI</Text>
            <TextInput
              style={[s.input, { backgroundColor: renkler.card, color: renkler.text, borderColor: renkler.border }]}
              value={form.ad}
              onChangeText={t => setForm(f => ({ ...f, ad: t }))}
              placeholder="Örn. Aylık Bakım"
              placeholderTextColor={renkler.subtext}
            />

            <Text style={[s.etiket, { color: renkler.subtext }]}>KADEME</Text>
            <View style={s.kademeSatir}>
              {KADEMELER.map(k => {
                const aktif = form.kademe === k.deger;
                return (
                  <TouchableOpacity
                    key={k.deger}
                    style={[
                      s.kademeBtn,
                      { backgroundColor: aktif ? renkler.primary : renkler.card, borderColor: aktif ? renkler.primary : renkler.border },
                    ]}
                    onPress={() => setForm(f => ({ ...f, kademe: k.deger }))}
                  >
                    <Text style={{ color: aktif ? renkler.primaryText : renkler.text, fontWeight: '600' }}>
                      {k.etiket}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[s.etiket, { color: renkler.subtext }]}>AYLIK ÜCRET (₺)</Text>
            <TextInput
              style={[s.input, { backgroundColor: renkler.card, color: renkler.text, borderColor: renkler.border }]}
              value={form.aylik_ucret}
              onChangeText={t => setForm(f => ({ ...f, aylik_ucret: t }))}
              placeholder="299"
              placeholderTextColor={renkler.subtext}
              keyboardType="decimal-pad"
            />

            <Text style={[s.etiket, { color: renkler.subtext }]}>AÇIKLAMA</Text>
            <TextInput
              style={[s.input, s.cokSatir, { backgroundColor: renkler.card, color: renkler.text, borderColor: renkler.border }]}
              value={form.aciklama}
              onChangeText={t => setForm(f => ({ ...f, aciklama: t }))}
              placeholder="Paket neleri kapsıyor?"
              placeholderTextColor={renkler.subtext}
              multiline
            />

            <View style={s.aktifSatir}>
              <Text style={[s.etiket, { color: renkler.subtext, marginTop: 0 }]}>SATIŞTA (aktif)</Text>
              <Switch
                value={form.aktif}
                onValueChange={v => setForm(f => ({ ...f, aktif: v }))}
                trackColor={{ true: renkler.primary }}
              />
            </View>

            <TouchableOpacity
              style={[s.kaydetBtn, { backgroundColor: renkler.primary }]}
              disabled={kaydediliyor}
              onPress={planiKaydet}
            >
              {kaydediliyor ? (
                <ActivityIndicator color={renkler.primaryText} />
              ) : (
                <Text style={[s.kaydetText, { color: renkler.primaryText }]}>
                  {duzenlenen ? 'Değişiklikleri Kaydet' : 'Paketi Oluştur'}
                </Text>
              )}
            </TouchableOpacity>

            {/* Aylık haklar — yalnız kaydedilmiş planda */}
            <Text style={[s.bolumBaslik, { color: renkler.text }]}>Aylık Haklar</Text>
            {!duzenlenen ? (
              <Text style={[s.ipucu, { color: renkler.subtext }]}>
                Hak eklemek için önce paketi oluştur.
              </Text>
            ) : (
              <>
                {modalHaklari.length === 0 ? (
                  <Text style={[s.ipucu, { color: renkler.subtext }]}>Henüz hak yok.</Text>
                ) : (
                  modalHaklari.map(h => (
                    <View key={h.id} style={[s.hakSatir, { backgroundColor: renkler.card, borderColor: renkler.border }]}>
                      <Text style={[s.hakMetin, { color: renkler.text }]}>
                        Ayda {h.aylik_adet} × {h.services?.ad ?? 'Hizmet'}
                      </Text>
                      <TouchableOpacity onPress={() => hakSil(h)}>
                        <Ionicons name="trash-outline" size={20} color={renkler.danger} />
                      </TouchableOpacity>
                    </View>
                  ))
                )}

                {/* Yeni hak ekle */}
                {eklenebilirHizmetler.length > 0 && (
                  <View style={[s.hakEkleKutu, { borderColor: renkler.border }]}>
                    <Text style={[s.etiket, { color: renkler.subtext, marginTop: 0 }]}>HİZMET</Text>
                    <View style={s.hizmetSecimSarmal}>
                      {eklenebilirHizmetler.map(h => {
                        const aktif = yeniHakService === h.id;
                        return (
                          <TouchableOpacity
                            key={h.id}
                            style={[
                              s.hizmetCip,
                              { backgroundColor: aktif ? renkler.primary : renkler.card, borderColor: aktif ? renkler.primary : renkler.border },
                            ]}
                            onPress={() => setYeniHakService(h.id)}
                          >
                            <Text style={{ color: aktif ? renkler.primaryText : renkler.text, fontSize: 13 }}>
                              {h.ad}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    <View style={s.adetSatir}>
                      <Text style={[s.etiket, { color: renkler.subtext, marginTop: 0 }]}>AYLIK ADET</Text>
                      <TextInput
                        style={[s.adetInput, { backgroundColor: renkler.card, color: renkler.text, borderColor: renkler.border }]}
                        value={yeniHakAdet}
                        onChangeText={setYeniHakAdet}
                        keyboardType="number-pad"
                      />
                      <TouchableOpacity
                        style={[s.hakEkleBtn, { backgroundColor: renkler.primary }]}
                        onPress={hakEkle}
                      >
                        <Ionicons name="add" size={18} color={renkler.primaryText} />
                        <Text style={{ color: renkler.primaryText, fontWeight: '700' }}>Ekle</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </>
            )}
          </ScrollView>
          </KlavyeKapsa>
        </View>
        <UyariKatmani />
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  merkez: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  liste: { padding: 12 },
  yeniBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderRadius: 10, padding: 13, marginBottom: 12,
  },
  yeniBtnText: { fontSize: 15, fontWeight: '700' },
  bos: { textAlign: 'center', marginTop: 32, fontSize: 14 },
  kart: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 10 },
  kartUst: { flexDirection: 'row', alignItems: 'center' },
  kartAd: { fontSize: 16, fontWeight: '700' },
  kartAlt: { fontSize: 13, marginTop: 2 },
  kartHaklar: { marginTop: 10, gap: 3 },
  kartHak: { fontSize: 13 },
  kartHakBos: { fontSize: 12, fontWeight: '600' },
  modal: { flex: 1 },
  modalBaslikSatir: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderBottomWidth: 1,
  },
  modalBaslik: { fontSize: 18, fontWeight: '800' },
  modalIcerik: { padding: 16, paddingBottom: 40 },
  etiket: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginTop: 16, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 15 },
  cokSatir: { minHeight: 80, textAlignVertical: 'top' },
  kademeSatir: { flexDirection: 'row', gap: 8 },
  kademeBtn: { flex: 1, borderWidth: 1.5, borderRadius: 10, padding: 12, alignItems: 'center' },
  aktifSatir: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 },
  kaydetBtn: { borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 20 },
  kaydetText: { fontSize: 15, fontWeight: '700' },
  bolumBaslik: { fontSize: 16, fontWeight: '800', marginTop: 28, marginBottom: 8 },
  ipucu: { fontSize: 13, lineHeight: 19 },
  hakSatir: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 8,
  },
  hakMetin: { fontSize: 14, flex: 1 },
  hakEkleKutu: { borderWidth: 1, borderRadius: 10, padding: 12, marginTop: 8 },
  hizmetSecimSarmal: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  hizmetCip: { borderWidth: 1, borderRadius: 16, paddingVertical: 7, paddingHorizontal: 12 },
  adetSatir: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  adetInput: { borderWidth: 1, borderRadius: 10, padding: 10, fontSize: 15, width: 70, textAlign: 'center' },
  hakEkleBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 10, paddingVertical: 10, paddingHorizontal: 16, marginLeft: 'auto',
  },
});
