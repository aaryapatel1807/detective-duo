'use client';

import SoloQuickShell from '@/components/quickgames/SoloQuickShell';
import { BridgeView } from '@/components/quickgames/RaceViews';

export default function BridgePage() {
  return (
    <SoloQuickShell
      gameId="the-bridge"
      title="The Bridge"
      blurb="Two unrelated words face each other across a chasm. Race a word-ladder bridge between them — every plank a real word one letter off the last."
    >
      {({ level, seed, disabled, onFinish }) => (
        <BridgeView seed={seed} level={level} mode="solo" disabled={disabled} onFinish={onFinish} />
      )}
    </SoloQuickShell>
  );
}
