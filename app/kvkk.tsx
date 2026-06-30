import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { useTheme } from '../src/theme/ThemeContext';

// KVKK Aydınlatma Metni — kayıt ekranından ve profilden açılır.
// NOT (geliştirici): Aşağıdaki metin bir TASLAK/şablondur; canlıya çıkmadan önce
// işletmenin gerçek unvanı, adresi, KEP/e-posta ve hukuk danışmanının onayıyla
// kesinleştirilmelidir. Rıza versiyonu değişirse src/lib/kvkk.ts KVKK_VERSIYON güncellenir.
const BOLUMLER: { baslik: string; metin: string }[] = [
  {
    baslik: 'Veri Sorumlusu',
    metin:
      'OTONBU GARAGE (franchise işletmesi), 6698 sayılı Kişisel Verilerin Korunması ' +
      'Kanunu ("KVKK") kapsamında veri sorumlusudur. Bu metin, uygulamayı kullanırken ' +
      'kişisel verilerinizin nasıl işlendiğini açıklar.',
  },
  {
    baslik: 'İşlenen Kişisel Veriler',
    metin:
      'Ad soyad, e-posta, telefon numarası; araç plakası, marka/model bilgisi; ' +
      'randevu, hizmet ve sipariş kayıtları; ödeme işlemlerine ilişkin (kart bilgisi ' +
      'HARİÇ) tahsilat kayıtları. Kart bilgileriniz uygulamaya hiç girilmez; ödeme ' +
      'lisanslı ödeme kuruluşunun (iyzico) güvenli sayfasında işlenir.',
  },
  {
    baslik: 'İşleme Amaçları',
    metin:
      'Randevu ve hizmet sunumu, sipariş ve abonelik yönetimi, ödeme alınması, sizinle ' +
      'iletişim kurulması, yasal yükümlülüklerin (muhasebe, vergi) yerine getirilmesi ve ' +
      'hizmet kalitesinin iyileştirilmesi.',
  },
  {
    baslik: 'Aktarım',
    metin:
      'Verileriniz; ödeme kuruluşu (iyzico), e-posta/SMS gönderim sağlayıcıları ve ' +
      'yasal olarak yetkili kamu kurumları ile sınırlı ve amaçla bağlı olarak ' +
      'paylaşılabilir. Sunucular AB bölgesinde (Frankfurt) barındırılır.',
  },
  {
    baslik: 'Saklama Süresi',
    metin:
      'Kişisel verileriniz, ilgili mevzuatta öngörülen süreler (örn. muhasebe kayıtları ' +
      'için 10 yıl) ve işleme amacının gerektirdiği süre boyunca saklanır; süre sonunda ' +
      'silinir veya anonim hale getirilir.',
  },
  {
    baslik: 'Haklarınız (KVKK m. 11)',
    metin:
      'Kişisel verilerinizin işlenip işlenmediğini öğrenme, düzeltilmesini veya ' +
      'silinmesini isteme, işlemenin sınırlandırılmasını talep etme haklarına sahipsiniz. ' +
      'Uygulamadan "Verilerimi Sil" ile kişisel verileriniz anonim hale getirilir; ' +
      'muhasebe açısından zorunlu kayıtlar kişiye bağlanamaz biçimde saklanır.',
  },
  {
    baslik: 'Ticari İleti',
    metin:
      'Kampanya ve fırsat bildirimleri (ticari ileti) yalnızca ayrıca onay vermeniz ' +
      'halinde gönderilir. Bu onay, uygulamayı kullanım rızanızdan bağımsızdır ve ' +
      'dilediğiniz zaman geri alınabilir.',
  },
];

export default function KvkkScreen() {
  const { renkler } = useTheme();
  const headerOpts = useMemo(() => ({
    title: 'KVKK Aydınlatma Metni',
    headerShown: true,
    headerStyle: { backgroundColor: renkler.card },
    headerTitleStyle: { color: renkler.text },
    headerTintColor: renkler.primary,
    headerShadowVisible: false,
  }), [renkler]);

  return (
    <>
      <Stack.Screen options={headerOpts} />
      <ScrollView style={{ backgroundColor: renkler.bg }} contentContainerStyle={s.container}>
        <Text style={[s.ustBaslik, { color: renkler.text }]}>
          Kişisel Verilerin Korunması
        </Text>
        <Text style={[s.ustAlt, { color: renkler.subtext }]}>
          OTONBU GARAGE kişisel verilerinizi 6698 sayılı KVKK kapsamında korur.
        </Text>
        {BOLUMLER.map(b => (
          <View key={b.baslik} style={s.bolum}>
            <Text style={[s.baslik, { color: renkler.text }]}>{b.baslik}</Text>
            <Text style={[s.metin, { color: renkler.subtext }]}>{b.metin}</Text>
          </View>
        ))}
      </ScrollView>
    </>
  );
}

const s = StyleSheet.create({
  container: { padding: 20, paddingBottom: 48 },
  ustBaslik: { fontSize: 22, fontWeight: '800' },
  ustAlt: { fontSize: 14, marginTop: 6, lineHeight: 20, marginBottom: 8 },
  bolum: { marginTop: 20 },
  baslik: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  metin: { fontSize: 14, lineHeight: 21 },
});
