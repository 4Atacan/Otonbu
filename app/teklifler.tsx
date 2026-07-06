import { uyari } from '../src/lib/uyari';
import { useCallback, useState } from 'react';
import {
  Alert, FlatList, Linking, RefreshControl, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { Redirect, Stack, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../src/lib/supabase';
import { privateUrl } from '../src/lib/storage';
import { useSession } from '../src/hooks/useSession';
import { useTheme } from '../src/theme/ThemeContext';
import { InsuranceRequest, SigortaDurum } from '../src/types';
import { Yukleniyor } from '../src/components/Yukleniyor';

const DURUM_ETIKET: Record<SigortaDurum, string> = {
  yeni: 'Yeni',
  arandi: 'Arandı',
  teklif_verildi: 'Teklif verildi',
  kapandi: 'Kapandı',
};

const SONRAKI: Partial<Record<SigortaDurum, SigortaDurum>> = {
  yeni: 'arandi',
  arandi: 'teklif_verildi',
  teklif_verildi: 'kapandi',
};

export default function TekliflerScreen() {
  const { profile } = useSession();
  const { renkler } = useTheme();
  const [talepler, setTalepler] = useState<InsuranceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [yenileniyor, setYenileniyor] = useState(false);

  const headerOpts = {
    title: 'Sigorta Teklifleri',
    headerShown: true,
    headerStyle: { backgroundColor: renkler.card },
    headerTitleStyle: { color: renkler.text },
    headerTintColor: renkler.primary,
    headerShadowVisible: false,
  };

  useFocusEffect(useCallback(() => { yukle(); }, [profile?.id]));

  async function yukle() {
    const { data, error } = await supabase
      .from('insurance_requests')
      .select('*, branches ( ad )')
      .eq('silindi_mi', false)
      .order('created_at', { ascending: false });
    if (error) uyari('Hata', error.message);
    else setTalepler((data as InsuranceRequest[]) ?? []);
    setLoading(false);
  }

  async function elleYenile() {
    setYenileniyor(true);
    await yukle();
    setYenileniyor(false);
  }

  async function durumGuncelle(t: InsuranceRequest, yeni: SigortaDurum) {
    const { error } = await supabase
      .from('insurance_requests').update({ durum: yeni }).eq('id', t.id);
    if (error) uyari('Hata', error.message);
    else yukle();
  }

  // Ruhsat private bucket'ta — kısa ömürlü presigned URL üretip aç (CLAUDE.md kural 6)
  async function ruhsatiGor(yol: string) {
    try {
      const url = await privateUrl('vehicle-docs', yol);
      if (!url) { uyari('Hata', 'Ruhsat açılamadı'); return; }
      Linking.openURL(url);
    } catch (e: any) {
      uyari('Hata', e?.message ?? 'Ruhsat açılamadı');
    }
  }

  function durumRenk(d: SigortaDurum): string {
    if (d === 'kapandi') return '#16a34a';
    if (d === 'teklif_verildi') return '#2563eb';
    if (d === 'arandi') return '#d97706';
    return renkler.primary;
  }

  if (profile && !['admin', 'yonetici'].includes(profile.rol)) {
    return <Redirect href="/(main)" />;
  }

  if (loading) return (<><Stack.Screen options={headerOpts} /><Yukleniyor /></>);

  return (
    <View style={[s.container, { backgroundColor: renkler.bg }]}>
      <Stack.Screen options={headerOpts} />
      <FlatList
        data={talepler}
        keyExtractor={t => t.id}
        refreshControl={<RefreshControl refreshing={yenileniyor} onRefresh={elleYenile} />}
        contentContainerStyle={talepler.length === 0 && s.bosContainer}
        ListEmptyComponent={
          <View style={s.bosKutu}>
            <Ionicons name="shield-outline" size={44} color={renkler.subtext} />
            <Text style={[s.bosBaslik, { color: renkler.text }]}>Teklif talebi yok</Text>
            <Text style={[s.bosAlt, { color: renkler.subtext }]}>
              Müşteriler sigorta sekmesinden talep bıraktıkça burada görünür.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const sonraki = SONRAKI[item.durum];
          return (
            <View style={[s.kart, { backgroundColor: renkler.card }]}>
              <View style={s.kartUst}>
                <Text style={[s.tip, { color: renkler.text }]}>
                  {item.tip === 'kasko' ? 'Kasko' : 'Trafik'} teklifi
                </Text>
                <View style={[s.rozet, { backgroundColor: renkler.rozetBg }]}>
                  <Text style={[s.rozetText, { color: durumRenk(item.durum) }]}>
                    {DURUM_ETIKET[item.durum]}
                  </Text>
                </View>
              </View>

              <Text style={[s.tarih, { color: renkler.subtext }]}>
                {new Date(item.created_at).toLocaleString('tr-TR', {
                  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                })}
                {item.branches?.ad ? `  ·  ${item.branches.ad}` : ''}
              </Text>

              <View style={s.bilgiSatir}>
                <Ionicons name="person-outline" size={16} color={renkler.subtext} />
                <Text style={[s.bilgi, { color: renkler.text }]}>{item.ad_soyad ?? '—'}</Text>
              </View>
              {item.telefon ? (
                <TouchableOpacity style={s.bilgiSatir} onPress={() => Linking.openURL(`tel:${item.telefon}`)}>
                  <Ionicons name="call-outline" size={16} color={renkler.primary} />
                  <Text style={[s.bilgi, { color: renkler.primary }]}>{item.telefon}</Text>
                </TouchableOpacity>
              ) : null}
              {(item.plaka || item.arac_detay) && (
                <View style={s.bilgiSatir}>
                  <Ionicons name="car-outline" size={16} color={renkler.subtext} />
                  <Text style={[s.bilgi, { color: renkler.text }]}>
                    {[item.plaka, item.arac_detay].filter(Boolean).join(' · ')}
                  </Text>
                </View>
              )}
              {item.ruhsat_url ? (
                <TouchableOpacity
                  style={[s.ruhsatBtn, { borderColor: renkler.primary }]}
                  onPress={() => ruhsatiGor(item.ruhsat_url!)}
                >
                  <Ionicons name="document-text-outline" size={16} color={renkler.primary} />
                  <Text style={[s.ruhsatText, { color: renkler.primary }]}>Ruhsatı Gör</Text>
                </TouchableOpacity>
              ) : null}
              {item.musteri_not ? (
                <Text style={[s.not, { color: renkler.subtext }]}>Not: {item.musteri_not}</Text>
              ) : null}

              <Text style={[s.kvkk, { color: renkler.subtext }]}>
                {item.kvkk_riza_at ? '✓ Açık rıza alındı' : '⚠ Rıza kaydı yok'}
                {item.ticari_ileti_izni ? '  ·  ✓ Ticari ileti izni' : ''}
              </Text>

              {item.durum !== 'kapandi' && sonraki && (
                <TouchableOpacity
                  style={[s.ileriBtn, { backgroundColor: renkler.primary }]}
                  onPress={() => durumGuncelle(item, sonraki)}
                >
                  <Text style={[s.ileriBtnText, { color: renkler.primaryText }]}>
                    {DURUM_ETIKET[sonraki]} olarak işaretle
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          );
        }}
      />
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
  kartUst: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tip: { fontSize: 16, fontWeight: '700' },
  rozet: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  rozetText: { fontSize: 12, fontWeight: '700' },
  tarih: { fontSize: 13, marginTop: 4, marginBottom: 8 },
  bilgiSatir: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  bilgi: { fontSize: 14 },
  ruhsatBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    borderWidth: 1, borderRadius: 8, paddingVertical: 7, paddingHorizontal: 12, marginTop: 10,
  },
  ruhsatText: { fontSize: 13, fontWeight: '700' },
  not: { fontSize: 13, marginTop: 8, lineHeight: 18 },
  kvkk: { fontSize: 12, marginTop: 10 },
  ileriBtn: { borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 14 },
  ileriBtnText: { fontSize: 14, fontWeight: '700' },
});
