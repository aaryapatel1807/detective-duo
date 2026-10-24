'use client';

import { useEffect } from 'react';
import { useTheme } from './ThemeProvider';
import {
  SOUND_CHANGED_EVENT,
  loadSoundSettings,
  playUiSound,
  startAmbient,
  stopAmbient,
} from '@/lib/sound';

/**
 * Sound engine, mounted once inside ThemeProvider.
 *
 * - Clicks on buttons and game tiles play the current theme's soft UI
 *   sound — but only if UI sounds are switched on in Settings (off by
 *   default). The listener is passive: it never prevents the click.
 * - Ambient sound never starts on page load by itself. If it was left on
 *   in Settings, it starts on the next tap/click (a user gesture, which
 *   is also what browsers require for audio); toggling it in Settings
 *   starts it immediately, because that toggle IS the gesture.
 * - On unmount / setting change, ambient stops first, then restarts only
 *   if still wanted.
 */
export default function SoundEngine() {
  const { theme } = useTheme();

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = e.target as HTMLElement | null;
      if (el?.closest?.('.btn, .game-tile')) playUiSound(theme);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [theme]);

  useEffect(() => {
    let started = false;
    const maybeStart = () => {
      if (started) return;
      const s = loadSoundSettings();
      if (s.ambient !== 'off') {
        started = true;
        startAmbient(s.ambient);
      }
    };
    const onChange = () => {
      const s = loadSoundSettings();
      stopAmbient();
      started = false;
      // A settings change is itself a user gesture: start at once.
      if (s.ambient !== 'off') {
        started = true;
        startAmbient(s.ambient);
      }
    };
    const onGesture = () => maybeStart();
    document.addEventListener('pointerdown', onGesture);
    window.addEventListener(SOUND_CHANGED_EVENT, onChange);
    return () => {
      document.removeEventListener('pointerdown', onGesture);
      window.removeEventListener(SOUND_CHANGED_EVENT, onChange);
      stopAmbient();
    };
  }, []);

  return null;
}
