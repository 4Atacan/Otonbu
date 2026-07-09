import { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Dimensions,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../src/lib/supabase';
import { useTheme, Renkler } from '../../src/theme/ThemeContext';
import { useSession } from '../../src/hooks/useSession';
import {
  Campaign, Subscription, Entitlement, Product, Service,
} from '../../src/types';
import { tl, urunGorselUrl } from '../../src/lib/urun';
import { ABONELIK_AKTIF } from '../../src/lib/abonelik';
import { fiyatMetni, gorselUrl as hizmetGorselUrl } from '../../src/lib/hizmet';
import { OtonbuArac } from '../../src/components/OtonbuArac';
import { KampanyaKart } from '../../src/components/KampanyaKart';
import { Yukleniyor } from '../../src/components/Yukleniyor';

const SCREEN = Dimensions.get('window').width;
const BANNER_GEN = SCREEN - 32;  // 16px kenar boşluğu
// Kalıcı sigorta & kasko banner'ı (kampanya değil; hep durur, sigorta sekmesine götürür)
const SIGORTA_BANNER = require('../../assets/sigorta-banner.png');
// Starbucks tarzı koyu marka hero'su: yükseklik + beyaz sayfanın örttüğü pay +
// arka plandaki OTONBU GARAGE filigranı (beyaza boyanıp soluklaştırılır).
const HERO_H = 220;
const HERO_OVERLAP = 30;
const WORDMARK = require('../../assets/otonbu-garage-light.png');

// Bu ayın ilk günü (entitlements.donem ile eşleşir)
function buDonem(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function selamlama(): string {
  const s = new Date().getHours();
  if (s < 6) return 'İyi geceler';
  if (s < 12) return 'Günaydın';
  if (s < 18) return 'İyi günler';
  return 'İyi akşamlar';
}

// Bölüm başlığı: küçük aksan çubuğu + başlık + opsiyonel "Tümü ›" aksiyonu
function Baslik({
  title, renkler, action, onAction,
}: {
  title: string; renkler: Renkler; action?: string; onAction?: () => void;
}) {
  return (
    <View style={s.baslikRow}>
      <View style={[s.baslikBar, { backgroundColor: renkler.accent }]} />
      <Text style={[s.baslik, { color: renkler.text }]}>{title}</Text>
      {action && (
        <TouchableOpacity style={s.baslikAction} onPress={onAction} hitSlop={8}>
          <Text style={[s.baslikActionText, { color: renkler.primary }]}>{action}</Text>
          <Ionicons name="chevron-forward" size={14} color={renkler.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function AnaSayfa() {
  const { renkler } = useTheme();
  const { session, profile } = useSession();
  const router = useRouter();

  const [kampanyalar, setKampanyalar] = useState<Campaign[]>([]);
  const [abonelikler, setAbonelikler] = useState<Subscription[]>([]);
  const [haklar, setHaklar] = useState<Entitlement[]>([]);
  const [urunler, setUrunler] = useState<Product[]>([]);
  const [hizmetler, setHizmetler] = useState<Service[]>([]);
  const [puan, setPuan] = useState(0);
  const [kampIdx, setKampIdx] = useState(0);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    let iptal = false;
    const uid = session?.user?.id;
    const bugun = new Date().toISOString().slice(0, 10);
    const donem = buDonem();

    Promise.all([
      supabase.from('campaigns').select('*').eq('aktif', true)
        .or(`bitis.is.null,bitis.gte.${bugun}`).order('created_at', { ascending: false }),
      supabase.from('products').select('*').eq('aktif', true).eq('silindi_mi', false)
        .order('one_cikan', { ascending: false }).order('satis_adedi', { ascending: false }).limit(8),
      supabase.from('services').select('*').eq('aktif', true).order('ad'),
      uid
        ? supabase.from('subscriptions').select('*, plans ( ad, kademe ), branches ( ad )')
            .eq('user_id', uid).eq('durum', 'aktif')
        : Promise.resolve({ data: [] as Subscription[] }),
      uid
        ? supabase.from('entitlements').select('*, services ( ad )')
            .eq('donem', donem).gt('kalan_adet', 0)
        : Promise.resolve({ data: [] as Entitlement[] }),
      uid
        ? supabase.from('loyalty_ledger').select('puan_degisim').eq('user_id', uid)
        : Promise.resolve({ data: [] as { puan_degisim: number }[] }),
    ]).then(([kampRes, urunRes, hizmetRes, subRes, hakRes, puanRes]) => {
      if (iptal) return;
      setKampanyalar((kampRes.data as Campaign[]) ?? []);
      setUrunler((urunRes.data as Product[]) ?? []);
      // Hızlı randevu: en çok randevu alınan hizmetler sabit sırada başta gelir
      // (iç dış yıkama → dış yıkama → iç yıkama → seramik → pasta → ppf), sonra
      // yıldız kampanyalılar, en çok 8 tanesi. Eşleşme hizmet adına göre yapılır.
      const oncelik = (ad: string): number => {
        const t = ad.toLocaleLowerCase('tr-TR');
        if (t.includes('iç') && t.includes('dış')) return 0; // iç dış yıkama
        if (t.includes('dış')) return 1;                     // dış yıkama
        if (t.includes('iç')) return 2;                      // iç yıkama
        if (t.includes('seramik')) return 3;
        if (t.includes('pasta')) return 4;
        if (t.includes('ppf')) return 5;
        return 99;
      };
      const hepsi = (hizmetRes.data as Service[]) ?? [];
      const sirali = [...hepsi].sort((a, b) => {
        const fark = oncelik(a.ad) - oncelik(b.ad);
        if (fark !== 0) return fark;
        // Aynı öncelikte: yıldız kampanyalılar önde, sonra alfabetik.
        const yildiz = Number(b.kampanya_tip === 'yildiz') - Number(a.kampanya_tip === 'yildiz');
        return yildiz !== 0 ? yildiz : a.ad.localeCompare(b.ad, 'tr');
      });
      setHizmetler(sirali.slice(0, 8));
      setAbonelikler((subRes.data as Subscription[]) ?? []);
      setHaklar((hakRes.data as Entitlement[]) ?? []);
      setPuan(((puanRes.data as { puan_degisim: number }[]) ?? [])
        .reduce((a, r) => a + r.puan_degisim, 0));
      setLoading(false);
    });

    return () => { iptal = true; };
  }, [session?.user?.id]));

  if (loading) return <Yukleniyor />;

  const ilkAd = profile?.ad_soyad?.trim().split(' ')[0];
  const aktifAbonelik = abonelikler[0];
  const toplamHak = haklar.reduce((a, h) => a + h.kalan_adet, 0);

  return (
    <View style={[s.container, { backgroundColor: renkler.bg }]}>
      {/* Koyu marka hero (SABİT arkada): arka planda OTONBU GARAGE filigranı,
          solda puan bakiyesi, sağda dönen amblem üstünde Togg. Beyaz içerik
          sayfası bunun üstünden kayar (Starbucks düzeni). */}
      <View style={[s.hero, { backgroundColor: renkler.primary }]}>
        <Image source={WORDMARK} style={s.heroFiligran} resizeMode="contain" />
        <Text style={s.heroSelam}>
          {selamlama()}{ilkAd ? `, ${ilkAd}` : ''} 👋
        </Text>
        <View style={s.heroRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.heroLabel}>Otonbu Puanı</Text>
            <Text style={s.heroSayi}>{puan}</Text>
            <Text style={s.heroAlt}>Hizmet ve ürünlerden kazan</Text>
          </View>
          <OtonbuArac boyut={140} />
        </View>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollIcerik}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero'yu görünür bırakan şeffaf boşluk; beyaz sayfa bunun altından başlar */}
        <View style={{ height: HERO_H - HERO_OVERLAP }} />
        <View style={[s.sheet, { backgroundColor: renkler.bg }]}>

        {/* Abonelik / haklar kartı (Starbucks "yıldız" karşılığı).
            Ödeme sistemi (iyzico) hazır olana kadar gizli — ABONELIK_AKTIF. */}
        {ABONELIK_AKTIF && (
        <TouchableOpacity
          activeOpacity={0.9}
          style={[s.odul, { backgroundColor: renkler.primary }]}
          onPress={() => router.push('/abonelik')}
        >
          {/* Hero'daki OTONBU GARAGE wordmark'ı burada da soluk filigran olarak */}
          <Image source={WORDMARK} style={s.odulFiligran} resizeMode="contain" />
          <View style={{ flex: 1 }}>
            {aktifAbonelik ? (
              <>
                <Text style={s.odulUst}>ABONELİĞİN</Text>
                <Text style={s.odulBaslik}>{aktifAbonelik.plans?.ad ?? 'Paket'}</Text>
                <Text style={s.odulAlt}>
                  {toplamHak > 0
                    ? `Bu ay ${toplamHak} hakkın var · kullanmaya başla`
                    : 'Bu ayın hakları tükendi · detaylar'}
                </Text>
              </>
            ) : (
              <>
                <Text style={s.odulUst}>OTONBU PAKETLER</Text>
                <Text style={s.odulBaslik}>Aboneliğe geç, kazan</Text>
                <Text style={s.odulAlt}>Aylık bakım haklarıyla her ay tasarruf et</Text>
              </>
            )}
          </View>
          <View style={s.odulPill}>
            <Ionicons name="chevron-forward" size={20} color={renkler.primary} />
          </View>
        </TouchableOpacity>
        )}

        {/* Hızlı işlemler */}
        <Baslik title="Hızlı İşlemler" renkler={renkler} />
        <View style={s.hizliRow}>
          {([
            { ad: 'Randevularım', ikon: 'calendar', yol: '/randevularim' },
            { ad: 'Araçlarım', ikon: 'car-sport', yol: '/araclar' },
            { ad: 'Mağaza', ikon: 'bag-handle', yol: '/magaza' },
            { ad: 'Sigorta', ikon: 'shield-checkmark', yol: '/sigorta' },
          ] as const).map(q => (
            <TouchableOpacity
              key={q.yol}
              style={s.hizliTile}
              activeOpacity={0.7}
              onPress={() => router.push(q.yol)}
            >
              <View style={[s.hizliIkon, { backgroundColor: renkler.rozetBg }]}>
                <Ionicons name={q.ikon} size={24} color={renkler.primary} />
              </View>
              <Text style={[s.hizliAd, { color: renkler.text }]} numberOfLines={1}>{q.ad}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Öne çıkan hizmetler — kampanyaların ÜSTÜNDE (katalog Hizmetler sekmesinde) */}
        {hizmetler.length > 0 && (
          <>
            <Baslik
              title="Hızlı Randevu"
              renkler={renkler}
              action="Tümü"
              onAction={() => router.push('/hizmetler')}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.urunSerit}
            >
              {hizmetler.map(h => {
                const uri = hizmetGorselUrl(h.gorsel);
                const yildiz = h.kampanya_tip === 'yildiz';
                return (
                  <TouchableOpacity
                    key={h.id}
                    style={[s.hizKart, { backgroundColor: renkler.card }]}
                    activeOpacity={0.85}
                    onPress={() => router.push({ pathname: '/hizmet-detay', params: { serviceId: h.id } })}
                  >
                    {uri ? (
                      <Image source={{ uri }} style={s.hizGorsel} resizeMode="cover" />
                    ) : (
                      <View style={[s.hizGorsel, s.urunGorselBos, { backgroundColor: renkler.rozetBg }]}>
                        <Ionicons name="car-sport-outline" size={28} color={renkler.subtext} />
                      </View>
                    )}
                    {yildiz && (
                      <View style={[s.urunRozet, { backgroundColor: '#f59e0b' }]}>
                        <Text style={[s.urunRozetText, { color: '#fff' }]}>Öne çıkan</Text>
                      </View>
                    )}
                    <Text style={[s.urunAd, { color: renkler.text }]} numberOfLines={2}>{h.ad}</Text>
                    {h.teklif_usulu ? (
                      <View style={s.teklifChip}>
                        <Ionicons name="chatbubble-ellipses-outline" size={13} color={renkler.accent} />
                        <Text style={[s.urunFiyat, { color: renkler.accent }]}>Teklif al</Text>
                      </View>
                    ) : (
                      <Text style={[s.urunFiyat, { color: renkler.primary }]}>{fiyatMetni(h)}</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </>
        )}

        {/* Tüm hizmetleri keşfet → Hizmetler sekmesi */}
        <TouchableOpacity
          activeOpacity={0.85}
          style={[s.kesfetKart, { backgroundColor: renkler.card, marginTop: hizmetler.length > 0 ? 14 : 0 }]}
          onPress={() => router.push('/hizmetler')}
        >
          <View style={[s.kesfetIkon, { backgroundColor: renkler.rozetBg }]}>
            <Ionicons name="car-sport" size={26} color={renkler.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.kesfetBaslik, { color: renkler.text }]}>Tüm hizmetleri keşfet</Text>
            <Text style={[s.kesfetAlt, { color: renkler.subtext }]}>
              Yıkama, kaplama, detailing ve daha fazlası
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={renkler.subtext} />
        </TouchableOpacity>

        {/* Kampanya banner'ı (büyük) — öne çıkan hizmetlerin altında */}
        {kampanyalar.length > 0 && (
          <>
            <Baslik
              title="Kampanyalar"
              renkler={renkler}
              action="Tümü"
              onAction={() => router.push('/kampanyalar')}
            />
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={e =>
                setKampIdx(Math.round(e.nativeEvent.contentOffset.x / SCREEN))}
            >
              {kampanyalar.map((k, i) => (
                <View key={k.id} style={{ width: SCREEN, paddingHorizontal: 16 }}>
                  <KampanyaKart
                    kampanya={k}
                    renkler={renkler}
                    genislik={BANNER_GEN}
                    renkIdx={i}
                    onPress={() => router.push('/kampanyalar')}
                  />
                </View>
              ))}
            </ScrollView>
            {kampanyalar.length > 1 && (
              <View style={s.noktalar}>
                {kampanyalar.map((_, i) => (
                  <View
                    key={i}
                    style={[
                      s.nokta,
                      { backgroundColor: i === kampIdx ? renkler.primary : renkler.border },
                      i === kampIdx && s.noktaAktif,
                    ]}
                  />
                ))}
              </View>
            )}
          </>
        )}

        {/* Mağazadan öne çıkanlar — kampanyalardan sonra */}
        {urunler.length > 0 && (
          <>
            <Baslik
              title="Mağazadan Öne Çıkanlar"
              renkler={renkler}
              action="Tümü"
              onAction={() => router.push('/magaza')}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.urunSerit}
            >
              {urunler.map(p => {
                const uri = urunGorselUrl(p.gorsel);
                return (
                  <TouchableOpacity
                    key={p.id}
                    style={[s.urunKart, { backgroundColor: renkler.card }]}
                    activeOpacity={0.85}
                    onPress={() => router.push('/magaza')}
                  >
                    {uri ? (
                      <Image source={{ uri }} style={s.urunGorsel} resizeMode="cover" />
                    ) : (
                      <View style={[s.urunGorsel, s.urunGorselBos, { backgroundColor: renkler.rozetBg }]}>
                        <Ionicons name="cube-outline" size={26} color={renkler.subtext} />
                      </View>
                    )}
                    {p.one_cikan && (
                      <View style={[s.urunRozet, { backgroundColor: renkler.primary }]}>
                        <Text style={[s.urunRozetText, { color: renkler.primaryText }]}>Çok satan</Text>
                      </View>
                    )}
                    <Text style={[s.urunAd, { color: renkler.text }]} numberOfLines={2}>{p.ad}</Text>
                    <Text style={[s.urunFiyat, { color: renkler.primary }]}>{tl(p.fiyat)}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </>
        )}

        {/* Sigorta & Kasko — kalıcı banner (kampanya değil), sigorta sekmesine götürür */}
        <TouchableOpacity
          activeOpacity={0.9}
          style={s.sigortaBanner}
          onPress={() => router.push('/sigorta')}
        >
          <Image source={SIGORTA_BANNER} style={s.sigortaGorsel} resizeMode="cover" />
        </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },

  // Koyu marka hero (sabit arkada)
  hero: {
    position: 'absolute', top: 0, left: 0, right: 0, height: HERO_H,
    paddingHorizontal: 18, paddingTop: 10, overflow: 'hidden',
  },
  heroFiligran: {
    position: 'absolute', right: -SCREEN * 0.16, top: -12,
    width: SCREEN * 0.95, height: HERO_H + 40,
    opacity: 0.14,
  },
  heroSelam: { color: '#ffffff', fontSize: 16, fontWeight: '700', opacity: 0.95 },
  heroRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  heroLabel: { color: '#ffffff', fontSize: 13, fontWeight: '600', opacity: 0.9 },
  heroSayi: { color: '#ffffff', fontSize: 46, fontWeight: '900', lineHeight: 52, marginTop: 2 },
  heroAlt: { color: '#ffffff', fontSize: 12, opacity: 0.85, marginTop: 3 },

  // Beyaz içerik sayfası — hero'nun üstüne binen yuvarlak köşeli panel
  scroll: { flex: 1, backgroundColor: 'transparent' },
  scrollIcerik: {},
  sheet: {
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingTop: 12, paddingBottom: 28, minHeight: 500,
  },

  // Abonelik / haklar kartı
  odul: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: 16, marginTop: 12,
    borderRadius: 18, padding: 18, overflow: 'hidden',
  },
  odulFiligran: {
    position: 'absolute', right: -24, bottom: -14,
    width: 190, height: 74, opacity: 0.15,
  },
  odulUst: { color: '#fff', fontSize: 11, fontWeight: '700', letterSpacing: 1, opacity: 0.85 },
  odulBaslik: { color: '#fff', fontSize: 20, fontWeight: '800', marginTop: 3 },
  odulAlt: { color: '#fff', fontSize: 13, marginTop: 4, opacity: 0.92 },
  odulPill: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },

  // Bölüm başlığı
  baslikRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, marginTop: 24, marginBottom: 12,
  },
  baslikBar: { width: 4, height: 18, borderRadius: 2 },
  baslik: { fontSize: 18, fontWeight: '800', flex: 1 },
  baslikAction: { flexDirection: 'row', alignItems: 'center', gap: 1 },
  baslikActionText: { fontSize: 14, fontWeight: '700' },

  // Kampanya banner pager noktaları
  noktalar: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 12 },
  nokta: { width: 7, height: 7, borderRadius: 4 },
  noktaAktif: { width: 18 },

  // Hızlı işlemler
  hizliRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16 },
  hizliTile: { alignItems: 'center', width: '23%' },
  hizliIkon: {
    width: 58, height: 58, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center', marginBottom: 7,
  },
  hizliAd: { fontSize: 12, fontWeight: '600' },

  // Mağaza öne çıkanlar
  urunSerit: { paddingHorizontal: 16, gap: 12 },
  urunKart: { width: 136, borderRadius: 14, padding: 8 },
  urunGorsel: { width: '100%', height: 100, borderRadius: 10, marginBottom: 8 },
  urunGorselBos: { alignItems: 'center', justifyContent: 'center' },
  urunRozet: {
    position: 'absolute', top: 14, left: 14,
    borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
  },
  urunRozetText: { fontSize: 10, fontWeight: '700' },
  urunAd: { fontSize: 13, fontWeight: '600', minHeight: 34 },
  urunFiyat: { fontSize: 15, fontWeight: '800', marginTop: 2 },
  teklifChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },

  // Öne çıkan hizmet kartı (16:9 geniş kapak, yatay şerit)
  hizKart: { width: 220, borderRadius: 14, padding: 8 },
  hizGorsel: { width: '100%', aspectRatio: 16 / 9, borderRadius: 10, marginBottom: 8 },

  // Kalıcı sigorta & kasko banner'ı — kampanya kartıyla birebir aynı ölçü:
  // 1:1 kare, tam genişlik (BANNER_GEN), borderRadius 20. cover → 1:1 kırpar.
  sigortaBanner: {
    alignSelf: 'center', width: BANNER_GEN, height: BANNER_GEN,
    marginTop: 24, borderRadius: 20, overflow: 'hidden',
  },
  sigortaGorsel: { width: '100%', height: '100%' },

  // Hizmetleri keşfet kartı (katalog Hizmetler sekmesinde)
  kesfetKart: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: 16, borderRadius: 16, padding: 14,
  },
  kesfetIkon: {
    width: 50, height: 50, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  kesfetBaslik: { fontSize: 16, fontWeight: '700' },
  kesfetAlt: { fontSize: 13, marginTop: 2 },
});
