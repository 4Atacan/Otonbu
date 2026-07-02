import { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, StyleProp, ViewStyle } from 'react-native';

// Klavye açılınca içeriği yukarı iter ki formun altı (butonlar vb.) erişilebilir
// kalsın. Form ekranlarını/modallarını bununla sar; içindeki ScrollView'a
// keyboardShouldPersistTaps="handled" + yeterli alt boşluk ver.
export function KlavyeKapsa({
  children, style, offset = 0,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  offset?: number;
}) {
  return (
    <KeyboardAvoidingView
      style={[{ flex: 1 }, style]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={offset}
    >
      {children}
    </KeyboardAvoidingView>
  );
}
