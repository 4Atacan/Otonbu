import { uyari } from '../src/lib/uyari';
import { UyariKatmani } from '../src/components/UyariProvider';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Image, ScrollView, StyleSheet,
  Text, TouchableOpacity, View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../src/lib/supabase';
import { useSession } from '../src/hooks/useSession';
import { useTheme } from '../src/theme/ThemeContext';
import { Branch, FiyatSonuc, MusaitSlot, OdemeYontemi, Product, Vehicle } from '../src/types';
import { cinsLabel } from '../src/data/arac-katalogu';
import { tl, urunGorselUrl } from '../src/lib/urun';
import { Yukleniyor } from '../src/components/Yukleniyor';
import { PuanLogo } from '../src/components/PuanLogo';

const GUN_SAYISI = 14;

function gunler(): Date[] {
  return Array.from({ length: GUN_SAYISI }, (_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + i);
    return d;
  });
}

export default function RandevuAlScreen() {
  const { serviceId, serviceAd } = useLocalSearchParams<{
    serviceId: string; serviceAd: string;
  }>();
  const { session } = useSession();
  const { renkler } = useTheme();
  const router = useRouter();

  const [subeler, setSubeler] = useState<Branch[]>([]);
  const [araclar, setAraclar] = useState<Vehicle[]>([]);
  const [ilkYukleme, setIlkYukleme] = useState(true);

  const [subeId, setSubeId] = useState<string | null>(null);
  const [aracId, setAracId] = useState<string | null>(null);
  const [gun, setGun] = useState<Date>(gunler()[0]);
  const [secilenBaslangic, setSecilenBaslangic] = useState<string | null>(null);

  const [slotlar, setSlotlar] = useState<MusaitSlot[]>([]);
  const [slotYukleniyor, setSlotYukleniyor] = useState(false);

  const [fiyat, setFiyat] = useState<FiyatSonuc | null>(null);
  const [fiyatYukleniyor, setFiyatYukleniyor] = useState(false);

  const [gonderiliyor, setGonderiliyor] = useState(false);

  // Abonelik hakkı: seçili şube + hizmet + dönem için kalan hak adedi
  const [hakKalan, setHakKalan] = useState(0);
  const [hakKullan, setHakKullan] = useState(false);

  // Ödeme yöntemi: 'subede' (varsayılan), 'puan' (puanla al) — 'online' iyzico ile açılacak.
  const [odemeYontemi, setOdemeYontemi] = useState<OdemeYontemi>('subede');

  // Puanla alım: hizmetin puan bedeli + kullanıcının puan bakiyesi
  const [puanBedeli, setPuanBedeli] = useState(0);
  const [puanBakiye, setPuanBakiye] = useState(0);
  // Bu hizmet tamamlanınca kazandıracağı sadakat puanı (bilgilendirme)
  const [puanKazanc, setPuanKazanc] = useState(0);
  // Hizmete bağlı aktif 'puan' kampanyaları — bonus, sunucudaki puan_ver_job ile
  // aynı kuralla (şube: null=tümü / seçili şube, tarih aralığı, en yüksek bonus)
  // seçili şubeye göre hesaplanır; gösterim gerçek kazançla aynı kalsın diye.
  const [puanKampanyalar, setPuanKampanyalar] = useState<
    { branch_id: string | null; bonus_puan: number | null; baslangic: string | null; bitis: string | null }[]
  >([]);

  // Seçili şubenin çok satan ürünleri + randevuyla birlikte sepete eklenenler
  const [urunler, setUrunler] = useState<Product[]>([]);
  const [urunSepet, setUrunSepet] = useState<Record<string, number>>({});

  // Temalı modal başlığı (üst navigator kök Stack).
  // useMemo şart: her render'da yeni nesne olursa <Stack.Screen options>
  // navigation.setOptions'ı sürekli tetikler → sonsuz render döngüsü
  // ("Maximum update depth exceeded").
  const headerOpts = useMemo(() => ({
    title: serviceAd ?? 'Randevu Al',
    headerShown: true,
    headerStyle: { backgroundColor: renkler.card },
    headerTitleStyle: { color: renkler.text },
    headerTintColor: renkler.primary,
    headerShadowVisible: false,
  }), [serviceAd, renkler]);

  // İlk veri: aktif şubeler + yalnızca giriş yapan müşterinin araçları.
  // RLS zaten izole eder; ayrıca açıkça user_id ile filtreliyoruz ki başka
  // hesabın aracı asla listeye düşmesin (savunma derinliği — araclar.tsx ile aynı).
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const [subeRes, aracRes] = await Promise.all([
        supabase.from('branches').select('*').eq('aktif', true).order('ad'),
        user
          ? supabase.from('vehicles').select('*').eq('user_id', user.id)
              .eq('silindi_mi', false)
              .order('created_at', { ascending: false })
          : Promise.resolve({ data: [] as Vehicle[] }),
      ]);
      const sb = (subeRes.data as Branch[]) ?? [];
      const ar = (aracRes.data as Vehicle[]) ?? [];
      setSubeler(sb);
      setAraclar(ar);
      if (sb.length === 1) setSubeId(sb[0].id);
      if (ar.length === 1) setAracId(ar[0].id);
      setIlkYukleme(false);
    })();
  }, []);

  // Uygun saatler: şube + hizmet + gün seçilince programdan türetilir
  // (RPC RLS'i aşar, yalnızca agregat doluluk döner).
  useEffect(() => {
    if (!subeId || !serviceId) { setSlotlar([]); return; }
    setSecilenBaslangic(null);
    setSlotYukleniyor(true);
    const p_gun = `${gun.getFullYear()}-${String(gun.getMonth() + 1).padStart(2, '0')}-${String(gun.getDate()).padStart(2, '0')}`;
    let iptal = false;
    supabase
      .rpc('musait_slotlar', {
        p_branch_id: subeId,
        p_service_id: serviceId,
        p_gun,
      })
      .then(({ data, error }) => {
        if (iptal) return;
        if (error) uyari('Hata', error.message);
        else setSlotlar((data as MusaitSlot[]) ?? []);
        setSlotYukleniyor(false);
      });
    return () => { iptal = true; };
  }, [subeId, gun, serviceId]);

  // Fiyat: şube + araç seçilince sunucudan (istemci fiyat hesaplamaz)
  const fiyatIstek = useRef(0);
  useEffect(() => {
    if (!subeId || !aracId || !serviceId) { setFiyat(null); return; }
    const istek = ++fiyatIstek.current;
    setFiyatYukleniyor(true);
    supabase.functions
      .invoke('fiyat-hesapla', {
        body: { service_id: serviceId, vehicle_id: aracId, branch_id: subeId },
      })
      .then(({ data, error }) => {
        if (istek !== fiyatIstek.current) return;  // eski istek — yok say
        if (error || !data || (data as any).hata) {
          setFiyat(null);
        } else {
          setFiyat(data as FiyatSonuc);
        }
        setFiyatYukleniyor(false);
      });
  }, [subeId, aracId, serviceId]);

  // Seçili şube + hizmet + seçili günün ayı için kullanılabilir abonelik hakkı.
  // entitlements RLS yalnızca kullanıcının kendi haklarını döndürür.
  useEffect(() => {
    setHakKalan(0);
    setHakKullan(false);
    if (!subeId || !serviceId) return;
    const donem = `${gun.getFullYear()}-${String(gun.getMonth() + 1).padStart(2, '0')}-01`;
    let iptal = false;
    supabase
      .from('entitlements')
      .select('kalan_adet, subscriptions!inner(branch_id, durum)')
      .eq('service_id', serviceId)
      .eq('donem', donem)
      .gt('kalan_adet', 0)
      .eq('subscriptions.branch_id', subeId)
      .eq('subscriptions.durum', 'aktif')
      .then(({ data }) => {
        if (iptal) return;
        const toplam = ((data as { kalan_adet: number }[]) ?? [])
          .reduce((acc, r) => acc + (r.kalan_adet ?? 0), 0);
        setHakKalan(toplam);
      });
    return () => { iptal = true; };
  }, [subeId, serviceId, gun]);

  // Seçili şubenin çok satan ürünleri (randevuyla birlikte ekleme için).
  // Şube değişince sepet sıfırlanır (ürünler şubeye özel).
  useEffect(() => {
    setUrunSepet({});
    if (!subeId) { setUrunler([]); return; }
    let iptal = false;
    supabase
      .from('products')
      .select('*')
      .eq('branch_id', subeId)
      .eq('aktif', true)
      .eq('silindi_mi', false)
      .gt('stok', 0)
      .order('one_cikan', { ascending: false })
      .order('satis_adedi', { ascending: false })
      .limit(8)
      .then(({ data }) => {
        if (iptal) return;
        setUrunler((data as Product[]) ?? []);
      });
    return () => { iptal = true; };
  }, [subeId]);

  // Puan bedeli (hizmet) + kullanıcının puan bakiyesi. Hizmet değişince ödeme
  // yöntemini varsayılana çek (puan seçiliyken puanla alınamaz hizmete geçmeyi önle).
  useEffect(() => {
    setOdemeYontemi('subede');
    if (!serviceId) { setPuanBedeli(0); return; }
    const uid = session?.user?.id;
    let iptal = false;
    Promise.all([
      supabase.from('services').select('puan, puan_bedeli').eq('id', serviceId).single(),
      uid
        ? supabase.from('loyalty_ledger').select('puan_degisim').eq('user_id', uid)
        : Promise.resolve({ data: [] as { puan_degisim: number }[] }),
      supabase.from('campaigns')
        .select('branch_id, bonus_puan, baslangic, bitis')
        .eq('tip', 'puan').eq('aktif', true)
        .eq('hizmet_id', serviceId)
        .not('bonus_puan', 'is', null),
    ]).then(([svcRes, puanRes, kampRes]) => {
      if (iptal) return;
      const svc = svcRes.data as { puan: number; puan_bedeli: number } | null;
      setPuanKazanc(svc?.puan ?? 0);
      setPuanBedeli(svc?.puan_bedeli ?? 0);
      setPuanBakiye(((puanRes.data as { puan_degisim: number }[]) ?? [])
        .reduce((a, r) => a + (r.puan_degisim ?? 0), 0));
      setPuanKampanyalar((kampRes.data as typeof puanKampanyalar) ?? []);
    });
    return () => { iptal = true; };
  }, [serviceId, session?.user?.id]);

  // Seçili şubede geçerli en yüksek kampanya bonusu (puan_ver_job ile aynı seçim).
  const kampanyaBonus = useMemo(() => {
    const bugun = new Date().toISOString().slice(0, 10);
    return puanKampanyalar.reduce((max, k) => {
      if (k.baslangic && k.baslangic > bugun) return max;
      if (k.bitis && k.bitis < bugun) return max;
      if (k.branch_id && k.branch_id !== subeId) return max;
      return Math.max(max, k.bonus_puan ?? 0);
    }, 0);
  }, [puanKampanyalar, subeId]);
  const toplamPuanKazanc = puanKazanc + kampanyaBonus;

  function urunAdetDegis(p: Product, delta: number) {
    setUrunSepet(prev => {
      const yeni = Math.min(Math.max((prev[p.id] ?? 0) + delta, 0), p.stok);
      const kopya = { ...prev };
      if (yeni <= 0) delete kopya[p.id];
      else kopya[p.id] = yeni;
      return kopya;
    });
  }

  async function randevuOlustur() {
    if (!session?.user || !subeId || !aracId || !secilenBaslangic || !serviceId) return;
    setGonderiliyor(true);
    // Hakla randevu: sunucu hakkı atomik düşer + saati programa karşı doğrular.
    // Ücretli randevu: randevu_olustur. İkisi de sunucu doğrulamalı (kural 2).
    const { data: randevuId, error } = hakKullan
      ? await supabase.rpc('hak_ile_randevu', {
          p_branch_id: subeId,
          p_service_id: serviceId,
          p_vehicle_id: aracId,
          p_baslangic: secilenBaslangic,
        })
      : await supabase.rpc('randevu_olustur', {
          p_branch_id: subeId,
          p_service_id: serviceId,
          p_vehicle_id: aracId,
          p_baslangic: secilenBaslangic,
          p_odeme_yontemi: odemeYontemi,
        });
    if (error) { setGonderiliyor(false); uyari('Randevu alınamadı', error.message); return; }

    // Randevuya ürün eklendiyse aynı şubeye sipariş talebi oluştur (sunucu fiyatı okur).
    // Sipariş hatası randevuyu geçersiz kılmaz — randevu zaten alındı, ürünü ayrıca bildiririz.
    const items = Object.entries(urunSepet).map(([product_id, adet]) => ({ product_id, adet }));
    let urunUyari = '';
    if (items.length > 0) {
      const { error: sErr } = await supabase.rpc('siparis_olustur', {
        p_branch_id: subeId,
        p_items: items,
        p_appointment_id: randevuId,
      });
      if (sErr) urunUyari = '\n\nNot: Ürün siparişin alınamadı (' + sErr.message + '). Mağaza sekmesinden tekrar deneyebilirsin.';
    }
    setGonderiliyor(false);

    uyari(
      'Randevu talebin alındı',
      (hakKullan ? 'Abonelik hakkınla randevu oluşturuldu. ' : '') +
        (odemeYontemi === 'puan' ? `${puanBedeli} puan kullanıldı (iptal edersen iade edilir). ` : '') +
        'Şube onayladığında randevun kesinleşir. Randevularım sekmesinden durumunu takip edebilirsin.' +
        (items.length > 0 && !urunUyari ? '\n\nSeçtiğin ürünler de siparişe eklendi.' : '') +
        urunUyari,
      [{ text: 'Tamam', onPress: () => router.replace('/randevularim') }],
    );
  }

  const secilenSlot = slotlar.find(sl => sl.baslangic === secilenBaslangic);
  const gunlukMod = slotlar.some(sl => sl.mod === 'gunluk');
  const tamam = subeId && aracId && secilenBaslangic;

  // Eklenen ürünlerin ara toplamı (ürünler abonelik hakkına dahil değil, daima ücretli)
  const urunToplam = useMemo(
    () => urunler.reduce((acc, p) => acc + p.fiyat * (urunSepet[p.id] ?? 0), 0),
    [urunler, urunSepet],
  );
  // Hizmet ücreti: hakla ya da puanla alınırsa 0 (para alınmaz), değilse sunucu fiyatı.
  // (Eklenen ürünler her zaman ayrıca ücretlidir.)
  const puanlaOde = odemeYontemi === 'puan';
  const hizmetUcret = (hakKullan || puanlaOde) ? 0 : (fiyat?.fiyat ?? 0);
  const genelToplam = hizmetUcret + urunToplam;
  const puanlaAlinabilir = puanBedeli > 0;
  const puanYeterli = puanBakiye >= puanBedeli;

  if (ilkYukleme) {
    return (
      <>
        <Stack.Screen options={headerOpts} />
        <Yukleniyor style={{ backgroundColor: renkler.bg }} />
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={headerOpts} />
      <View style={[s.container, { backgroundColor: renkler.bg }]}>
        <ScrollView contentContainerStyle={s.icerik}>
          <Text style={[s.hizmetAd, { color: renkler.text }]}>{serviceAd}</Text>

          {/* Bu hizmet size kaç OTONBU Puanı kazandıracak (kampanya bonusu dahil) */}
          {toplamPuanKazanc > 0 && (
            <View style={[s.puanKazancKart, { backgroundColor: renkler.rozetBg }]}>
              <PuanLogo size={20} renk={kampanyaBonus > 0 ? renkler.accent : renkler.primary} />
              <Text style={[s.puanKazancText, { color: renkler.text }]}>
                Bu hizmet size{' '}
                <Text style={{ fontWeight: '800', color: kampanyaBonus > 0 ? renkler.accent : renkler.primary }}>
                  {toplamPuanKazanc} OTONBU Puanı
                </Text>
                {' '}kazandıracak
                {kampanyaBonus > 0 && (
                  <Text style={{ color: renkler.accent }}> (+{kampanyaBonus} kampanya bonusu)</Text>
                )}
              </Text>
            </View>
          )}

          {/* 1) Şube */}
          <Text style={[s.bolum, { color: renkler.subtext }]}>ŞUBE</Text>
          {subeler.length === 0 ? (
            <Text style={[s.uyari, { color: renkler.subtext }]}>
              Şu an aktif şube yok. Lütfen daha sonra dene.
            </Text>
          ) : (
            subeler.map(sube => {
              const aktif = subeId === sube.id;
              return (
                <TouchableOpacity
                  key={sube.id}
                  style={[
                    s.secimKart,
                    { backgroundColor: renkler.card, borderColor: aktif ? renkler.primary : renkler.border },
                  ]}
                  onPress={() => setSubeId(sube.id)}
                >
                  <View style={s.secimSol}>
                    <Text style={[s.secimBaslik, { color: renkler.text }]}>{sube.ad}</Text>
                    {sube.adres ? (
                      <Text style={[s.secimAlt, { color: renkler.subtext }]}>{sube.adres}</Text>
                    ) : null}
                  </View>
                  {aktif && <Ionicons name="checkmark-circle" size={22} color={renkler.primary} />}
                </TouchableOpacity>
              );
            })
          )}

          {/* 2) Araç */}
          <Text style={[s.bolum, { color: renkler.subtext }]}>ARAÇ</Text>
          {araclar.length === 0 ? (
            <View style={[s.bosKutu, { backgroundColor: renkler.card }]}>
              <Text style={[s.uyari, { color: renkler.subtext }]}>
                Henüz aracın yok. Önce bir araç ekle.
              </Text>
              <TouchableOpacity
                style={[s.kucukBtn, { borderColor: renkler.primary }]}
                onPress={() => router.push('/araclar')}
              >
                <Text style={[s.kucukBtnText, { color: renkler.primary }]}>Araç Ekle</Text>
              </TouchableOpacity>
            </View>
          ) : (
            araclar.map(arac => {
              const aktif = aracId === arac.id;
              return (
                <TouchableOpacity
                  key={arac.id}
                  style={[
                    s.secimKart,
                    { backgroundColor: renkler.card, borderColor: aktif ? renkler.primary : renkler.border },
                  ]}
                  onPress={() => setAracId(arac.id)}
                >
                  <View style={s.secimSol}>
                    <Text style={[s.secimBaslik, { color: renkler.text }]}>{arac.plaka}</Text>
                    <Text style={[s.secimAlt, { color: renkler.subtext }]}>
                      {[arac.marka, arac.model].filter(Boolean).join(' ') || cinsLabel(arac.arac_cinsi)}
                    </Text>
                  </View>
                  {aktif && <Ionicons name="checkmark-circle" size={22} color={renkler.primary} />}
                </TouchableOpacity>
              );
            })
          )}

          {/* 3) Tarih */}
          <Text style={[s.bolum, { color: renkler.subtext }]}>TARİH</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.gunSerit}>
            {gunler().map(g => {
              const aktif = g.getTime() === gun.getTime();
              return (
                <TouchableOpacity
                  key={g.toISOString()}
                  style={[
                    s.gunBtn,
                    { backgroundColor: renkler.card, borderColor: renkler.border },
                    aktif && { backgroundColor: renkler.primary, borderColor: renkler.primary },
                  ]}
                  onPress={() => setGun(g)}
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

          {/* 4) Saat / Gün */}
          <Text style={[s.bolum, { color: renkler.subtext }]}>
            {gunlukMod ? 'BU GÜN' : 'SAAT'}
          </Text>
          {!subeId ? (
            <Text style={[s.uyari, { color: renkler.subtext }]}>Önce şube seç.</Text>
          ) : slotYukleniyor ? (
            <ActivityIndicator color={renkler.primary} style={{ marginVertical: 16 }} />
          ) : slotlar.length === 0 ? (
            <Text style={[s.uyari, { color: renkler.subtext }]}>
              {gunlukMod ? 'Bu gün uygun değil. Başka gün dene.' : 'Bu gün için tanımlı slot yok. Başka gün dene.'}
            </Text>
          ) : gunlukMod ? (
            // Günlük mod: tek "tüm gün" kartı (PPF gibi 1-2 günlük işler)
            slotlar.map(sl => {
              const gecti = new Date(sl.baslangic).getTime() <= Date.now();
              const dolu = sl.dolu >= sl.kapasite;
              const kapali = dolu || gecti;
              const aktif = secilenBaslangic === sl.baslangic;
              const kalan = Math.max(sl.kapasite - sl.dolu, 0);
              const n = sl.gun_sayisi ?? 1;
              const bitis = new Date(sl.baslangic);
              bitis.setDate(bitis.getDate() + (n - 1));
              const aralikMetni = n > 1
                ? `${n} gün sürer (${new Date(sl.baslangic).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })} – ${bitis.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })})`
                : 'Aynı gün teslim';
              return (
                <TouchableOpacity
                  key={sl.baslangic}
                  disabled={kapali}
                  style={[
                    s.gunKart,
                    { backgroundColor: renkler.card, borderColor: aktif ? renkler.primary : renkler.border },
                    kapali && { opacity: 0.5 },
                  ]}
                  onPress={() => setSecilenBaslangic(sl.baslangic)}
                >
                  <View style={s.secimSol}>
                    <Text style={[s.gunKartBaslik, { color: renkler.text }]}>
                      {gecti ? 'Bırakma saati geçti' : dolu ? 'Bu tarihler dolu' : 'Bu gün uygun'}
                    </Text>
                    <Text style={[s.gunKartAlt, { color: renkler.subtext }]}>
                      Bırakma {new Date(sl.baslangic).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                      {!kapali ? ` · ${kalan} yer kaldı` : ''}
                      {'\n'}İşlem {aralikMetni}.
                    </Text>
                  </View>
                  {aktif && <Ionicons name="checkmark-circle" size={22} color={renkler.primary} />}
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={s.slotGrid}>
              {slotlar.map(sl => {
                // Geçmiş saat seçilemez (örn. 13:00'da 12:20 slotu): grileşir.
                const gecti = new Date(sl.baslangic).getTime() <= Date.now();
                const dolu = sl.dolu >= sl.kapasite;
                const kapali = dolu || gecti;
                const aktif = secilenBaslangic === sl.baslangic;
                return (
                  <TouchableOpacity
                    key={sl.baslangic}
                    disabled={kapali}
                    style={[
                      s.slotBtn,
                      { backgroundColor: renkler.card, borderColor: renkler.border },
                      aktif && { backgroundColor: renkler.primary, borderColor: renkler.primary },
                      kapali && { opacity: 0.4 },
                    ]}
                    onPress={() => setSecilenBaslangic(sl.baslangic)}
                  >
                    <Text style={[
                      s.slotText,
                      { color: aktif ? renkler.primaryText : renkler.text },
                    ]}>
                      {new Date(sl.baslangic).toLocaleTimeString('tr-TR', {
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </Text>
                    {kapali && (
                      <Text style={[s.slotDolu, { color: renkler.subtext }]}>
                        {dolu ? 'dolu' : 'geçti'}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Abonelik hakkı varsa: hakla al seçeneği */}
          {hakKalan > 0 && (
            <TouchableOpacity
              activeOpacity={0.85}
              style={[
                s.hakKart,
                { backgroundColor: renkler.card, borderColor: hakKullan ? renkler.primary : renkler.border },
              ]}
              onPress={() => setHakKullan(v => !v)}
            >
              <Ionicons
                name={hakKullan ? 'checkbox' : 'square-outline'}
                size={22}
                color={hakKullan ? renkler.primary : renkler.subtext}
              />
              <View style={s.hakKartMetin}>
                <Text style={[s.hakKartBaslik, { color: renkler.text }]}>
                  Abonelik hakkıyla al
                </Text>
                <Text style={[s.hakKartAlt, { color: renkler.subtext }]}>
                  Bu hizmette {hakKalan} hakkın var · ücret alınmaz
                </Text>
              </View>
              <Ionicons name="ticket" size={20} color={renkler.primary} />
            </TouchableOpacity>
          )}

          {/* Çok satan ürünler — randevuyla birlikte sipariş (opsiyonel) */}
          {urunler.length > 0 && (
            <>
              <Text style={[s.bolum, { color: renkler.subtext }]}>ÜRÜN EKLE (opsiyonel)</Text>
              <Text style={[s.urunIpucu, { color: renkler.subtext }]}>
                Şubenin çok satan ürünleri. Randevunla birlikte sipariş et, teslimde al.
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.urunSerit}>
                {urunler.map(p => {
                  const adet = urunSepet[p.id] ?? 0;
                  return (
                    <View key={p.id} style={[s.urunKart, { backgroundColor: renkler.card, borderColor: renkler.border }]}>
                      {p.gorsel ? (
                        <Image source={{ uri: urunGorselUrl(p.gorsel)! }} style={s.urunGorsel} resizeMode="cover" />
                      ) : (
                        <View style={[s.urunGorsel, s.urunGorselBos, { backgroundColor: renkler.rozetBg }]}>
                          <Ionicons name="cube-outline" size={22} color={renkler.subtext} />
                        </View>
                      )}
                      <Text style={[s.urunAd, { color: renkler.text }]} numberOfLines={2}>{p.ad}</Text>
                      <Text style={[s.urunFiyat, { color: renkler.primary }]}>{tl(p.fiyat)}</Text>
                      {adet === 0 ? (
                        <TouchableOpacity
                          style={[s.urunEkle, { backgroundColor: renkler.primary }]}
                          onPress={() => urunAdetDegis(p, 1)}
                        >
                          <Ionicons name="add" size={16} color={renkler.primaryText} />
                          <Text style={[s.urunEkleText, { color: renkler.primaryText }]}>Ekle</Text>
                        </TouchableOpacity>
                      ) : (
                        <View style={s.urunAdetRow}>
                          <TouchableOpacity style={[s.urunAdetBtn, { borderColor: renkler.primary }]} onPress={() => urunAdetDegis(p, -1)}>
                            <Ionicons name="remove" size={16} color={renkler.primary} />
                          </TouchableOpacity>
                          <Text style={[s.urunAdetText, { color: renkler.text }]}>{adet}</Text>
                          <TouchableOpacity
                            style={[s.urunAdetBtn, { borderColor: renkler.primary }, adet >= p.stok && { opacity: 0.4 }]}
                            disabled={adet >= p.stok}
                            onPress={() => urunAdetDegis(p, 1)}
                          >
                            <Ionicons name="add" size={16} color={renkler.primary} />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  );
                })}
              </ScrollView>
            </>
          )}

          {/* Ödeme yöntemi — hakla alımda ücret yok, gizli. Şimdilik yalnız
              "şubede"; "online" iyzico ile açılacak (o zaman değer randevu_olustur'a
              parametre olarak taşınacak, şu an default 'subede' kaydedilir). */}
          {!hakKullan && (
            <>
              <Text style={[s.bolum, { color: renkler.subtext }]}>ÖDEME YÖNTEMİ</Text>
              <View style={s.odemeRow}>
                <TouchableOpacity
                  style={[
                    s.odemeBtn,
                    { backgroundColor: renkler.card, borderColor: odemeYontemi === 'subede' ? renkler.primary : renkler.border },
                  ]}
                  onPress={() => setOdemeYontemi('subede')}
                >
                  <Ionicons
                    name="storefront-outline"
                    size={20}
                    color={odemeYontemi === 'subede' ? renkler.primary : renkler.subtext}
                  />
                  <Text style={[s.odemeBaslik, { color: renkler.text }]}>Şubede öde</Text>
                  <Text style={[s.odemeAlt, { color: renkler.subtext }]}>Nakit / kart · teslimde</Text>
                </TouchableOpacity>
                <View style={[s.odemeBtn, s.odemePasif, { backgroundColor: renkler.card, borderColor: renkler.border }]}>
                  <Ionicons name="card-outline" size={20} color={renkler.subtext} />
                  <Text style={[s.odemeBaslik, { color: renkler.subtext }]}>Online öde</Text>
                  <Text style={[s.odemeAlt, { color: renkler.subtext }]}>Yakında</Text>
                </View>
              </View>

              {/* Puanla al — hizmetin puan bedeli varsa. Bakiye yeterliyse seçilebilir. */}
              {puanlaAlinabilir && (
                <TouchableOpacity
                  activeOpacity={0.85}
                  disabled={!puanYeterli}
                  style={[
                    s.puanOde,
                    {
                      backgroundColor: renkler.card,
                      borderColor: puanlaOde ? renkler.primary : renkler.border,
                      opacity: puanYeterli ? 1 : 0.6,
                    },
                  ]}
                  onPress={() => setOdemeYontemi(puanlaOde ? 'subede' : 'puan')}
                >
                  <View style={[s.puanOdeIkon, { backgroundColor: renkler.rozetBg }]}>
                    <PuanLogo size={28} renk={renkler.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.odemeBaslik, { color: renkler.text, marginTop: 0 }]}>Puanla Al</Text>
                    <Text style={[s.odemeAlt, { color: renkler.subtext }]}>
                      {puanBedeli} puan · bakiyen {puanBakiye}
                    </Text>
                  </View>
                  {puanYeterli ? (
                    <Ionicons
                      name={puanlaOde ? 'checkmark-circle' : 'ellipse-outline'}
                      size={22}
                      color={puanlaOde ? renkler.primary : renkler.subtext}
                    />
                  ) : (
                    <Text style={[s.puanEksik, { color: renkler.subtext }]}>
                      {puanBedeli - puanBakiye} puan daha
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            </>
          )}

          {/* 5) Özet + fiyat */}
          <View style={[s.ozet, { backgroundColor: renkler.card, borderColor: renkler.border }]}>
            <View style={s.ozetSatir}>
              <Text style={[s.ozetLabel, { color: renkler.subtext }]}>
                {hakKullan || puanlaOde ? 'Ödeme' : 'Tahmini ücret'}
              </Text>
              {hakKullan ? (
                <Text style={[s.ozetFiyat, { color: '#16a34a' }]}>Abonelik hakkı</Text>
              ) : puanlaOde ? (
                <View style={s.ozetFiyatGrup}>
                  <PuanLogo size={26} renk={renkler.primary} />
                  <Text style={[s.ozetFiyat, { color: renkler.primary }]}>{puanBedeli} puan</Text>
                </View>
              ) : fiyatYukleniyor ? (
                <ActivityIndicator color={renkler.primary} />
              ) : fiyat ? (
                <View style={s.ozetFiyatGrup}>
                  {fiyat.indirim_yuzde ? (
                    <View style={s.ozetKampanya}>
                      <Text style={s.ozetKampanyaText}>%{fiyat.indirim_yuzde} kampanya</Text>
                    </View>
                  ) : null}
                  <Text style={[s.ozetFiyat, { color: renkler.primary }]}>
                    {fiyat.fiyat.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                  </Text>
                </View>
              ) : (
                <Text style={[s.ozetAlt, { color: renkler.subtext }]}>Şube ve araç seç</Text>
              )}
            </View>

            {/* Eklenen ürünler — toplama yansır (abonelik hakkı ürünleri kapsamaz) */}
            {urunToplam > 0 && (
              <>
                <View style={[s.ozetSatir, s.ozetSatirAlt]}>
                  <Text style={[s.ozetLabel, { color: renkler.subtext }]}>Ürünler</Text>
                  <Text style={[s.ozetUrun, { color: renkler.text }]}>{tl(urunToplam)}</Text>
                </View>
                {(hakKullan || fiyat) && (
                  <View style={[s.ozetGenel, { borderColor: renkler.border }]}>
                    <Text style={[s.ozetGenelLabel, { color: renkler.text }]}>Genel toplam</Text>
                    <Text style={[s.ozetFiyat, { color: renkler.primary }]}>{tl(genelToplam)}</Text>
                  </View>
                )}
              </>
            )}

            {secilenSlot && (
              <Text style={[s.ozetAlt, { color: renkler.subtext }]}>
                {new Date(secilenSlot.baslangic).toLocaleString('tr-TR', {
                  weekday: 'long', day: 'numeric', month: 'long',
                  hour: '2-digit', minute: '2-digit',
                })}
              </Text>
            )}
          </View>
        </ScrollView>

        <TouchableOpacity
          style={[
            s.onayBtn,
            { backgroundColor: tamam ? renkler.primary : renkler.border },
          ]}
          disabled={!tamam || gonderiliyor}
          onPress={randevuOlustur}
        >
          {gonderiliyor ? (
            <ActivityIndicator color={renkler.primaryText} />
          ) : (
            <Text style={[s.onayText, { color: tamam ? renkler.primaryText : renkler.subtext }]}>
              {hakKullan ? 'Hakla Randevu Al' : puanlaOde ? 'Puanla Randevu Al' : 'Randevu Talebi Gönder'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
      <UyariKatmani />
    </>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  icerik: { padding: 16, paddingBottom: 24 },
  hizmetAd: { fontSize: 20, fontWeight: '800', marginBottom: 4 },
  puanKazancKart: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 12, paddingVertical: 11, paddingHorizontal: 14, marginTop: 10,
  },
  puanKazancText: { flex: 1, fontSize: 14, lineHeight: 20 },
  bolum: {
    fontSize: 11, fontWeight: '700', letterSpacing: 1,
    marginTop: 20, marginBottom: 8,
  },
  uyari: { fontSize: 14, lineHeight: 20 },
  secimKart: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1.5, borderRadius: 12, padding: 14, marginBottom: 8,
  },
  secimSol: { flex: 1, paddingRight: 8 },
  secimBaslik: { fontSize: 16, fontWeight: '600' },
  secimAlt: { fontSize: 13, marginTop: 2 },
  bosKutu: { borderRadius: 12, padding: 16, alignItems: 'flex-start', gap: 12 },
  kucukBtn: { borderWidth: 1, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 16 },
  kucukBtnText: { fontSize: 14, fontWeight: '600' },
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
  gunKart: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1.5, borderRadius: 12, padding: 14,
  },
  gunKartBaslik: { fontSize: 16, fontWeight: '700' },
  gunKartAlt: { fontSize: 13, marginTop: 4, lineHeight: 18 },
  hakKart: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1.5, borderRadius: 12, padding: 14, marginTop: 24,
  },
  hakKartMetin: { flex: 1 },
  hakKartBaslik: { fontSize: 15, fontWeight: '700' },
  hakKartAlt: { fontSize: 13, marginTop: 2 },
  odemeRow: { flexDirection: 'row', gap: 12 },
  odemeBtn: { flex: 1, borderWidth: 1.5, borderRadius: 12, padding: 14, gap: 4 },
  odemePasif: { opacity: 0.5 },
  odemeBaslik: { fontSize: 15, fontWeight: '700', marginTop: 4 },
  odemeAlt: { fontSize: 12 },
  puanOde: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1.5, borderRadius: 12, padding: 14, marginTop: 12,
  },
  puanOdeIkon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  puanEksik: { fontSize: 12, fontWeight: '700', maxWidth: 80, textAlign: 'right' },
  urunIpucu: { fontSize: 12, lineHeight: 17, marginTop: -4, marginBottom: 10 },
  urunSerit: { gap: 10, paddingVertical: 2, paddingRight: 4 },
  urunKart: { width: 130, borderWidth: 1, borderRadius: 12, padding: 8 },
  urunGorsel: { width: '100%', height: 80, borderRadius: 8, marginBottom: 6 },
  urunGorselBos: { alignItems: 'center', justifyContent: 'center' },
  urunAd: { fontSize: 13, fontWeight: '600', minHeight: 34 },
  urunFiyat: { fontSize: 15, fontWeight: '800', marginTop: 2, marginBottom: 8 },
  urunEkle: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3,
    borderRadius: 8, paddingVertical: 7,
  },
  urunEkleText: { fontSize: 13, fontWeight: '700' },
  urunAdetRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  urunAdetBtn: { borderWidth: 1.5, borderRadius: 7, width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  urunAdetText: { fontSize: 15, fontWeight: '700', minWidth: 18, textAlign: 'center' },
  ozet: {
    borderWidth: 1, borderRadius: 12, padding: 16, marginTop: 16,
  },
  ozetSatir: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ozetSatirAlt: { marginTop: 10 },
  ozetUrun: { fontSize: 16, fontWeight: '700' },
  ozetGenel: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderTopWidth: 1, marginTop: 12, paddingTop: 12,
  },
  ozetGenelLabel: { fontSize: 15, fontWeight: '700' },
  ozetLabel: { fontSize: 14 },
  ozetFiyat: { fontSize: 22, fontWeight: '800' },
  ozetFiyatGrup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ozetKampanya: { backgroundColor: '#dc2626', borderRadius: 6, paddingVertical: 2, paddingHorizontal: 6 },
  ozetKampanyaText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  ozetAlt: { fontSize: 13, marginTop: 6 },
  onayBtn: {
    margin: 16, marginTop: 8, borderRadius: 12,
    padding: 16, alignItems: 'center',
  },
  onayText: { fontSize: 16, fontWeight: '700' },
});
