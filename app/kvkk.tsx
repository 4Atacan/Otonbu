import { useMemo } from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Stack } from 'expo-router';
import { useTheme } from '../src/theme/ThemeContext';
import { KVKK_VERSIYON } from '../src/lib/kvkk';

// KVKK Aydınlatma Metni — kayıt ekranından ve profilden açılır.
// Bu ekrandaki metin, yayınlanan tam Gizlilik Politikası (legal/gizlilik-politikasi.html,
// host: POLITIKA_URL) ile AYNI sürümdür (KVKK_VERSIYON). Politika güncellenirse bu ekranı
// ve src/lib/kvkk.ts KVKK_VERSIYON'u birlikte güncelle — kullanıcının rıza verdiği metin
// ile yayınlanan metin sürümü tutmalı.
const POLITIKA_URL = 'https://otonbu-gizlilik.otonbugarage.workers.dev';

const BOLUMLER: { baslik: string; metin: string }[] = [
  {
    baslik: 'Veri Sorumlusu',
    metin:
      'AKRA İNN TURİZM İNŞAAT SANAYİ VE LİMİTED ŞİRKETİ ("OTONBU GARAGE" markası), 6698 sayılı ' +
      'Kişisel Verilerin Korunması Kanunu ("KVKK") kapsamında veri sorumlusudur. ' +
      'Adres: Esentepe Mah. Akademiyolu Sk. No: 5/52 Serdivan/Sakarya · VKN: 0340818862 · ' +
      'MERSIS: 0034081886200001 · E-posta: otonbugarage@gmail.com. OTONBU GARAGE Sakarya ' +
      'genelinde franchise (bağımsız şube) modeliyle çalışır; hizmeti aldığınız şube de ' +
      'verilerin işlenmesinde rol alabilir.',
  },
  {
    baslik: 'İşlenen Kişisel Veriler',
    metin:
      'Ad soyad, e-posta, telefon; araç plakası ve marka/model bilgisi, yüklerseniz ruhsat ve ' +
      'sigorta/kasko belgesi görselleri; profil fotoğrafı ve hizmet öncesi/sonrası iş fotoğrafları; ' +
      'randevu, hizmet, sipariş, teklif ve sadakat (puan) kayıtları; ödeme kayıtları (KART BİLGİSİ ' +
      'HARİÇ); oturum, bildirim (push) anahtarı, bot koruması ve hata teşhis kayıtları; rıza ' +
      'kayıtları. Uygulama KONUM (GPS) verisi toplamaz. Kamera/galeri yalnızca siz fotoğraf/belge ' +
      'eklerken ve izninizle kullanılır.',
  },
  {
    baslik: 'İşleme Amaçları',
    metin:
      'Hesap ve güvenli giriş, randevu ve hizmet sunumu, sipariş/teklif yönetimi, ödeme ve tahsilat, ' +
      'sadakat programı, bildirim gönderimi, güvenlik ve kötüye kullanım/bot engeli, hata teşhisi, ' +
      'yasal yükümlülüklerin (muhasebe, vergi) yerine getirilmesi. Açık rızanız varsa ticari ileti.',
  },
  {
    baslik: 'Aktarım ve Yurt Dışı',
    metin:
      'Verileriniz; hizmeti aldığınız şube, altyapı/depolama ve iletişim hizmet sağlayıcıları ' +
      '(Supabase — Frankfurt/AB, Cloudflare R2, Brevo, Sentry, Expo, Apple/Google), ' +
      'online ödeme etkinleştirildiğinde ödeme kuruluşu iyzico ve yasal olarak yetkili kamu ' +
      'kurumlarıyla, amaçla sınırlı olarak paylaşılabilir. Bu sağlayıcıların bir kısmı yurt dışında ' +
      'olduğundan, ilgili aktarımlar KVKK’nın yurt dışına aktarım hükümlerine dayanılarak yapılır.',
  },
  {
    baslik: 'Ödeme Güvenliği',
    metin:
      'Kart bilgileriniz uygulama tarafından toplanmaz, görülmez ve saklanmaz. Online ödeme ' +
      'etkinleştirildiğinde ödeme, lisanslı ödeme kuruluşu iyzico’nun güvenli sayfasında işlenir; ' +
      'uygulamaya yalnızca ödemenin sonucu iletilir.',
  },
  {
    baslik: 'Saklama Süresi',
    metin:
      'Kişisel verileriniz, ilgili mevzuatta öngörülen süreler (örn. muhasebe kayıtları için 10 yıl) ' +
      've işleme amacının gerektirdiği süre boyunca saklanır; süre sonunda silinir veya anonim hale ' +
      'getirilir.',
  },
  {
    baslik: 'Haklarınız (KVKK m. 11)',
    metin:
      'Kişisel verilerinizin işlenip işlenmediğini öğrenme, bilgi ve düzeltme talep etme, şartları ' +
      'oluştuğunda silinmesini/yok edilmesini isteme, aktarıldığı üçüncü kişileri bilme ve otomatik ' +
      'işlemeye itiraz gibi haklara sahipsiniz. Başvuru: otonbugarage@gmail.com (en geç 30 günde ' +
      'yanıtlanır). Uygulamadan "Verilerimi Sil" ile kişisel verileriniz anonim hale getirilir; ' +
      'muhasebe açısından zorunlu kayıtlar kişiye bağlanamaz biçimde saklanır.',
  },
  {
    baslik: 'Ticari İleti',
    metin:
      'Kampanya ve fırsat bildirimleri (ticari ileti) yalnızca ayrıca onay vermeniz halinde ' +
      'gönderilir. Bu onay, uygulamayı kullanım rızanızdan bağımsızdır ve dilediğiniz zaman geri ' +
      'alınabilir.',
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

        <TouchableOpacity
          style={[s.link, { borderColor: renkler.border }]}
          activeOpacity={0.7}
          onPress={() => Linking.openURL(POLITIKA_URL)}
        >
          <Text style={[s.linkMetin, { color: renkler.primary }]}>
            Tam Gizlilik Politikası metnini görüntüle →
          </Text>
        </TouchableOpacity>
        <Text style={[s.surum, { color: renkler.subtext }]}>Metin sürümü: {KVKK_VERSIYON}</Text>
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
  link: { marginTop: 28, paddingVertical: 14, paddingHorizontal: 16, borderWidth: 1, borderRadius: 12, alignItems: 'center' },
  linkMetin: { fontSize: 15, fontWeight: '700' },
  surum: { fontSize: 12, marginTop: 14, textAlign: 'center' },
});
