'use client';

import SoloQuickShell from '@/components/quickgames/SoloQuickShell';
import { SpotEmojiView } from '@/components/quickgames/RaceViews';

export default function SpotEmojiPage() {
  return (
    <SoloQuickShell
      gameId="spot-emoji"
      title="Speed Spot-the-Emoji"
      blurb="Two cards, exactly one shared picture. Find the twin and tap it before your rival does — no time limit, and cards grow denser as levels rise."
    >
      {({ level, seed, disabled, onFinish }) => (
        <SpotEmojiView seed={seed} level={level} mode="solo" disabled={disabled} onFinish={onFinish} />
      )}
    </SoloQuickShell>
  );
}
