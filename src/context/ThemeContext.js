// src/context/ThemeContext.js
// A genuinely working "Dark Mode" - unlike the old Settings toggles this
// backs, this one actually changes what's on screen. `theme` is persisted
// on-device (AsyncStorage) so it survives app restarts, and `colors` here
// is the live palette (light or dark) that any screen can read via
// useTheme() to re-color itself immediately when the switch is flipped.
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { lightColors, darkColors } from '../theme/colors';

const STORAGE_KEY = 'appearance:theme';

const ThemeContext = createContext(undefined);

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState('light'); // 'light' | 'dark'
  const [ready, setReady] = useState(false);

  // Load whatever the user picked last time, once, on app start.
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (saved === 'dark' || saved === 'light') {
          setThemeState(saved);
        }
      })
      .catch((err) => console.log('Could not load saved theme:', err?.message))
      .finally(() => setReady(true));
  }, []);

  const setTheme = (next) => {
    setThemeState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch((err) =>
      console.log('Could not save theme:', err?.message)
    );
  };

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  const value = useMemo(
    () => ({
      theme,
      isDark: theme === 'dark',
      colors: theme === 'dark' ? darkColors : lightColors,
      setTheme,
      toggleTheme,
      ready,
    }),
    [theme, ready]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used inside a <ThemeProvider>');
  }
  return ctx;
}
