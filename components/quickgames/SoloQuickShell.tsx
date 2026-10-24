'use client';

/**
 * SoloQuickShell: the shared frame for quick-game solo pages — level
 * from progress, level navigation capped at the unlocked level, and
 * the win/lose panels. A quick-game win records stars for the round
 * (a win is a win; these are quick rounds, not hint-counted puzzles).
 */
import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft, ChevronLeft, ChevronRight, RotateCcw, Star } from 'lucide-react';
import { levelSeed, tierName } from '@/lib/generators/rng';
import {
  getGameProgress,
  loadLocalProgress,
  recordWin,
  type ProgressMap,
} from '@/lib/progress';
import { useTheme } from '@/components/ThemeProvider';

export default function SoloQuickShell({
  gameId,
  title,
  blurb,
  children,
}: {
  gameId: string;
  title: string;
  blurb: string;
  children: (p: {
    level: number;
    seed: string;
    disabled: boolean;
    onFinish: (won: boolean) => void;
  }) => ReactNode;
}) {
  const { userId } = useTheme();
  const salt = userId ?? 'guest';
  const [progress, setProgress] = useState<ProgressMap>({});
  const [level, setLevel] = useState(1);
  const [attempt, setAttempt] = useState(0);
  const [won, setWon] = useState<number | null>(null);
  const [lost, setLost] = useState(false);

  useEffect(() => {
    const map = loadLocalProgress();
    setProgress(map);
    setLevel(getGameProgress(map, gameId).currentLevel);
  }, [gameId]);

  const unlocked = Math.max(getGameProgress(progress, gameId).currentLevel, 1);
  const seed = levelSeed(gameId, level, salt);
  const done = won !== null || lost;

  const handleFinish = (isWin: boolean) => {
    if (done) return;
    if (isWin) {
      const { map, stars } = recordWin(progress, gameId, level, 0, 0);
      setProgress(map);
      setWon(stars);
    } else {
      setLost(true);
    }
  };

  const goLevel = (lv: number) => {
    setLevel(Math.max(1, Math.min(unlocked, lv)));
    setWon(null);
    setLost(false);
    setAttempt((a) => a + 1);
  };

  const replay = () => {
    setWon(null);
    setLost(false);
    setAttempt((a) => a + 1);
  };

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-16">
      <div className="mt-2">
        <Link href="/" className="btn !px-3 !py-2 text-sm">
          <ArrowLeft size={16} aria-hidden /> Home
        </Link>
      </div>
      <h1 className="mt-4 text-3xl font-bold">{title}</h1>
      <p className="mt-1 text-sm text-[var(--ink-dim)]">{blurb}</p>
      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          className="btn !px-3 !py-2"
          disabled={level <= 1}
          onClick={() => goLevel(level - 1)}
          aria-label="Previous level"
        >
          <ChevronLeft size={18} aria-hidden />
        </button>
        <span className="chip">
          Level {level} · {tierName(level)}
        </span>
        <button
          type="button"
          className="btn !px-3 !py-2"
          disabled={level >= unlocked}
          onClick={() => goLevel(level + 1)}
          aria-label="Next level"
        >
          <ChevronRight size={18} aria-hidden />
        </button>
        <button type="button" className="btn !px-3 !py-2" onClick={replay}>
          <RotateCcw size={16} aria-hidden /> Replay
        </button>
      </div>

      <div key={`${level}-${attempt}`} className="mt-4">
        {children({ level, seed, disabled: done, onFinish: handleFinish })}
      </div>

      {won !== null && (
        <section className="card mt-4 p-5 text-center">
          <p className="font-display text-2xl font-bold">Lovely round — you win.</p>
          <p className="mt-1 flex items-center justify-center gap-1 text-[var(--ink-dim)]">
            <Star size={16} aria-hidden /> {won} {won === 1 ? 'star' : 'stars'} for level{' '}
            {level}
          </p>
          <div className="mt-3 flex justify-center gap-2">
            <button type="button" className="btn btn-primary" onClick={() => goLevel(level + 1)}>
              Next level
            </button>
            <button type="button" className="btn" onClick={replay}>
              Play again
            </button>
          </div>
        </section>
      )}
      {lost && (
        <section className="card mt-4 p-5 text-center">
          <p className="font-display text-2xl font-bold">So close — the round got away.</p>
          <p className="mt-1 text-sm text-[var(--ink-dim)]">
            No harm done. Try again whenever you like.
          </p>
          <div className="mt-3 flex justify-center gap-2">
            <button type="button" className="btn btn-primary" onClick={replay}>
              Try again
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
