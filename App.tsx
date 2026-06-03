import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Sentry from '@sentry/react-native';
import { initSentry } from './src/lib/sentry';
import { supabase } from './src/lib/supabase';

initSentry();

export default Sentry.wrap(function App() {
  const [supabaseStatus, setSupabaseStatus] = useState<'bekliyor' | 'bağlı' | 'hata'>('bekliyor');

  useEffect(() => {
    supabase.auth.getSession().then(({ error }) => {
      setSupabaseStatus(error ? 'hata' : 'bağlı');
    });
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>OTONBU GARAGE</Text>
      <Text style={styles.status}>Supabase: {supabaseStatus}</Text>
      <StatusBar style="auto" />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  status: {
    fontSize: 14,
    color: '#666',
  },
});
