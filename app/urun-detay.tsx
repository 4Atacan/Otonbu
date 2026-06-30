import { useEffect, useMemo, useState } from 'react';
import {
  Image, Modal, Pressable, ScrollView, StyleSheet, Text,
  TouchableOpacity, View,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../src/lib/supabase';
import { useTheme } from '../src/theme/ThemeContext';
import { useSepet } from '../src/context/SepetContext';
import { Product } from '../src/types';
import { tl, urunGorselUrl } from '../src/lib/urun';
import { indirimliFiyat } from '../src/lib/kampanya';
import { Yukleniyor } from '../src/components/Yukleniyor';

export default function UrunDetayScreen() {
  const { urunId } = useLocalSearchParams<{ urunId: string }>();
  const { renkler } = useTheme();
  const sepet = useSepet();

  const [urun, setUrun] = useState<Product | null>(null);
  const [kampInd, setKampInd] = useState(0);   // bu ürüne bağlı aktif kampanya indirimi %
  const [loading, setLoading] = useState(true);
  const [fotoBuyuk, setFotoBuyuk] = useState(false);  // tam ekran foto

  useEffect(() => {
    if (!urunId) { setLoading(false); return; }
    supabase
      .from('products')
      .select('*')
      .eq('id', urunId)
      .maybeSingle()
      .then(({ data }) => {
        setUrun((data as Product) ?? null);
        setLoading(false);
      });
    // Kampanya indirimi (tek doğruluk kaynağı SQL kampanya_indirim; sunucu zorlar).
    supabase.rpc('kampanya_indirim', { p_hizmet: null, p_urun: urunId })
      .then(({ data }) => setKampInd(Number(data ?? 0)));
  }, [urunId]);

  const headerOpts = useMemo(() => ({
    title: urun?.ad ?? 'Ürün',
    headerShown: true,
    headerStyle: { backgroundColor: renkler.card },
    headerTitleStyle: { color: renkler.text },
    headerTintColor: renkler.primary,
    headerShadowVisible: false,
  }), [urun?.ad, renkler]);

  const uri = urun ? urunGorselUrl(urun.gorsel) : null;
  const adet = urun ? sepet.adet(urun.id) : 0;
  const tukendi = !!urun && urun.stok <= 0;
  const netFiyat = urun ? indirimliFiyat(urun.fiyat, kampInd) : 0;

  return (
    <>
      <Stack.Screen options={headerOpts} />
      <View style={[s.container, { backgroundColor: renkler.bg }]}>
        {loading ? (
          <Yukleniyor />
        ) : !urun ? (
          <View style={s.ortala}>
            <Text style={[s.bos, { color: renkler.subtext }]}>Ürün bulunamadı.</Text>
          </View>
        ) : (
          <>
            <ScrollView contentContainerStyle={s.icerik}>
              {/* Kapak — dokun → tam ekran büyüt */}
              <Pressable onPress={() => uri && setFotoBuyuk(true)}>
                {uri ? (
                  <Image source={{ uri }} style={s.gorsel} resizeMode="cover" />
                ) : (
                  <View style={[s.gorsel, s.gorselBos, { backgroundColor: renkler.card }]}>
                    <Ionicons name="cube-outline" size={56} color={renkler.subtext} />
                  </View>
                )}
                {uri && (
                  <View style={s.buyutRozet}>
                    <Ionicons name="expand" size={16} color="#fff" />
                  </View>
                )}
              </Pressable>

              <View style={s.govde}>
                {urun.kategori ? (
                  <Text style={[s.kategori, { color: renkler.subtext }]}>
                    {urun.kategori.toLocaleUpperCase('tr-TR')}
                  </Text>
                ) : null}
                <Text style={[s.ad, { color: renkler.text }]}>{urun.ad}</Text>

                <View style={[s.fiyatKutu, { backgroundColor: renkler.card }]}>
                  <Text style={[s.fiyatLabel, { color: renkler.subtext }]}>Fiyat</Text>
                  {kampInd > 0 ? (
                    <View style={s.fiyatSatir}>
                      <Text style={[s.fiyatEski, { color: renkler.subtext }]}>{tl(urun.fiyat)}</Text>
                      <Text style={[s.fiyat, { color: renkler.primary }]}>{tl(netFiyat)}</Text>
                      <View style={s.indirimRozet}>
                        <Text style={s.indirimRozetText}>%{kampInd} indirim</Text>
                      </View>
                    </View>
                  ) : (
                    <Text style={[s.fiyat, { color: renkler.primary }]}>{tl(urun.fiyat)}</Text>
                  )}
                  <View style={s.altBilgiRow}>
                    <View style={s.altBilgi}>
                      <Ionicons
                        name={tukendi ? 'close-circle' : 'checkmark-circle'}
                        size={15}
                        color={tukendi ? renkler.danger : '#16a34a'}
                      />
                      <Text style={[s.altBilgiText, { color: tukendi ? renkler.danger : renkler.subtext }]}>
                        {tukendi ? 'Tükendi' : `Stokta ${urun.stok} adet`}
                      </Text>
                    </View>
                    {urun.puan > 0 && (
                      <View style={s.altBilgi}>
                        <Ionicons name="star" size={15} color="#f59e0b" />
                        <Text style={[s.altBilgiText, { color: renkler.subtext }]}>
                          {urun.puan} puan kazan
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                <Text style={[s.baslik, { color: renkler.text }]}>Ürün açıklaması</Text>
                <Text style={[s.aciklama, { color: renkler.subtext }]}>
                  {urun.aciklama?.trim()
                    ? urun.aciklama
                    : 'Bu ürün için henüz açıklama eklenmedi.'}
                </Text>
              </View>
            </ScrollView>

            {/* Alt bar: sepete ekle / adet ayarla */}
            <View style={[s.altBar, { backgroundColor: renkler.card, borderColor: renkler.border }]}>
              {tukendi ? (
                <View style={[s.tukenmisBtn, { backgroundColor: renkler.rozetBg }]}>
                  <Text style={[s.tukenmisText, { color: renkler.danger }]}>Tükendi</Text>
                </View>
              ) : adet === 0 ? (
                <TouchableOpacity
                  style={[s.ekleBtn, { backgroundColor: renkler.primary }]}
                  onPress={() => sepet.ekle(urun, 1)}
                >
                  <Ionicons name="bag-add" size={20} color={renkler.primaryText} />
                  <Text style={[s.ekleText, { color: renkler.primaryText }]}>Sepete Ekle</Text>
                </TouchableOpacity>
              ) : (
                <View style={s.adetBar}>
                  <TouchableOpacity
                    style={[s.adetBtn, { borderColor: renkler.primary }]}
                    onPress={() => sepet.ekle(urun, -1)}
                  >
                    <Ionicons name="remove" size={20} color={renkler.primary} />
                  </TouchableOpacity>
                  <View style={s.adetOrta}>
                    <Text style={[s.adetSayi, { color: renkler.text }]}>{adet}</Text>
                    <Text style={[s.adetAlt, { color: renkler.subtext }]}>sepette</Text>
                  </View>
                  <TouchableOpacity
                    style={[s.adetBtn, { borderColor: renkler.primary }, adet >= urun.stok && s.adetBtnPasif]}
                    disabled={adet >= urun.stok}
                    onPress={() => sepet.ekle(urun, 1)}
                  >
                    <Ionicons name="add" size={20} color={renkler.primary} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </>
        )}
      </View>

      {/* Tam ekran foto görüntüleyici */}
      <Modal visible={fotoBuyuk} transparent animationType="fade" onRequestClose={() => setFotoBuyuk(false)}>
        <Pressable style={s.tamEkran} onPress={() => setFotoBuyuk(false)}>
          {uri && <Image source={{ uri }} style={s.tamEkranFoto} resizeMode="contain" />}
          <View style={s.kapatRozet}>
            <Ionicons name="close" size={26} color="#fff" />
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  ortala: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  bos: { fontSize: 15 },
  icerik: { paddingBottom: 24 },
  gorsel: { width: '100%', height: 300 },
  gorselBos: { alignItems: 'center', justifyContent: 'center' },
  buyutRozet: {
    position: 'absolute', right: 12, bottom: 12,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center',
  },
  govde: { padding: 16 },
  kategori: { fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  ad: { fontSize: 24, fontWeight: '800', marginTop: 4 },
  fiyatKutu: { borderRadius: 12, padding: 16, marginTop: 16 },
  fiyatLabel: { fontSize: 13 },
  fiyatSatir: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2, flexWrap: 'wrap' },
  fiyatEski: { fontSize: 16, fontWeight: '600', textDecorationLine: 'line-through' },
  indirimRozet: { backgroundColor: '#dc2626', borderRadius: 6, paddingVertical: 2, paddingHorizontal: 8 },
  indirimRozetText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  fiyat: { fontSize: 22, fontWeight: '800', marginTop: 2 },
  altBilgiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 12 },
  altBilgi: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  altBilgiText: { fontSize: 13, fontWeight: '600' },
  baslik: { fontSize: 17, fontWeight: '700', marginTop: 24, marginBottom: 8 },
  aciklama: { fontSize: 15, lineHeight: 23 },
  altBar: { borderTopWidth: 1, padding: 16, paddingBottom: 28 },
  ekleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 12, padding: 16,
  },
  ekleText: { fontSize: 16, fontWeight: '700' },
  tukenmisBtn: { borderRadius: 12, padding: 16, alignItems: 'center' },
  tukenmisText: { fontSize: 16, fontWeight: '700' },
  adetBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  adetBtn: { borderWidth: 1.5, borderRadius: 12, width: 52, height: 48, alignItems: 'center', justifyContent: 'center' },
  adetBtnPasif: { opacity: 0.4 },
  adetOrta: { alignItems: 'center' },
  adetSayi: { fontSize: 22, fontWeight: '800' },
  adetAlt: { fontSize: 12, marginTop: -2 },
  tamEkran: { flex: 1, backgroundColor: 'rgba(0,0,0,0.94)', alignItems: 'center', justifyContent: 'center' },
  tamEkranFoto: { width: '100%', height: '80%' },
  kapatRozet: {
    position: 'absolute', top: 48, right: 20,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center',
  },
});
