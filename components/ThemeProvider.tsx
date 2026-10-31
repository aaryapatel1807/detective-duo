'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { THEMES, isThemeId, type ThemeId } from '@/lib/themes';
import BlueSky from './BlueSky';
import CandyHearts from './CandyHearts';
import CherryPetals from './CherryPetals';
import Fireflies from './Fireflies';
import NoirRain from './NoirRain';
import SoundEngine from './SoundEngine';

const STORAGE_KEY = 'dd-v2-theme';

interface ThemeCtx {
  theme: ThemeId;
  /** Apply + persist a theme choice. */
  setTheme: (t: ThemeId) => void;
  /**
   * Always null: the site has no accounts. Progress, date-night lists
   * and together identities are per-device (localStorage / per-tab id),
   * and every consumer already handles a null user id.
   */
  userId: string | null;
}

const Ctx = createContext<ThemeCtx>({ theme: 'candy', setTheme: () => {}, userId: null });

export const useTheme = () => useContext(Ctx);

/** Renders the [data-theme] token blocks from lib/themes.ts (single source). */
export function ThemeStyle() {
  const css = Object.values(THEMES)
    .map((t) => {
      const vars = Object.entries(t.tokens)
        .map(([k, v]) => `${k}:${v};`)
        .join('');
      return `[data-theme='${t.id}']{${vars}}`;
    })
    .join('\n');
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>('candy');

  // The theme choice lives in localStorage only.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (isThemeId(saved)) setThemeState(saved);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const setTheme = useCallback((t: ThemeId) => {
    setThemeState(t);
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <Ctx.Provider value={{ theme, setTheme, userId: null }}>
      {children}
      {theme === 'violet' && <Fireflies />}
      {theme === 'blue' && <BlueSky />}
      {theme === 'noir' && <NoirRain />}
      {theme === 'candy' && <CandyHearts />}
      {theme === 'cherry' && <CherryPetals />}
      <SoundEngine />
    </Ctx.Provider>
  );
}
