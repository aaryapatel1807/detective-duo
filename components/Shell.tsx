'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Home, Settings, SunMoon } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { THEME_IDS, THEMES } from '@/lib/themes';
import { OfflineBanner } from '@/lib/offline';
import { loadLocalProgress, syncProgress } from '@/lib/progress';

/** Top bar: wordmark, quick theme toggle (cycles + saves), nav. */
export default function Shell() {
  const { theme, setTheme } = useTheme();
  const cycle = () => {
    const i = THEME_IDS.indexOf(theme);
    setTheme(THEME_IDS[(i + 1) % THEME_IDS.length]);
  };

  // Reconnect: when the network comes back, push any progress queued
  // while offline, then pull + merge. (Phase 4 offline queue.)
  useEffect(() => {
    const onOnline = () => {
      void syncProgress(loadLocalProgress());
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, []);

  return (
    <>
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-4">
        <Link href="/" className="font-display text-xl font-bold tracking-tight">
          Detective Duo
        </Link>
        <nav className="flex items-center gap-2">
          <button
            type="button"
            onClick={cycle}
            className="btn !px-3 !py-2 text-sm"
            aria-label={`Theme: ${THEMES[theme].label}. Switch theme`}
            title={`Theme: ${THEMES[theme].label}`}
          >
            <SunMoon size={18} aria-hidden />
            <span className="hidden sm:inline">{THEMES[theme].label}</span>
          </button>
          <Link href="/" className="btn !px-3 !py-2 text-sm">
            <Home size={18} aria-hidden /> <span className="hidden sm:inline">Home</span>
          </Link>
          <Link href="/settings" className="btn !px-3 !py-2 text-sm">
            <Settings size={18} aria-hidden /> <span className="hidden sm:inline">Settings</span>
          </Link>
        </nav>
      </header>
      <OfflineBanner />
    </>
  );
}
