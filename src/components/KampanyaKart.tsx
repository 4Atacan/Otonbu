import {
  View, Text, StyleSheet, TouchableOpacity, ImageBackground,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Campaign } from '../types';
import { Renkler } from '../theme/ThemeContext';
import { kampanyaGorselUrl, kampanyaRozet, kampanyaTarih } from '../lib/kampanya';

// Görseli olmayan kampanyalar için canlı promo renkleri (beyaz yazı okunur).
export const KAMPANYA_RENK = ['#0b7bb5', '#0d9488', '#7c3aed', '#db2777', '#ea580c'];

interface Props {
  kampanya: Campaign;
  renkler: Renkler;
  genislik: number;        // kartın genişliği (px)
  renkIdx?: number;        // gradient fallback renk seçimi
  hizmetAd?: string | null; // bağlı hizmetin adı (varsa küçük etiket)
  onPress?: () => void;
}

// Starbucks tarzı büyük kampanya banner'ı: görsel varsa kapak, yoksa renkli kart.
// Hem ana sayfada (yatay pager) hem Kampanyalar sekmesinde (dikey liste) kullanılır.
export function KampanyaKart({
  kampanya, renkler, genislik, renkIdx = 0, hizmetAd, onPress,
}: Props) {
  const uri = kampanyaGorselUrl(kampanya.gorsel);
  const rozet = kampanyaRozet(kampanya);
  const tarih = kampanyaTarih(kampanya);
  const renk = KAMPANYA_RENK[renkIdx % KAMPANYA_RENK.length];

  const icerik = (
    <>
      {/* Görselde okunabilirlik için koyu film */}
      {uri && <View style={s.film} />}

      <View style={s.ust}>
        {rozet && (
          <View style={s.mekanikRozet}>
            <Ionicons name={rozet.ikon} size={14} color="#fff" />
            <Text style={s.mekanikText} numberOfLines={1}>{rozet.metin}</Text>
          </View>
        )}
      </View>

      <View style={s.alt}>
        {hizmetAd && (
          <Text style={s.hizmetEtiket} numberOfLines={1}>{hizmetAd.toLocaleUpperCase('tr-TR')}</Text>
        )}
        <Text style={s.baslik} numberOfLines={2}>{kampanya.baslik}</Text>
        {kampanya.aciklama && (
          <Text style={s.aciklama} numberOfLines={2}>{kampanya.aciklama}</Text>
        )}
        {tarih && (
          <View style={s.tarihRozet}>
            <Ionicons name="time-outline" size={13} color="#fff" />
            <Text style={s.tarihText}>{tarih}</Text>
          </View>
        )}
      </View>
    </>
  );

  // 1:1 kare — küçülmez, büyük durur (kullanıcı isteği).
  const kartStyle = [s.kart, { width: genislik, height: genislik }];

  return (
    <TouchableOpacity activeOpacity={onPress ? 0.9 : 1} onPress={onPress} disabled={!onPress}>
      {uri ? (
        <ImageBackground source={{ uri }} style={kartStyle} imageStyle={s.kartGorsel}>
          {icerik}
        </ImageBackground>
      ) : (
        <View style={[...kartStyle, { backgroundColor: renk }]}>
          <Ionicons name="megaphone" size={130} color="#fff" style={s.deco} />
          {icerik}
        </View>
      )}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  kart: {
    borderRadius: 20, padding: 18,
    justifyContent: 'space-between', overflow: 'hidden',
  },
  kartGorsel: { borderRadius: 20 },
  film: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.34)' },
  deco: { position: 'absolute', right: -14, bottom: -18, opacity: 0.16 },
  ust: { flexDirection: 'row', alignItems: 'flex-start' },
  mekanikRozet: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(0,0,0,0.38)', borderRadius: 20,
    paddingHorizontal: 11, paddingVertical: 6, maxWidth: '85%',
  },
  mekanikText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  alt: {},
  hizmetEtiket: {
    color: '#fff', fontSize: 11, fontWeight: '800',
    letterSpacing: 0.6, opacity: 0.9, marginBottom: 3,
  },
  baslik: {
    color: '#fff', fontSize: 23, fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.3)', textShadowRadius: 6,
  },
  aciklama: {
    color: '#fff', fontSize: 14, marginTop: 5, opacity: 0.96, lineHeight: 19,
    textShadowColor: 'rgba(0,0,0,0.3)', textShadowRadius: 5,
  },
  tarihRozet: {
    flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 5, marginTop: 10,
  },
  tarihText: { color: '#fff', fontSize: 12, fontWeight: '700' },
});
