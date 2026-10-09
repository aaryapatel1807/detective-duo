'use client';

import { useEffect } from 'react';
import { unlockAudio } from '../lib/sound';

/** Unlocks WebAudio on the first user interaction (autoplay policy). */
export function AudioUnlocker() {
  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);
  return null;
}
