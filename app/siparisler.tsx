import { uyari } from '../src/lib/uyari';
import { useCallback, useState } from 'react';
import {
  Alert, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { Redirect, Stack, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../src/lib/supabase';
import { useSession } from '../src/hooks/useSession';
import { useTheme } from '../src/theme/ThemeContext';
import { Order, SiparisDurum } from '../src/types';
import { tl } from '../src/lib/urun';
import { Yukleniyor } from '../src/components/Yukleniyor';

const DURUM_ETIKET: Record<SiparisDurum, string> = {
  talep: 'Talep',
  hazirlaniyor: 'Hazırlanıyor',
  hazir: 'Hazır',
  teslim: 'Teslim edildi',
  iptal: 'İptal',
};

// Bir durumdan sonra geçilebilecek durum (ileri adım)
const SONRAKI: Partial<Record<SiparisDurum, SiparisDurum>> = {
  talep: 'hazirlaniyor',
  hazirlaniyor: 'hazir',
  hazir: 'teslim',
};

export default function SiparislerScreen() {
  const { profile } = useSession();
  const { renkler } = useTheme();
  const [siparisler, setSiparisler] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [yenileniyor, setYenileniyor] = useState(false);

  const headerOpts = {
    title: 'Siparişler',
    headerShown: true,
    headerStyle: { backgroundColor: renkler.card },
    headerTitleStyle: { color: renkler.text },
    headerTintColor: renkler.primary,
    headerShadowVisible: false,
  };

  useFocusEffect(useCallback(() => { yukle(); }, [profile?.id]));

  async function yukle() {
    // RLS şube personelini kendi şubesiyle sınırlar; admin hepsini görür.
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items ( id, ad, adet, birim_fiyat ),
        branches ( ad ),
        users ( ad_soyad, telefon )
      `)
      .eq('silindi_mi', false)
      .order('created_at', { ascending: false });
    if (error) uyari('Hata', error.message);
    else setSiparisler((data as Order[]) ?? []);
    setLoading(false);
  }

  async function elleYenile() {
    setYenileniyor(true);
    await yukle();
    setYenileniyor(false);
  }

  async function durumGuncelle(o: Order, yeni: SiparisDurum) {
    const { error } = await supabase.from('orders').update({ durum: yeni }).eq('id', o.id);
    if (error) uyari('Hata', error.message);
    else yukle();
  }

  function iptalOnayi(o: Order) {
    uyari('Siparişi İptal Et', 'Bu sipariş talebini iptal etmek istediğine emin misin?', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'İptal Et', style: 'destructive', onPress: () => durumGuncelle(o, 'iptal') },
    ]);
  }

  function durumRenk(d: SiparisDurum): string {
    if (d === 'teslim') return '#16a34a';
    if (d === 'iptal') return renkler.danger;
    if (d === 'hazir') return '#2563eb';
    return '#d97706';
  }

  if (profile && !['admin', 'yonetici'].includes(profile.rol)) {
    return <Redirect href="/(main)" />;
  }

  if (loading) return (<><Stack.Screen options={headerOpts} /><Yukleniyor /></>);

  return (
    <View style={[s.container, { backgroundColor: renkler.bg }]}>
      <Stack.Screen options={headerOpts} />
      <FlatList
        data={siparisler}
        keyExtractor={o => o.id}
        refreshControl={<RefreshControl refreshing={yenileniyor} onRefresh={elleYenile} />}
        contentContainerStyle={siparisler.length === 0 && s.bosContainer}
        ListEmptyComponent={
          <View style={s.bosKutu}>
            <Ionicons name="receipt-outline" size={44} color={renkler.subtext} />
            <Text style={[s.bosBaslik, { color: renkler.text }]}>Sipariş yok</Text>
            <Text style={[s.bosAlt, { color: renkler.subtext }]}>
              Müşteriler mağazadan sipariş verdikçe burada görünür.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const sonraki = SONRAKI[item.durum];
          const acikMi = item.durum !== 'iptal' && item.durum !== 'teslim';
          return (
            <View style={[s.kart, { backgroundColor: renkler.card }]}>
              <View style={s.kartUst}>
                <Text style={[s.tarih, { color: renkler.text }]}>
                  {new Date(item.created_at).toLocaleString('tr-TR', {
                    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                  })}
                </Text>
                <View style={[s.rozet, { backgroundColor: renkler.rozetBg }]}>
                  <Text style={[s.rozetText, { color: durumRenk(item.durum) }]}>
                    {DURUM_ETIKET[item.durum]}
                  </Text>
                </View>
              </View>

              <Text style={[s.musteri, { color: renkler.text }]}>
                {item.users?.ad_soyad ?? 'Müşteri'}
                {item.users?.telefon ? `  ·  ${item.users.telefon}` : ''}
              </Text>
              {item.branches?.ad ? (
                <Text style={[s.sube, { color: renkler.subtext }]}>{item.branches.ad}</Text>
              ) : null}
              {item.appointment_id ? (
                <Text style={[s.randevuRozet, { color: renkler.primary }]}>🔧 Randevuyla birlikte</Text>
              ) : null}

              <View style={[s.kalemKutu, { borderColor: renkler.border }]}>
                {(item.order_items ?? []).map(k => (
                  <View key={k.id} style={s.kalemSatir}>
                    <Text style={[s.kalemAd, { color: renkler.text }]}>{k.adet}× {k.ad}</Text>
                    <Text style={[s.kalemFiyat, { color: renkler.subtext }]}>{tl(k.birim_fiyat * k.adet)}</Text>
                  </View>
                ))}
              </View>

              {item.musteri_not ? (
                <Text style={[s.not, { color: renkler.subtext }]}>Not: {item.musteri_not}</Text>
              ) : null}

              <View style={s.altSatir}>
                <Text style={[s.toplam, { color: renkler.primary }]}>{tl(item.toplam)}</Text>
                {acikMi && (
                  <View style={s.eylemler}>
                    <TouchableOpacity
                      style={[s.iptalBtn, { borderColor: renkler.danger }]}
                      onPress={() => iptalOnayi(item)}
                    >
                      <Text style={[s.iptalBtnText, { color: renkler.danger }]}>İptal</Text>
                    </TouchableOpacity>
                    {sonraki && (
                      <TouchableOpacity
                        style={[s.ileriBtn, { backgroundColor: renkler.primary }]}
                        onPress={() => durumGuncelle(item, sonraki)}
                      >
                        <Text style={[s.ileriBtnText, { color: renkler.primaryText }]}>
                          {DURUM_ETIKET[sonraki]}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
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
  kartUst: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  tarih: { fontSize: 14, fontWeight: '700' },
  rozet: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  rozetText: { fontSize: 12, fontWeight: '700' },
  musteri: { fontSize: 15, fontWeight: '600' },
  sube: { fontSize: 13, marginTop: 2 },
  randevuRozet: { fontSize: 13, fontWeight: '600', marginTop: 4 },
  kalemKutu: { borderWidth: 1, borderRadius: 10, padding: 12, marginTop: 12, gap: 6 },
  kalemSatir: { flexDirection: 'row', justifyContent: 'space-between' },
  kalemAd: { fontSize: 14, flex: 1 },
  kalemFiyat: { fontSize: 14 },
  not: { fontSize: 13, marginTop: 10, lineHeight: 18 },
  altSatir: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 },
  toplam: { fontSize: 20, fontWeight: '800' },
  eylemler: { flexDirection: 'row', gap: 10 },
  iptalBtn: { borderWidth: 1, borderRadius: 8, paddingVertical: 9, paddingHorizontal: 14 },
  iptalBtnText: { fontSize: 13, fontWeight: '600' },
  ileriBtn: { borderRadius: 8, paddingVertical: 9, paddingHorizontal: 16 },
  ileriBtnText: { fontSize: 13, fontWeight: '700' },
});
