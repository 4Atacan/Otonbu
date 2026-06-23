import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

// Açıklama metinlerini ekranda sürekli göstermek yerine bir ℹ️ ikonunun
// altına gizleyen yardımcılar. Daha temiz, profesyonel bir form görünümü sağlar.

interface EtiketProps {
  children: string;     // etiket metni
  bilgi?: string;       // ℹ️'ye dokununca açılacak açıklama (yoksa ikon çıkmaz)
  zorunlu?: boolean;    // sonuna " *" ekler
}

/** Form etiketi; açıklaması varsa yanındaki info ikonu altında gizlenir. */
export function Etiket({ children, bilgi, zorunlu }: EtiketProps) {
  const { renkler } = useTheme();
  const [acik, setAcik] = useState(false);
  return (
    <View>
      <Pressable
        style={s.satir}
        disabled={!bilgi}
        onPress={() => setAcik(a => !a)}
        hitSlop={6}
      >
        <Text style={[s.etiket, { color: renkler.subtext }]}>
          {children}{zorunlu ? ' *' : ''}
        </Text>
        {bilgi ? (
          <Ionicons
            name={acik ? 'information-circle' : 'information-circle-outline'}
            size={17}
            color={acik ? renkler.primary : renkler.subtext}
          />
        ) : null}
      </Pressable>
      {bilgi && acik ? (
        <Text style={[s.balon, { color: renkler.subtext, backgroundColor: renkler.rozetBg }]}>
          {bilgi}
        </Text>
      ) : null}
    </View>
  );
}

interface BilgiProps {
  metin: string;
  baslik?: string;   // tetikleyici yazı (varsayılan "Nasıl çalışır?")
}

/** Bağımsız, katlanabilir bilgi satırı — bölüm/liste girişleri için. */
export function Bilgi({ metin, baslik = 'Nasıl çalışır?' }: BilgiProps) {
  const { renkler } = useTheme();
  const [acik, setAcik] = useState(false);
  return (
    <View style={s.bilgiWrap}>
      <Pressable style={s.tetik} onPress={() => setAcik(a => !a)} hitSlop={6}>
        <Ionicons name="information-circle-outline" size={16} color={renkler.primary} />
        <Text style={[s.tetikText, { color: renkler.primary }]}>{baslik}</Text>
        <Ionicons name={acik ? 'chevron-up' : 'chevron-down'} size={14} color={renkler.primary} />
      </Pressable>
      {acik ? (
        <Text style={[s.balon, { color: renkler.subtext, backgroundColor: renkler.rozetBg }]}>
          {metin}
        </Text>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  satir: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  etiket: { fontSize: 14 },
  balon: { fontSize: 12, lineHeight: 17, padding: 10, borderRadius: 10, marginBottom: 12 },
  bilgiWrap: { marginBottom: 12 },
  tetik: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 4 },
  tetikText: { fontSize: 13, fontWeight: '600' },
});
