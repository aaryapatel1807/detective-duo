'use client';

import SoloQuickShell from '@/components/quickgames/SoloQuickShell';
import { UnoSlapView } from '@/components/quickgames/RaceViews';

export default function UnoSlapPage() {
  return (
    <SoloQuickShell
      gameId="uno-slap"
      title="Uno Slap"
      blurb="Lay cards counting one to ten out loud. The instant a card matches the spoken number, slap the pile — a wrong slap costs a point."
    >
      {({ level, seed, disabled, onFinish }) => (
        <UnoSlapView seed={seed} level={level} mode="solo" disabled={disabled} onFinish={onFinish} />
      )}
    </SoloQuickShell>
  );
}
