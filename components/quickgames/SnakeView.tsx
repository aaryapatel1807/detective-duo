'use client';

/**
 * Snake arena view: a ticking grid, keyboard arrows (or the on-screen
 * pad) to steer. Solo mode runs a bot snake in the same arena; versus
 * mode runs a parallel arena on the same seed and reports score
 * progress up to the room wrapper.
 */
import { useEffect, useRef, useState } from 'react';
import {
  initialSnake,
  snakeBotDir,
  snakeProgress,
  snakeTickMsForLevel,
  stepSnake,
  SNAKE_SIZE,
  type SnakeDir,
  type SnakeState,
} from '@/lib/quickgames/snake';
import { ProgressBars } from '@/components/together/VersusViews';

export default function SnakeView({
  seed,
  level,
  target,
  mode,
  opponentPct,
  opponentName,
  disabled,
  onProgress,
  onFinish,
}: {
  seed: string;
  level: number;
  target: number;
  mode: 'solo' | 'versus';
  opponentPct?: number;
  opponentName?: string;
  disabled?: boolean;
  onProgress?: (pct: number) => void;
  onFinish?: (won: boolean) => void;
}) {
  const [state, setState] = useState<SnakeState>(() =>
    initialSnake(seed, mode === 'solo'),
  );
  const dirRef = useRef<SnakeDir>('right');
  const finishedRef = useRef(false);
  const tickMs = snakeTickMsForLevel(level);

  const finished =
    state.over ||
    state.score >= target ||
    (state.other !== null && !state.otherAlive) ||
    state.otherScore >= target;

  useEffect(() => {
    if (disabled || finished) return;
    const t = setInterval(() => {
      setState((prev) => {
        if (prev.over) return prev;
        const botDir = prev.other ? snakeBotDir(prev) : prev.otherDir;
        return stepSnake(
          { ...prev, dir: dirRef.current, otherDir: botDir },
          `${seed}|${prev.score}|${prev.snake.length}`,
        );
      });
    }, tickMs);
    return () => clearInterval(t);
  }, [disabled, finished, seed, tickMs]);

  useEffect(() => {
    if (!finished || finishedRef.current) return;
    finishedRef.current = true;
    if (mode === 'solo') {
      const won =
        state.score >= target ||
        (state.other !== null && !state.otherAlive && state.alive);
      onFinish?.(won);
    } else {
      onProgress?.(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  useEffect(() => {
    if (mode === 'versus') onProgress?.(snakeProgress(target, state.score));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.score]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, SnakeDir> = {
        ArrowUp: 'up',
        ArrowDown: 'down',
        ArrowLeft: 'left',
        ArrowRight: 'right',
        w: 'up',
        s: 'down',
        a: 'left',
        d: 'right',
      };
      const next = map[e.key];
      if (!next) return;
      const opposite: Record<SnakeDir, SnakeDir> = {
        up: 'down',
        down: 'up',
        left: 'right',
        right: 'left',
      };
      if (next !== opposite[dirRef.current]) {
        dirRef.current = next;
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const pickupGlyph = (kind: string) =>
    kind === 'fruit' ? '●' : kind === 'star' ? '★' : kind === 'shield' ? '◈' : '⚡';

  return (
    <div>
      {mode === 'versus' && (
        <ProgressBars
          rows={[
            { name: 'You', pct: snakeProgress(target, state.score), isMe: true },
            { name: opponentName ?? 'Partner', pct: opponentPct ?? 0, isMe: false },
          ]}
        />
      )}
      {mode === 'solo' && (
        <div className="panel p-4">
          <p className="flex justify-between text-sm font-semibold">
            <span>
              You — {state.score} / {target}
            </span>
            <span>
              Bot — {state.otherScore}
              {state.shields > 0 ? ` · Shields ${state.shields}` : ''}
            </span>
          </p>
        </div>
      )}
      <div
        className="mx-auto mt-4 grid max-w-md rounded-xl border"
        style={{
          gridTemplateColumns: `repeat(${SNAKE_SIZE}, 1fr)`,
          borderColor: 'var(--line)',
          background: 'var(--surface)',
        }}
      >
        {Array.from({ length: SNAKE_SIZE * SNAKE_SIZE }, (_, i) => {
          const x = i % SNAKE_SIZE;
          const y = Math.floor(i / SNAKE_SIZE);
          const mine = state.snake.some((c) => c.x === x && c.y === y);
          const botCell = state.other?.some((c) => c.x === x && c.y === y);
          const pickup = state.pickups.find((p) => p.at.x === x && p.at.y === y);
          return (
            <span
              key={i}
              className="flex aspect-square items-center justify-center text-xs"
              style={{
                background: mine
                  ? 'var(--accent)'
                  : botCell
                    ? 'var(--ink-dim)'
                    : 'transparent',
                color: pickup ? 'var(--accent)' : 'white',
              }}
            >
              {pickup ? pickupGlyph(pickup.kind) : ''}
            </span>
          );
        })}
      </div>
      <div className="mt-3 flex justify-center gap-2">
        {(['up', 'left', 'down', 'right'] as SnakeDir[]).map((d) => (
          <button
            key={d}
            type="button"
            className="btn"
            disabled={disabled || finished}
            onClick={() => {
              const opposite: Record<SnakeDir, SnakeDir> = {
                up: 'down',
                down: 'up',
                left: 'right',
                right: 'left',
              };
              if (d !== opposite[dirRef.current]) dirRef.current = d;
            }}
            aria-label={`Steer ${d}`}
          >
            {d === 'up' ? '↑' : d === 'down' ? '↓' : d === 'left' ? '←' : '→'}
          </button>
        ))}
      </div>
      <p className="mt-2 text-center text-sm text-[var(--ink-dim)]">
        {finished
          ? state.score >= target || (state.other !== null && !state.otherAlive)
            ? 'You win this round.'
            : 'The round got away — try again.'
          : 'Arrow keys or the pad to steer. Fruit grows you, stars are worth more, shields save one crash.'}
      </p>
    </div>
  );
}
