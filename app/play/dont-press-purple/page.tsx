'use client';

import SoloQuickShell from '@/components/quickgames/SoloQuickShell';
import { PurpleView } from '@/components/quickgames/RaceViews';

export default function PurplePage() {
  return (
    <SoloQuickShell
      gameId="dont-press-purple"
      title="Don't Press Purple"
      blurb="Tap when it lights up teal. When it flashes violet, keep your hands still. The prompts set the pace — no countdown on you."
    >
      {({ level, seed, disabled, onFinish }) => (
        <PurpleView seed={seed} level={level} mode="solo" disabled={disabled} onFinish={onFinish} />
      )}
    </SoloQuickShell>
  );
}
