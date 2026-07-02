import { uyari } from '../lib/uyari';
import { UyariKatmani } from './UyariProvider';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Modal, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useTheme } from '../theme/ThemeContext';
import { useSession } from '../hooks/useSession';
import { Appointment, Branch, IsDurum, RandevuDurum } from '../types';

const RANDEVU_ETIKET: Record<RandevuDurum, string> = {
  beklemede: 'Beklemede', onayli: 'Onaylı', iptal: 'İptal',
};
const IS_ETIKET: Record<IsDurum, string> = {
  basladi: 'Başladı', tamamlandi: 'Tamamlandı', hazir: 'Hazır',
};

// YEREL gün → YYYY-MM-DD (UTC kayması olmadan)
function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function parseYmd(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return isNaN(d.getTime()) ? null : d;
}
function gunOnce(n: number): Date {
  const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - n); return d;
}

interface Props { visible: boolean; onClose: () => void; }

export function RaporModal({ visible, onClose }: Props) {
  const { renkler } = useTheme();
  const { profile } = useSession();
  const isAdmin = profile?.rol === 'admin';
  const [basMetin, setBasMetin] = useState(ymd(gunOnce(6)));
  const [sonMetin, setSonMetin] = useState(ymd(gunOnce(0)));
  const [kayitlar, setKayitlar] = useState<Appointment[]>([]);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [aktariliyor, setAktariliyor] = useState(false);
  const [getirildi, setGetirildi] = useState(false);

  // Admin tüm şubeleri çekebilir → şube seçici (null = tüm şubeler)
  const [subeler, setSubeler] = useState<Branch[]>([]);
  const [secilenSube, setSecilenSube] = useState<string | null>(null);

  // Açılışta son 7 günü otomatik getir; admin ise şube listesini çek
  useEffect(() => {
    if (!visible) return;
    setSecilenSube(null);
    if (isAdmin) {
      supabase.from('branches').select('*').eq('aktif', true).order('ad')
        .then(({ data }) => setSubeler((data as Branch[]) ?? []));
    }
    const b = ymd(gunOnce(6)), s = ymd(gunOnce(0));
    setBasMetin(b); setSonMetin(s);
    getir(b, s, null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  function presetSec(tip: 'bugun' | '7' | 'ay' | '30') {
    const s = gunOnce(0);
    let b: Date;
    if (tip === 'bugun') b = gunOnce(0);
    else if (tip === '7') b = gunOnce(6);
    else if (tip === '30') b = gunOnce(29);
    else b = new Date(s.getFullYear(), s.getMonth(), 1);
    setBasMetin(ymd(b)); setSonMetin(ymd(s));
    getir(ymd(b), ymd(s));
  }

  async function getir(bs?: string, sn?: string, branchId?: string | null) {
    const b = parseYmd(bs ?? basMetin);
    const s = parseYmd(sn ?? sonMetin);
    if (!b || !s) { uyari('Tarih', 'Tarihleri YYYY-AA-GG biçiminde gir (örn. 2026-06-01).'); return; }
    if (b.getTime() > s.getTime()) { uyari('Tarih', 'Başlangıç, bitişten sonra olamaz.'); return; }
    const sonExcl = new Date(s); sonExcl.setDate(sonExcl.getDate() + 1);
    // branchId açıkça verilmezse mevcut seçimi kullan (null = tüm şubeler)
    const sube = branchId === undefined ? secilenSube : branchId;

    setYukleniyor(true);
    // RLS: şube personeli kendi şubesini, admin tüm şubeleri görür.
    // Admin belirli bir şube seçtiyse o şubeye filtreler.
    let sorgu = supabase
      .from('appointments')
      .select(`
        *,
        users (ad_soyad, telefon),
        vehicles (plaka, marka, model),
        services (ad),
        branches (ad),
        jobs (durum)
      `)
      .neq('durum', 'iptal')
      .gte('baslangic', b.toISOString())
      .lt('baslangic', sonExcl.toISOString())
      .order('baslangic', { ascending: false })
      .limit(2000);
    if (sube) sorgu = sorgu.eq('branch_id', sube);
    const { data, error } = await sorgu;
    setYukleniyor(false);
    setGetirildi(true);
    if (error) { uyari('Hata', error.message); return; }
    setKayitlar((data as Appointment[]) ?? []);
  }

  function csvOlustur(): string {
    const head = ['Tarih', 'Saat', 'Müşteri', 'Telefon', 'Plaka', 'Araç', 'Hizmet', 'Şube', 'Randevu', 'İş'];
    const rows = kayitlar.map(r => {
      const d = r.baslangic ? new Date(r.baslangic) : null;
      const arac = [r.vehicles?.marka, r.vehicles?.model].filter(Boolean).join(' ');
      const is = r.jobs?.[0] ? IS_ETIKET[r.jobs[0].durum] : '—';
      return [
        d ? d.toLocaleDateString('tr-TR') : '',
        d ? d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '',
        r.users?.ad_soyad ?? '', r.users?.telefon ?? '',
        r.vehicles?.plaka ?? '', arac,
        r.services?.ad ?? '', r.branches?.ad ?? '',
        RANDEVU_ETIKET[r.durum], is,
      ];
    });
    const hucre = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
    // Türkçe Excel için ; ayracı; satır sonu CRLF
    return [head, ...rows].map(row => row.map(hucre).join(';')).join('\r\n');
  }

  async function disaAktar() {
    if (kayitlar.length === 0) { uyari('Veri yok', 'Aktarılacak kayıt yok.'); return; }
    setAktariliyor(true);
    try {
      // Native modüller yalnızca aktarım anında yüklenir (yoksa app çökmesin diye)
      const FileSystem: any = await import('expo-file-system/legacy');
      const Sharing: any = await import('expo-sharing');
      const icerik = '﻿' + csvOlustur();  // BOM → Excel UTF-8/Türkçe doğru açar
      const uri = (FileSystem.cacheDirectory ?? '') + `otonbu-rapor-${basMetin}_${sonMetin}.csv`;
      await FileSystem.writeAsStringAsync(uri, icerik, { encoding: 'utf8' });
      if (!(await Sharing.isAvailableAsync())) {
        uyari('Paylaşım yok', 'Bu cihazda dosya paylaşımı kullanılamıyor.');
        return;
      }
      await Sharing.shareAsync(uri, {
        mimeType: 'text/csv',
        dialogTitle: 'Raporu paylaş / kaydet',
        UTI: 'public.comma-separated-values-text',
      });
    } catch (e: any) {
      uyari('Aktarılamadı',
        'Excel aktarımı için uygulamanın güncel derlemesi gerekebilir (expo-sharing). ' + (e?.message ?? ''));
    } finally {
      setAktariliyor(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: renkler.bg }}>
        <View style={[s.baslikBar, { borderColor: renkler.border }]}>
          <Text style={[s.baslik, { color: renkler.text }]}>Raporlar</Text>
          <TouchableOpacity onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={26} color={renkler.subtext} />
          </TouchableOpacity>
        </View>

        <View style={s.ust}>
          {/* Şube seçici — yalnız admin (istediği şubenin raporunu çeker) */}
          {isAdmin && subeler.length > 0 && (
            <View>
              <Text style={[s.subeBaslik, { color: renkler.subtext }]}>ŞUBE</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.subeRow}>
                {[{ id: null as string | null, ad: 'Tüm şubeler' }, ...subeler].map(sube => {
                  const aktif = secilenSube === sube.id;
                  return (
                    <TouchableOpacity
                      key={sube.id ?? 'hepsi'}
                      style={[s.subeCip, { borderColor: aktif ? renkler.primary : renkler.border, backgroundColor: aktif ? renkler.primary : renkler.card }]}
                      onPress={() => { setSecilenSube(sube.id); getir(undefined, undefined, sube.id); }}
                    >
                      <Text style={{ color: aktif ? renkler.primaryText : renkler.text, fontSize: 13, fontWeight: '600' }}>
                        {sube.ad}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}
          <View style={s.presetRow}>
                {([
                  { v: 'bugun', l: 'Bugün' }, { v: '7', l: 'Son 7 gün' },
                  { v: 'ay', l: 'Bu ay' }, { v: '30', l: 'Son 30 gün' },
                ] as const).map(p => (
                  <TouchableOpacity
                    key={p.v}
                    style={[s.preset, { borderColor: renkler.border, backgroundColor: renkler.card }]}
                    onPress={() => presetSec(p.v)}
                  >
                    <Text style={[s.presetText, { color: renkler.primary }]}>{p.l}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={s.tarihRow}>
                <View style={s.tarihAlan}>
                  <Text style={[s.tarihLabel, { color: renkler.subtext }]}>Başlangıç</Text>
                  <TextInput
                    style={[s.tarihInput, { borderColor: renkler.border, backgroundColor: renkler.input, color: renkler.text }]}
                    placeholder="2026-06-01" placeholderTextColor={renkler.subtext}
                    autoCapitalize="none" value={basMetin} onChangeText={setBasMetin}
                  />
                </View>
                <View style={s.tarihAlan}>
                  <Text style={[s.tarihLabel, { color: renkler.subtext }]}>Bitiş</Text>
                  <TextInput
                    style={[s.tarihInput, { borderColor: renkler.border, backgroundColor: renkler.input, color: renkler.text }]}
                    placeholder="2026-06-20" placeholderTextColor={renkler.subtext}
                    autoCapitalize="none" value={sonMetin} onChangeText={setSonMetin}
                  />
                </View>
                <TouchableOpacity
                  style={[s.getirBtn, { backgroundColor: renkler.primary }]}
                  onPress={() => getir()}
                  disabled={yukleniyor}
                >
                  <Text style={[s.getirText, { color: renkler.primaryText }]}>Getir</Text>
                </TouchableOpacity>
              </View>

              <View style={s.ozetRow}>
                <Text style={[s.ozet, { color: renkler.text }]}>
                  {yukleniyor ? 'Yükleniyor…' : `${kayitlar.length} kayıt`}
                </Text>
                <TouchableOpacity
                  style={[s.aktarBtn, { borderColor: renkler.primary }, kayitlar.length === 0 && { opacity: 0.4 }]}
                  onPress={disaAktar}
                  disabled={aktariliyor || kayitlar.length === 0}
                >
                  {aktariliyor ? (
                    <ActivityIndicator color={renkler.primary} />
                  ) : (
                    <>
                      <Ionicons name="download-outline" size={16} color={renkler.primary} />
                      <Text style={[s.aktarText, { color: renkler.primary }]}>Excel'e Aktar</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
        <FlatList
          data={kayitlar}
          keyExtractor={r => r.id}
          contentContainerStyle={{ paddingBottom: 24 }}
          ListEmptyComponent={
            !yukleniyor && getirildi ? (
              <Text style={[s.bos, { color: renkler.subtext }]}>Bu aralıkta kayıt yok.</Text>
            ) : null
          }
          renderItem={({ item }) => {
            const d = item.baslangic ? new Date(item.baslangic) : null;
            const arac = [item.vehicles?.marka, item.vehicles?.model].filter(Boolean).join(' ');
            const is = item.jobs?.[0];
            return (
              <View style={[s.kart, { backgroundColor: renkler.card }]}>
                <View style={s.kartUst}>
                  <Text style={[s.kartTarih, { color: renkler.text }]}>
                    {d ? d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'}
                    {d ? ` · ${d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}` : ''}
                  </Text>
                  <Text style={[s.kartHizmet, { color: renkler.primary }]}>{item.services?.ad ?? 'Hizmet'}</Text>
                </View>
                <Text style={[s.kartDetay, { color: renkler.text }]}>
                  {item.users?.ad_soyad ?? 'Müşteri'} · {item.vehicles?.plaka ?? '—'}{arac ? ` (${arac})` : ''}
                </Text>
                <Text style={[s.kartAlt, { color: renkler.subtext }]}>
                  {item.branches?.ad ? `${item.branches.ad} · ` : ''}
                  {RANDEVU_ETIKET[item.durum]}{is ? ` · ${IS_ETIKET[is.durum]}` : ''}
                </Text>
              </View>
            );
          }}
        />
      </View>
      <UyariKatmani />
    </Modal>
  );
}

const s = StyleSheet.create({
  baslikBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 18, paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  baslik: { fontSize: 22, fontWeight: '800' },
  ust: { padding: 16, gap: 14 },
  subeBaslik: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 8 },
  subeRow: { gap: 8, paddingBottom: 2 },
  subeCip: { borderWidth: 1, borderRadius: 16, paddingVertical: 7, paddingHorizontal: 14 },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  preset: { borderWidth: 1, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 },
  presetText: { fontSize: 13, fontWeight: '700' },
  tarihRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  tarihAlan: { flex: 1 },
  tarihLabel: { fontSize: 12, marginBottom: 4 },
  tarihInput: { borderWidth: 1, borderRadius: 10, padding: 11, fontSize: 14 },
  getirBtn: { borderRadius: 10, paddingVertical: 12, paddingHorizontal: 18 },
  getirText: { fontSize: 14, fontWeight: '700' },
  ozetRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ozet: { fontSize: 15, fontWeight: '700' },
  aktarBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderRadius: 10, paddingVertical: 9, paddingHorizontal: 14,
  },
  aktarText: { fontSize: 14, fontWeight: '700' },
  bos: { textAlign: 'center', marginTop: 32, fontSize: 15 },
  kart: { marginHorizontal: 12, marginBottom: 10, padding: 14, borderRadius: 12 },
  kartUst: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  kartTarih: { fontSize: 14, fontWeight: '700' },
  kartHizmet: { fontSize: 14, fontWeight: '700' },
  kartDetay: { fontSize: 14, marginTop: 6 },
  kartAlt: { fontSize: 13, marginTop: 3 },
});
