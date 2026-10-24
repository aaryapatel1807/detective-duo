'use client';

/**
 * BotRaceBar: the versus-bot opponent's progress bar for the six main
 * games' solo pages. The bot is a pace, not a claimed solver (see
 * lib/together/versusBots.ts) — the bar says so, plainly.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { botPaceLabel, botProgressAt, botRaceDurationMs } from '@/lib/together/versusBots';

export function useBotRace(active: boolean, level: number, seed: string): {
  botPct: number;
  botFinished: boolean;
  durationMs: number;
} {
  const durationMs = useMemo(() => botRaceDurationMs(level, seed), [level, seed]);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(0);

  useEffect(() => {
    if (!active) return;
    startRef.current = Date.now();
    setElapsed(0);
    const t = setInterval(() => setElapsed(Date.now() - startRef.current), 250);
    return () => clearInterval(t);
  }, [active, durationMs]);

  return {
    botPct: botProgressAt(elapsed, durationMs),
    botFinished: elapsed >= durationMs && active,
    durationMs,
  };
}

export default function BotRaceBar({
  playerPct,
  botPct,
  level,
}: {
  playerPct: number;
  botPct: number;
  level: number;
}) {
  return (
    <div className="panel space-y-2 p-4">
      <p className="flex justify-between text-sm font-semibold">
        <span>You — {Math.round(playerPct * 100)}% done</span>
        <span>{Math.round(playerPct * 100)}%</span>
      </p>
      <div className="mt-1 h-3 overflow-hidden rounded-full bg-black/10">
        <div
          className="h-full rounded-full bg-[var(--accent)] transition-all"
          style={{ width: `${Math.round(playerPct * 100)}%` }}
        />
      </div>
      <p className="flex justify-between text-sm font-semibold">
        <span>
          Bot ({botPaceLabel(level)}) — {Math.round(botPct * 100)}% done
        </span>
        <span>{Math.round(botPct * 100)}%</span>
      </p>
      <div className="mt-1 h-3 overflow-hidden rounded-full bg-black/10">
        <div
          className="h-full rounded-full bg-[var(--ink-dim)] transition-all"
          style={{ width: `${Math.round(botPct * 100)}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-[var(--ink-dim)]">
        The bot is a pace, not a solver — it finishes on a timer so you have
        something to race. First to the full puzzle wins.
      </p>
    </div>
  );
}
