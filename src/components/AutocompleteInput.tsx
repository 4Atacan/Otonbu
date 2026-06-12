import { useState } from 'react';
import {
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { filtrele } from '../data/arac-katalogu';

interface Props {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  maxOneri?: number;
}

// Yazdıkça options filtrelenir, öneriye dokununca değer dolar.
// Listede olmayan değer de yazılabilir (katalog dayatmaz).
// FlatList değil View: modal ScrollView içinde iç içe VirtualizedList
// uyarısına girmemek için.
export function AutocompleteInput({
  value, onChange, options, placeholder, maxOneri = 6,
}: Props) {
  const [odakta, setOdakta] = useState(false);

  const tamEslesme = options.some(
    o => o.toLocaleLowerCase('tr') === value.trim().toLocaleLowerCase('tr'),
  );
  const oneriler = odakta && !tamEslesme
    ? filtrele(options, value).slice(0, maxOneri)
    : [];

  return (
    <View style={s.wrap}>
      <TextInput
        style={s.input}
        placeholder={placeholder}
        autoCapitalize="none"
        autoCorrect={false}
        value={value}
        onChangeText={onChange}
        onFocus={() => setOdakta(true)}
        // blur, öneriye dokunma olayından önce tetiklenir; liste kapanıp
        // dokunuş boşa gitmesin diye kapanış geciktirilir
        onBlur={() => setTimeout(() => setOdakta(false), 150)}
      />
      {oneriler.length > 0 && (
        <View style={s.liste}>
          {oneriler.map(oneri => (
            <TouchableOpacity
              key={oneri}
              style={s.oneri}
              onPress={() => { onChange(oneri); setOdakta(false); }}
            >
              <Text style={s.oneriText}>{oneri}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { marginBottom: 16 },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 10,
    padding: 13, fontSize: 16, backgroundColor: '#fff',
  },
  liste: {
    borderWidth: 1, borderColor: '#ddd', borderTopWidth: 0,
    borderBottomLeftRadius: 10, borderBottomRightRadius: 10,
    backgroundColor: '#fff', marginTop: -8, paddingTop: 8,
  },
  oneri: {
    paddingVertical: 12, paddingHorizontal: 14,
    borderTopWidth: 1, borderTopColor: '#f1f5f9',
  },
  oneriText: { fontSize: 15, color: '#0f172a' },
});
