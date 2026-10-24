'use client';

import SoloQuickShell from '@/components/quickgames/SoloQuickShell';
import { CheckboxRaceView } from '@/components/quickgames/RaceViews';

export default function CheckboxRacePage() {
  return (
    <SoloQuickShell
      gameId="checkbox-race"
      title="Checkbox Race"
      blurb="One player calls a number, the other hunts it in a cloud of digits. Fill your target first — against the bot, or in a room with your partner."
    >
      {({ level, seed, disabled, onFinish }) => (
        <CheckboxRaceView
          seed={seed}
          level={level}
          mode="solo"
          disabled={disabled}
          onFinish={onFinish}
        />
      )}
    </SoloQuickShell>
  );
}
