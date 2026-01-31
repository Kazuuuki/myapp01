import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, createElement, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ColorSchemeName, useColorScheme as useSystemColorScheme } from 'react-native';

export type ThemePreference = 'system' | 'light' | 'dark';

type ThemeContextValue = {
  preference: ThemePreference;
  setPreference: (next: ThemePreference) => void;
  colorScheme: 'light' | 'dark';
};

const STORAGE_KEY = 'theme_preference';

const ThemePreferenceContext = createContext<ThemeContextValue | null>(null);

function resolveColorScheme(preference: ThemePreference, systemScheme: ColorSchemeName): 'light' | 'dark' {
  if (preference === 'system') {
    return systemScheme === 'dark' ? 'dark' : 'light';
  }
  return preference;
}

export function ThemePreferenceProvider({ children }: { children: ReactNode }) {
  const systemScheme = useSystemColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => {
        if (!mounted) {
          return;
        }
        if (value === 'light' || value === 'dark' || value === 'system') {
          setPreferenceState(value);
        }
      })
      .finally(() => undefined);
    return () => {
      mounted = false;
    };
  }, []);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => undefined);
  }, []);

  const colorScheme = useMemo(
    () => resolveColorScheme(preference, systemScheme),
    [preference, systemScheme],
  );

  const value = useMemo<ThemeContextValue>(
    () => ({
      preference,
      setPreference,
      colorScheme,
    }),
    [preference, setPreference, colorScheme],
  );

  return createElement(ThemePreferenceContext.Provider, { value }, children);
}

export function useThemePreference() {
  const ctx = useContext(ThemePreferenceContext);
  if (!ctx) {
    throw new Error('useThemePreference must be used within ThemePreferenceProvider');
  }
  return ctx;
}

export function useAppColorScheme(): 'light' | 'dark' {
  const ctx = useContext(ThemePreferenceContext);
  if (!ctx) {
    return 'light';
  }
  return ctx.colorScheme;
}
