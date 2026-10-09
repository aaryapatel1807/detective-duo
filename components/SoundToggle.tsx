'use client';

import { useEffect, useState } from 'react';
import { isMuted, setMuted } from '../lib/sound';

/** Sound on/off toggle for the sidebar. */
export function SoundToggle() {
  const [muted, setM] = useState(true);

  useEffect(() => setM(isMuted()), []);

  const toggle = () => {
    const next = !muted;
    setMuted(next);
    setM(next);
  };

  return (
    <button
      onClick={toggle}
      className="noir-btn-ghost flex w-full items-center justify-between !py-2.5 text-left"
      aria-pressed={!muted}
      title="Toggle sound effects"
    >
      <span>🔊 Sound FX</span>
      <span className="text-[0.7rem]">{muted ? 'OFF' : 'ON'}</span>
    </button>
  );
}
