import {
  ReactNode, createContext, useContext, useEffect, useState,
} from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export type Tema = 'acik' | 'koyu';

export interface Renkler {
  bg: string;        // ekran zemini
  card: string;      // kart / panel zemini
  text: string;      // ana metin
  subtext: string;   // ikincil metin
  border: string;
  input: string;     // input zemini
  primary: string;
  primaryText: string;
  danger: string;
  rozetBg: string;   // bilgi rozeti zemini
}

export const ACIK: Renkler = {
  bg: '#f5f5f5',
  card: '#ffffff',
  text: '#0f172a',
  subtext: '#64748b',
  border: '#e2e8f0',
  input: '#ffffff',
  primary: '#1a56db',
  primaryText: '#ffffff',
  danger: '#dc2626',
  rozetBg: '#eff6ff',
};

export const KOYU: Renkler = {
  bg: '#0f172a',
  card: '#1e293b',
  text: '#f1f5f9',
  subtext: '#94a3b8',
  border: '#334155',
  input: '#0f172a',
  primary: '#3b82f6',
  primaryText: '#ffffff',
  danger: '#f87171',
  rozetBg: '#1e3a5f',
};

const TEMA_KEY = 'otonbu_tema';

// SecureStore web'de yok; web için localStorage'a düş
async function temaOku(): Promise<Tema | null> {
  try {
    const v = Platform.OS === 'web'
      ? globalThis.localStorage?.getItem(TEMA_KEY)
      : await SecureStore.getItemAsync(TEMA_KEY);
    return v === 'koyu' || v === 'acik' ? v : null;
  } catch { return null; }
}

async function temaYaz(tema: Tema) {
  try {
    if (Platform.OS === 'web') globalThis.localStorage?.setItem(TEMA_KEY, tema);
    else await SecureStore.setItemAsync(TEMA_KEY, tema);
  } catch {}
}

interface ThemeContextValue {
  tema: Tema;
  renkler: Renkler;
  setTema: (t: Tema) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  tema: 'acik',
  renkler: ACIK,
  setTema: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [tema, setTemaState] = useState<Tema>('acik');

  useEffect(() => {
    temaOku().then(t => { if (t) setTemaState(t); });
  }, []);

  function setTema(t: Tema) {
    setTemaState(t);
    temaYaz(t);
  }

  return (
    <ThemeContext.Provider
      value={{ tema, renkler: tema === 'koyu' ? KOYU : ACIK, setTema }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
