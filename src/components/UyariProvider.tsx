import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { _uyariDinle, _uyariKapat, UyariButon, UyariConfig } from '../lib/uyari';

// Temalı uyarı/onay dialogunu çizen overlay KATMANI. Native <Modal> DEĞİL —
// StyleSheet.absoluteFill ile bulunduğu ağacın en üstünü kaplar. İki yerde
// kullanılır:
//   1) Kök layout'ta (UyariProvider) → normal ekranlar için.
//   2) Her native <Modal>'ın içinde → o modal açıkken üstünde çizilebilsin diye.
// iOS'ta açık bir native Modal varken ikinci native Modal sunulamadığı için bu
// yapı zorunlu (aksi halde dialog görünmez + uygulama donar).
export function UyariKatmani() {
  const { renkler } = useTheme();
  const [config, setConfig] = useState<UyariConfig | null>(null);

  useEffect(() => _uyariDinle(setConfig), []);

  if (!config) return null;

  const butonlar: UyariButon[] = config.butonlar?.length
    ? config.butonlar
    : [{ text: 'Tamam' }];
  // 2 buton → yan yana; aksi halde alt alta (native Alert davranışı).
  const satirDuzen = butonlar.length === 2;

  function bas(b: UyariButon) {
    // Overlay (native Modal değil) olduğu için kapanış anlık; onPress ekranın
    // KENDİ form modalını kapatsa bile iki native modal çakışması olmaz.
    _uyariKapat();
    b.onPress?.();
  }

  function butonRengi(b: UyariButon) {
    if (b.style === 'destructive') return { bg: renkler.danger, text: '#fff', border: renkler.danger };
    if (b.style === 'cancel') return { bg: 'transparent', text: renkler.subtext, border: renkler.border };
    return { bg: renkler.primary, text: renkler.primaryText, border: renkler.primary };
  }

  return (
    <View style={[StyleSheet.absoluteFill, s.katman]}>
      <View style={s.backdrop}>
        {/* Backdrop'a dokunmak kapatmaz (native Alert gibi) — buton şart */}
        <Pressable style={StyleSheet.absoluteFill} onPress={() => {}} />
        <View style={[s.kart, { backgroundColor: renkler.card, borderColor: renkler.border }]}>
          <View style={[s.amblemSerit, { backgroundColor: renkler.primary }]} />
          {config.baslik ? (
            <Text style={[s.baslik, { color: renkler.text }]}>{config.baslik}</Text>
          ) : null}
          {config.mesaj ? (
            <Text style={[s.mesaj, { color: renkler.subtext }]}>{config.mesaj}</Text>
          ) : null}

          <View style={[s.butonlar, satirDuzen ? s.satir : s.dikey]}>
            {butonlar.map((b, i) => {
              const r = butonRengi(b);
              return (
                <Pressable
                  key={`${b.text}-${i}`}
                  onPress={() => bas(b)}
                  style={({ pressed }) => [
                    s.buton,
                    satirDuzen && s.butonEsit,
                    { backgroundColor: r.bg, borderColor: r.border },
                    pressed && { opacity: 0.75 },
                  ]}
                >
                  <Text style={[s.butonText, { color: r.text }]}>{b.text}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
}

// Kök layout'a bir kez mount edilir; modal açık DEĞİLken uyarıları çizer.
export function UyariProvider() {
  return <UyariKatmani />;
}

const s = StyleSheet.create({
  // Android'de modal içeriğinin üstünde kalmayı garanti et.
  katman: { zIndex: 9999, elevation: 9999 },
  backdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center', padding: 32,
  },
  kart: {
    width: '100%', maxWidth: 360, borderRadius: 20, padding: 22, paddingTop: 24,
    borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden',
  },
  amblemSerit: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 4,
  },
  baslik: { fontSize: 18, fontWeight: '800', textAlign: 'center' },
  mesaj: { fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 8 },
  butonlar: { marginTop: 22, gap: 10 },
  satir: { flexDirection: 'row' },
  dikey: { flexDirection: 'column' },
  buton: {
    borderRadius: 12, paddingVertical: 13, paddingHorizontal: 18,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1.5,
  },
  butonEsit: { flex: 1 },
  butonText: { fontSize: 15, fontWeight: '700' },
});
