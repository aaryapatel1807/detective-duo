'use client';

import SoloQuickShell from '@/components/quickgames/SoloQuickShell';
import { JinxView } from '@/components/quickgames/RaceViews';

export default function JinxPage() {
  return (
    <SoloQuickShell
      gameId="jinx"
      title="Jinx"
      blurb="The same nine letters for both of you. Find every word hiding in them — any word you both found is a JINX and scores for nobody."
    >
      {({ level, seed, disabled, onFinish }) => (
        <JinxView seed={seed} level={level} mode="solo" disabled={disabled} onFinish={onFinish} />
      )}
    </SoloQuickShell>
  );
}
