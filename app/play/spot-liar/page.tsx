'use client';

/**
 * Spot the Liar, solo (Duo Corner).
 * A made-up suspect, their case notes, and three statements. Exactly one
 * statement contradicts a note — that is the lie. More notes to
 * cross-check as levels climb.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { generateLiarRound } from '@/lib/generators/liarBank';
import { levelSeed } from '@/lib/generators/rng';
import {
  getGameProgress,
  loadLocalProgress,
  recordWin,
  type ProgressMap,
} from '@/lib/progress';
import { useTheme } from '@/components/ThemeProvider';
import { PlayHeader, WinPanel } from '@/components/duo/PlayBits';

const GAME_ID = 'spot-liar';

export default function SpotLiarPage() {
  const { userId } = useTheme();
  const salt = userId ?? 'guest';
  const [progress, setProgress] = useState<ProgressMap>({});
  const [level, setLevel] = useState(1);
  const [ruledOut, setRuledOut] = useState<number[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [won, setWon] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const loadedFor = useRef('');

  const myProgress = getGameProgress(progress, GAME_ID);
  const unlocked = Math.max(myProgress.currentLevel, 1);
  const round = useMemo(
    () => generateLiarRound(levelSeed(GAME_ID, level, salt), level),
    [level, salt],
  );

  useEffect(() => {
    const map = loadLocalProgress();
    setProgress(map);
    setLevel(getGameProgress(map, GAME_ID).currentLevel);
  }, []);

  useEffect(() => {
    const tag = `${salt}|${level}`;
    if (loadedFor.current === tag) return;
    loadedFor.current = tag;
    setRuledOut([]);
    setMistakes(0);
    setWon(null);
    setMsg(null);
  }, [level, salt]);

  const pick = (i: number) => {
    if (won !== null || ruledOut.includes(i)) return;
    if (i === round.lieIndex) {
      const { map, stars } = recordWin(progress, GAME_ID, level, 0, mistakes);
      setProgress(map);
      setWon(stars);
      setMsg('That is the lie. Well spotted.');
    } else {
      setMistakes((m) => m + 1);
      setRuledOut((r) => [...r, i]);
      setMsg('That one fits the notes. Rule it out and look again.');
    }
  };

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-16">
      <PlayHeader
        title="Spot the Liar"
        intro="Three statements, one lie. The case notes tell the truth — find the statement that does not fit them."
        level={level}
        unlocked={unlocked}
        onLevel={setLevel}
        bestStars={myProgress.stars[String(level)] ?? 0}
      />

      <section className="paper mt-4 p-4 sm:p-5">
        <h2 className="font-display text-lg font-bold">
          {round.suspect}, {round.role}
        </h2>
        <p className="mt-1 text-sm opacity-70">Case notes</p>
        <ul className="mt-2 space-y-1.5">
          {round.notes.map((n, i) => (
            <li key={i} className="text-sm">
              · {n}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-5">
        <h2 className="text-lg font-bold">What {round.suspect} says</h2>
        <div className="mt-2 space-y-2">
          {round.statements.map((s, i) => (
            <button
              key={i}
              type="button"
              className="card w-full p-4 text-left"
              disabled={won !== null || ruledOut.includes(i)}
              style={ruledOut.includes(i) ? { opacity: 0.45 } : undefined}
              onClick={() => pick(i)}
            >
              <span className="font-semibold">
                {i + 1}. {s}
              </span>
              {ruledOut.includes(i) && (
                <span className="ml-2 text-sm text-[var(--ink-dim)]">— ruled out</span>
              )}
            </button>
          ))}
        </div>
      </section>

      {msg && <p className="mt-3 text-sm font-semibold">{msg}</p>}
      {won !== null && (
        <>
          <p className="panel mt-3 p-4 text-sm">{round.explanation}</p>
          <WinPanel
            stars={won}
            line={
              won === 3
                ? 'First try, no wrong picks. A sharp eye.'
                : 'Found it. The next suspect has more notes to check.'
            }
            onNext={() => setLevel(level + 1)}
          />
        </>
      )}
    </main>
  );
}
