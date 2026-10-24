'use client';

import SoloQuickShell from '@/components/quickgames/SoloQuickShell';
import SnakeView from '@/components/quickgames/SnakeView';
import { snakeTargetForLevel } from '@/lib/quickgames/snake';

export default function SnakeArenaPage() {
  return (
    <SoloQuickShell
      gameId="snake-arena"
      title="Snake Arena"
      blurb="Real-time snakes in one arena. Fruit grows you, stars are worth more, shields save one crash — first to the target, or last snake alive, wins."
    >
      {({ level, seed, disabled, onFinish }) => (
        <SnakeView
          seed={seed}
          level={level}
          target={snakeTargetForLevel(level)}
          mode="solo"
          disabled={disabled}
          onFinish={onFinish}
        />
      )}
    </SoloQuickShell>
  );
}
