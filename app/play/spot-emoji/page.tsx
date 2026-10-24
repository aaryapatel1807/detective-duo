'use client';

import SoloQuickShell from '@/components/quickgames/SoloQuickShell';
import { SpotEmojiView } from '@/components/quickgames/RaceViews';

export default function SpotEmojiPage() {
  return (
    <SoloQuickShell
      gameId="spot-emoji"
      title="Speed Spot-the-Emoji"
      blurb="Two cards, six pictures each, exactly one shared. Find the twin and tap it before your rival does."
    >
      {({ level, seed, disabled, onFinish }) => (
        <SpotEmojiView seed={seed} level={level} mode="solo" disabled={disabled} onFinish={onFinish} />
      )}
    </SoloQuickShell>
  );
}
