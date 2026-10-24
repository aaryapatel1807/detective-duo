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
import { getSupabase } from '@/lib/supabase/client';
import SoundEngine from './SoundEngine';

const STORAGE_KEY = 'dd-v2-theme';

interface ThemeCtx {
  theme: ThemeId;
  /** Apply + persist a theme choice. */
  setTheme: (t: ThemeId) => void;
  /** The signed-in user's id, or null (local mode). */
  userId: string | null;
}

const Ctx = createContext<ThemeCtx>({ theme: 'noir', setTheme: () => {}, userId: null });

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
  const [theme, setThemeState] = useState<ThemeId>('noir');
  const [userId, setUserId] = useState<string | null>(null);

  // Pre-login choice lives in localStorage; on sign-in the profile wins.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (isThemeId(saved)) setThemeState(saved);
    } catch {
      /* ignore */
    }
    const sb = getSupabase();
    if (!sb) return;
    let active = true;
    sb.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      const uid = data.session?.user.id ?? null;
      setUserId(uid);
      if (uid) {
        const { data: profile } = await sb
          .from('profiles')
          .select('theme')
          .eq('id', uid)
          .maybeSingle();
        if (active && profile && isThemeId(profile.theme)) {
          setThemeState(profile.theme as ThemeId);
        }
      }
    });
    const { data: sub } = sb.auth.onAuthStateChange((_evt, session) => {
      setUserId(session?.user.id ?? null);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const setTheme = useCallback(
    (t: ThemeId) => {
      setThemeState(t);
      try {
        localStorage.setItem(STORAGE_KEY, t);
      } catch {
        /* ignore */
      }
      const sb = getSupabase();
      if (sb && userId) {
        void sb.from('profiles').update({ theme: t }).eq('id', userId);
      }
    },
    [userId],
  );

  return <Ctx.Provider value={{ theme, setTheme, userId }}>{children}<SoundEngine /></Ctx.Provider>;
}
