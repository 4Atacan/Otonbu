// Bildirim durumu — kökte TEK abonelik: okunmamış sayısı (navbar rozeti),
// Realtime ile anında güncelleme ve giriş sonrası push token kaydı.
// UstNavbar her ekranda ayrı ayrı sorgu/kanal açmasın diye context'e alındı.
import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useSession } from '../hooks/useSession';
import { pushKaydet } from '../lib/bildirim';

interface BildirimDurum {
  okunmamis: number;
  yenile: () => void;
}

const BildirimCtx = createContext<BildirimDurum>({ okunmamis: 0, yenile: () => {} });
export const useBildirim = () => useContext(BildirimCtx);

export function BildirimProvider({ children }: { children: ReactNode }) {
  const { session } = useSession();
  const router = useRouter();
  const uid = session?.user?.id;
  const [okunmamis, setOkunmamis] = useState(0);

  const yenile = useCallback(() => {
    if (!uid) { setOkunmamis(0); return; }
    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', uid)
      .eq('okundu_mu', false)
      .then(({ count }) => setOkunmamis(count ?? 0));
  }, [uid]);

  // Giriş sonrası: sayaç + Realtime kanal + push token kaydı
  useEffect(() => {
    if (!uid) { setOkunmamis(0); return; }
    yenile();
    pushKaydet(uid);

    const kanal = supabase
      .channel(`bildirim-${uid}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${uid}` },
        yenile,
      )
      .subscribe();
    return () => { supabase.removeChannel(kanal); };
  }, [uid, yenile]);

  // Push bildirimine dokununca bildirim merkezine git
  useEffect(() => {
    const abone = Notifications.addNotificationResponseReceivedListener(() => {
      router.push('/bildirimler');
    });
    return () => abone.remove();
  }, [router]);

  return (
    <BildirimCtx.Provider value={{ okunmamis, yenile }}>
      {children}
    </BildirimCtx.Provider>
  );
}
