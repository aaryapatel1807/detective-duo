'use client';

import { useEffect, useState } from 'react';
import SoloQuickShell from '@/components/quickgames/SoloQuickShell';
import { QuoridorView } from '@/components/quickgames/BoardViews';
import {
  applyQuoridorMove,
  initialQuoridor,
  quoridorBotMove,
  quoridorWinner,
  type QuoridorMove,
  type QuoridorState,
} from '@/lib/quickgames/quoridor';

function QuoridorSolo({
  level,
  seed,
  disabled,
  onFinish,
}: {
  level: number;
  seed: string;
  disabled: boolean;
  onFinish: (won: boolean) => void;
}) {
  const [state, setState] = useState<QuoridorState>(() => initialQuoridor(level));
  const winner = quoridorWinner(state);

  useEffect(() => {
    if (winner !== null) {
      onFinish(winner === 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [winner]);

  useEffect(() => {
    if (state.turn !== 1 || winner !== null || disabled) return;
    const t = setTimeout(() => {
      setState((prev) => {
        if (quoridorWinner(prev) !== null) return prev;
        return applyQuoridorMove(prev, quoridorBotMove(prev, level, seed));
      });
    }, 600);
    return () => clearTimeout(t);
  }, [state, winner, disabled, level, seed]);

  const move = (m: QuoridorMove) => {
    setState((prev) => (prev.turn === 0 ? applyQuoridorMove(prev, m) : prev));
  };

  return (
    <QuoridorView
      state={state}
      onMove={move}
      myTurn={state.turn === 0}
      disabled={disabled}
      meLabel="You"
      foeLabel="Bot"
    />
  );
}

export default function QuoridorPage() {
  return (
    <SoloQuickShell
      gameId="quoridor"
      title="Quoridor"
      blurb="Race your pawn to the far edge. Each turn, step one square or drop a fence in your rival's way — a fence may slow the route, never seal it."
    >
      {({ level, seed, disabled, onFinish }) => (
        <QuoridorSolo level={level} seed={seed} disabled={disabled} onFinish={onFinish} />
      )}
    </SoloQuickShell>
  );
}
