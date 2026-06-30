import { createContext, ReactNode, useContext, useMemo, useState } from 'react';
import { Product } from '../types';

// Mağaza sepeti uygulama genelinde paylaşılır: hem Mağaza sekmesi hem ürün
// detay ekranı aynı sepete yazar. Sepet TEK şubeye bağlıdır (sipariş şube
// bazlı) — farklı şubeden ürün eklenince sepet sıfırlanır.
export type SepetKalem = { urun: Product; adet: number };

type SepetState = {
  subeId: string | null;
  kalemler: SepetKalem[];
  toplamAdet: number;
  subeSec: (id: string | null) => void;   // şube değişirse sepeti temizler
  ekle: (urun: Product, delta: number) => void;
  adet: (id: string) => number;
  temizle: () => void;
};

const Ctx = createContext<SepetState | null>(null);

export function SepetProvider({ children }: { children: ReactNode }) {
  const [subeId, setSubeId] = useState<string | null>(null);
  const [harita, setHarita] = useState<Record<string, SepetKalem>>({});

  function subeSec(id: string | null) {
    setSubeId(prev => {
      if (prev !== id) setHarita({});   // şube değişti → sepet sıfır
      return id;
    });
  }

  function ekle(urun: Product, delta: number) {
    // Farklı şubeden ekleme → sepeti o şubeye taşı (sıfırla)
    setSubeId(prev => {
      if (prev !== urun.branch_id) setHarita({});
      return urun.branch_id;
    });
    setHarita(prev => {
      const mevcut = prev[urun.id]?.adet ?? 0;
      const yeni = Math.min(Math.max(mevcut + delta, 0), urun.stok);
      const kopya = { ...prev };
      if (yeni <= 0) delete kopya[urun.id];
      else kopya[urun.id] = { urun, adet: yeni };
      return kopya;
    });
  }

  const kalemler = useMemo(() => Object.values(harita), [harita]);
  const toplamAdet = useMemo(() => kalemler.reduce((a, k) => a + k.adet, 0), [kalemler]);

  function adet(id: string) { return harita[id]?.adet ?? 0; }
  function temizle() { setHarita({}); }

  const deger: SepetState = { subeId, kalemler, toplamAdet, subeSec, ekle, adet, temizle };
  return <Ctx.Provider value={deger}>{children}</Ctx.Provider>;
}

export function useSepet(): SepetState {
  const c = useContext(Ctx);
  if (!c) throw new Error('useSepet, SepetProvider içinde kullanılmalı');
  return c;
}
