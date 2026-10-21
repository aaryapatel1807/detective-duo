'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type Theme = 'dark' | 'light' | 'duo-blue' | 'duo-candy';

/** Toggle order: noir desk → case-file paper → Duo Blue → Duo Candy → back to noir. */
const THEME_ORDER: Theme[] = ['dark', 'light', 'duo-blue', 'duo-candy'];
const THEME_KEY = 'dd-theme';

export function isTheme(v: unknown): v is Theme {
  return v === 'dark' || v === 'light' || v === 'duo-blue' || v === 'duo-candy';
}

export function nextTheme(t: Theme): Theme {
  return THEME_ORDER[(THEME_ORDER.indexOf(t) + 1) % THEME_ORDER.length];
}

const ThemeCtx = createContext<{ theme: Theme; toggle: () => void; setTheme: (t: Theme) => void }>({
  theme: 'dark',
  toggle: () => {},
  setTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeCtx);
}

/** Dark-first; light = "case-file paper"; duo-blue = bright CRYPDINO blue; duo-candy = warm cream edu-playful. Persisted in localStorage. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark');

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(THEME_KEY);
      if (isTheme(saved)) setThemeState(saved);
    } catch {}
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      window.localStorage.setItem(THEME_KEY, theme);
    } catch {}
  }, [theme]);

  const setTheme = (t: Theme) => setThemeState(t);
  const toggle = () => setThemeState((t) => nextTheme(t));

  return <ThemeCtx.Provider value={{ theme, toggle, setTheme }}>{children}</ThemeCtx.Provider>;
}
