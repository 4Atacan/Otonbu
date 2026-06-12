import { StyleSheet, Text, TextInput, View } from 'react-native';

interface Props {
  value: string;             // 10 haneli ham rakamlar: "5232852960"
  onChange: (digits: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

// "5232852960" -> "523 285 29 60"
export function formatTrPhone(digits: string): string {
  const d = digits.replace(/\D/g, '').slice(0, 10);
  const p1 = d.slice(0, 3);
  const p2 = d.slice(3, 6);
  const p3 = d.slice(6, 8);
  const p4 = d.slice(8, 10);
  return [p1, p2, p3, p4].filter(Boolean).join(' ');
}

// 10 haneli rakam -> E.164: "+905232852960"
export function toE164(digits: string): string {
  return '+90' + digits.replace(/\D/g, '').slice(0, 10);
}

export function isValidTrPhone(digits: string): boolean {
  const d = digits.replace(/\D/g, '');
  return d.length === 10 && d.startsWith('5');
}

export function PhoneInput({ value, onChange, placeholder, autoFocus }: Props) {
  function handleChange(text: string) {
    const onlyDigits = text.replace(/\D/g, '').slice(0, 10);
    onChange(onlyDigits);
  }

  return (
    <View style={s.row}>
      <View style={s.prefix}>
        <Text style={s.flag}>🇹🇷</Text>
        <Text style={s.code}>+90</Text>
      </View>
      <TextInput
        style={s.input}
        value={formatTrPhone(value)}
        onChangeText={handleChange}
        placeholder={placeholder ?? '523 285 29 60'}
        keyboardType="phone-pad"
        autoComplete="tel"
        maxLength={13}             // "523 285 29 60" = 13 karakter
        autoFocus={autoFocus}
      />
    </View>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: '#ddd', borderRadius: 10,
    backgroundColor: '#fff', marginBottom: 16,
  },
  prefix: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingLeft: 14, paddingRight: 10, paddingVertical: 14,
    borderRightWidth: 1, borderRightColor: '#eee',
  },
  flag: { fontSize: 18 },
  code: { fontSize: 16, color: '#0f172a', fontWeight: '600' },
  input: { flex: 1, padding: 14, fontSize: 16 },
});
