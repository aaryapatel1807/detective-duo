'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Lightbulb, RotateCcw, Star } from 'lucide-react';
import {
  generateLevelPuzzle,
  tierForLevel,
  type LogicGridPuzzle,
} from '@/lib/generators/logicGrid';
import {
  getGameProgress,
  loadLocalProgress,
  recordWin,
  type ProgressMap,
} from '@/lib/progress';
import { useTheme } from '@/components/ThemeProvider';
import BotRaceBar, { useBotRace } from '@/components/BotRaceBar';
import { logicGridProgress } from '@/lib/together/versus';

const GAME_ID = 'logic-grids';
type Mark = 0 | 1 | 2; // blank, yes, no

const cellKey = (cat: number, seat: number, item: number) => `${cat}:${seat}:${item}`;

interface PlayState {
  marks: Record<string, Mark>;
  struck: number[];
  hints: number;
  mistakes: number;
  countedWrong: string[];
}

const freshState = (): PlayState => ({
  marks: {},
  struck: [],
  hints: 0,
  mistakes: 0,
  countedWrong: [],
});

function tierName(level: number): string {
  if (level <= 10) return 'Easy';
  if (level <= 30) return 'Medium';
  if (level <= 60) return 'Hard';
  return 'Expert';
}

export default function LogicGridsPage() {
  const { userId } = useTheme();
  const salt = userId ?? 'guest';
  const [progress, setProgress] = useState<ProgressMap>({});
  const [level, setLevel] = useState(1);
  const [state, setState] = useState<PlayState>(freshState());
  const [won, setWon] = useState<number | null>(null);
  const [raceBot, setRaceBot] = useState(false);
  const [flash, setFlash] = useState<Set<string>>(new Set());
  const [checkMsg, setCheckMsg] = useState<string | null>(null);
  const countedRef = useRef<Set<string>>(new Set());
  const loadedFor = useRef<string>('');

  const myProgress = getGameProgress(progress, GAME_ID);
  const unlocked = Math.max(myProgress.currentLevel, 1);

  useEffect(() => {
    const map = loadLocalProgress();
    setProgress(map);
    setLevel(getGameProgress(map, GAME_ID).currentLevel);
  }, []);

  const puzzle: LogicGridPuzzle = useMemo(
    () => generateLevelPuzzle(level, salt),
    [level, salt],
  );

  const bot = useBotRace(raceBot && won === null, level, `${GAME_ID}|${level}|${salt}`);
  const botWon = raceBot && bot.botFinished && won === null;

  // Load any in-progress marks for this level (resume where she left off).
  useEffect(() => {
    const tag = `${salt}|${level}`;
    if (loadedFor.current === tag) return;
    loadedFor.current = tag;
    setWon(null);
    setCheckMsg(null);
    countedRef.current = new Set();
    try {
      const raw = localStorage.getItem(`dd-v2-lg-${tag}`);
      if (raw) {
        const parsed = JSON.parse(raw) as PlayState;
        setState(parsed);
        countedRef.current = new Set(parsed.countedWrong ?? []);
        return;
      }
    } catch {
      /* ignore */
    }
    setState(freshState());
  }, [level, salt]);

  // Persist in-progress state.
  useEffect(() => {
    if (loadedFor.current !== `${salt}|${level}`) return;
    try {
      localStorage.setItem(
        `dd-v2-lg-${salt}|${level}`,
        JSON.stringify({ ...state, countedWrong: [...countedRef.current] }),
      );
    } catch {
      /* ignore */
    }
  }, [state, level, salt]);

  const isCorrectPair = useCallback(
    (cat: number, seat: number, item: number) => puzzle.solution[cat][seat] === item,
    [puzzle],
  );

  const checkWin = useCallback(
    (marks: Record<string, Mark>): boolean => {
      for (let cat = 1; cat < puzzle.size; cat++) {
        for (let seat = 0; seat < puzzle.size; seat++) {
          if (marks[cellKey(cat, seat, puzzle.solution[cat][seat])] !== 1) return false;
          for (let item = 0; item < puzzle.size; item++) {
            if (item !== puzzle.solution[cat][seat] && marks[cellKey(cat, seat, item)] === 1) {
              return false;
            }
          }
        }
      }
      return true;
    },
    [puzzle],
  );

  const finishIfWon = useCallback(
    (marks: Record<string, Mark>, s: PlayState) => {
      if (won !== null || botWon) return;
      if (checkWin(marks)) {
        const { map, stars } = recordWin(progress, GAME_ID, level, s.hints, s.mistakes);
        setProgress(map);
        setWon(stars);
        try {
          localStorage.removeItem(`dd-v2-lg-${salt}|${level}`);
        } catch {
          /* ignore */
        }
      }
    },
    [checkWin, level, progress, salt, won],
  );

  const cycleMark = (cat: number, seat: number, item: number) => {
    if (won !== null || botWon) return;
    setState((s) => {
      const k = cellKey(cat, seat, item);
      const next = ((s.marks[k] ?? 0) + 1) % 3 as Mark;
      const marks = { ...s.marks, [k]: next };
      const ns = { ...s, marks };
      setTimeout(() => finishIfWon(marks, ns), 0);
      return ns;
    });
  };

  const useHint = () => {
    if (won !== null || botWon) return;
    const options: [number, number, number][] = [];
    for (let cat = 1; cat < puzzle.size; cat++) {
      for (let seat = 0; seat < puzzle.size; seat++) {
        const item = puzzle.solution[cat][seat];
        if (state.marks[cellKey(cat, seat, item)] !== 1) options.push([cat, seat, item]);
      }
    }
    if (!options.length) return;
    const [cat, seat, item] = options[Math.floor(Math.random() * options.length)];
    setState((s) => {
      const marks = { ...s.marks, [cellKey(cat, seat, item)]: 1 as Mark };
      const ns = { ...s, marks, hints: s.hints + 1 };
      setTimeout(() => finishIfWon(marks, ns), 0);
      return ns;
    });
    setCheckMsg('One true pairing, filled in for you. Hints are always free.');
  };

  const doCheck = () => {
    if (won !== null || botWon) return;
    const wrong: string[] = [];
    for (const [k, m] of Object.entries(state.marks)) {
      if (m === 0) continue;
      const [cat, seat, item] = k.split(':').map(Number);
      const correct = isCorrectPair(cat, seat, item);
      if ((m === 1 && !correct) || (m === 2 && correct)) wrong.push(k);
    }
    const fresh = wrong.filter((k) => !countedRef.current.has(k));
    fresh.forEach((k) => countedRef.current.add(k));
    if (fresh.length) {
      setState((s) => ({ ...s, mistakes: s.mistakes + fresh.length }));
    }
    if (wrong.length) {
      setFlash(new Set(wrong));
      setTimeout(() => setFlash(new Set()), 600);
      setCheckMsg(
        wrong.length === 1
          ? 'One mark to rethink. Look at the clues touching it.'
          : `${wrong.length} marks to rethink. No rush.`,
      );
    } else {
      setCheckMsg('Every mark so far is right. Keep going.');
    }
  };

  const restart = () => {
    setState(freshState());
    countedRef.current = new Set();
    setWon(null);
    setCheckMsg(null);
    try {
      localStorage.removeItem(`dd-v2-lg-${salt}|${level}`);
    } catch {
      /* ignore */
    }
  };

  const params = tierForLevel(level);
  const levelStars = myProgress.stars[String(level)] ?? 0;

  const versusMarks: Record<string, 'yes' | 'no'> = {};
  for (const [k, m] of Object.entries(state.marks)) {
    if (m === 1) {
      const parts = k.split(':');
      versusMarks[`${parts[0]}:${parts[2]}`] = 'yes';
    }
  }
  const playerPct = logicGridProgress(puzzle, versusMarks);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-16">
      <div className="mt-2 flex items-center justify-between gap-2">
        <Link href="/" className="btn !px-3 !py-2 text-sm">
          <ArrowLeft size={16} aria-hidden /> Games
        </Link>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="btn !px-2 !py-2"
            disabled={level <= 1}
            onClick={() => setLevel(level - 1)}
            aria-label="Previous level"
          >
            <ChevronLeft size={16} aria-hidden />
          </button>
          <span className="chip">
            Level {level} · {tierName(level)}
          </span>
          <button
            type="button"
            className="btn !px-2 !py-2"
            disabled={level >= unlocked}
            onClick={() => setLevel(level + 1)}
            aria-label="Next level"
          >
            <ChevronRight size={16} aria-hidden />
          </button>
        </div>
      </div>

      <h1 className="mt-4 text-3xl font-bold">Logic Grids</h1>
      <p className="mt-1 text-[var(--ink-dim)]">
        {params.size} friends sit in the order shown, left to right. Work out who pairs with
        what. Tap a cell to mark it yes, again for no, again to clear.
      </p>
      {levelStars > 0 && (
        <p className="mt-2 flex items-center gap-1 text-sm font-semibold">
          <Star size={16} aria-hidden /> Best on this level: {'★'.repeat(levelStars)}
          {'☆'.repeat(3 - levelStars)}
        </p>
      )}

      <section className="paper mt-4 p-4 sm:p-5">
        <h2 className="font-display text-lg font-bold">Clues</h2>
        <p className="text-sm opacity-70">Tap a clue to cross it off once you have used it.</p>
        <ol className="mt-2 space-y-1.5">
          {puzzle.clues.map((clue, clueIndex) => (
            <li key={clue.id} className="flex gap-2">
              <span className="w-7 shrink-0 text-right font-semibold" aria-hidden>
                {clueIndex + 1}.
              </span>
              <button
                type="button"
                className={`py-1 text-left ${state.struck.includes(clue.id) ? 'clue-struck' : ''}`}
                onClick={() =>
                  setState((s) => ({
                    ...s,
                    struck: s.struck.includes(clue.id)
                      ? s.struck.filter((x) => x !== clue.id)
                      : [...s.struck, clue.id],
                  }))
                }
              >
                {clue.text}
              </button>
            </li>
          ))}
        </ol>
      </section>

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className="btn" onClick={useHint}>
          <Lightbulb size={18} aria-hidden /> Hint (free)
        </button>
        <button type="button" className="btn btn-accent2" onClick={doCheck}>
          <Check size={18} aria-hidden /> Check my marks
        </button>
        <button type="button" className="btn" onClick={restart}>
          <RotateCcw size={18} aria-hidden /> Start over
        </button>
      </div>
      {checkMsg && <p className="mt-2 text-sm font-semibold">{checkMsg}</p>}
      <p className="mt-1 text-sm text-[var(--ink-dim)]">
        Hints used: {state.hints} · Mistakes found: {state.mistakes}
      </p>
      <section className="mt-4">
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            checked={raceBot}
            onChange={(e) => setRaceBot(e.target.checked)}
          />
          Race the bot
        </label>
        {raceBot && (
          <div className="mt-2">
            <BotRaceBar playerPct={playerPct} botPct={bot.botPct} level={level} />
          </div>
        )}
        {botWon && (
          <p className="panel mt-2 p-4 text-sm">
            The bot finished first this time — no progress recorded. Start over to
            race again.
          </p>
        )}
      </section>


      {won !== null && (
        <section className="card mt-4 p-5 text-center">
          <p className="font-display text-2xl font-bold">Solved it.</p>
          <p className="mt-1 text-lg" aria-label={`${won} of 3 stars`}>
            {'★'.repeat(won)}
            <span className="opacity-40">{'★'.repeat(3 - won)}</span>
          </p>
          <p className="text-sm text-[var(--ink-dim)]">
            {won === 3
              ? 'No hints, barely a wrong step. Lovely work.'
              : 'A case closed is a case closed. The next one is a little harder.'}
          </p>
          <div className="mt-3 flex justify-center gap-2">
            <button type="button" className="btn btn-primary" onClick={() => setLevel(level + 1)}>
              Next level
            </button>
            <Link href="/" className="btn">Home</Link>
          </div>
        </section>
      )}

      {puzzle.categories.slice(1).map((cat, ci) => {
        const catIndex = ci + 1;
        return (
          <section key={cat.name} className="card mt-5 overflow-x-auto p-4">
            <h2 className="font-display text-lg font-bold">{cat.name}</h2>
            <table className="mt-2 border-separate" style={{ borderSpacing: 4 }}>
              <thead>
                <tr>
                  <th />
                  {cat.items.map((item) => (
                    <th
                      key={item}
                      className="max-w-[2.4rem] align-bottom text-[0.65rem] font-semibold leading-tight text-[var(--ink-dim)]"
                      style={{ writingMode: 'vertical-rl' }}
                    >
                      {item}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {puzzle.categories[0].items.map((friend, seat) => (
                  <tr key={friend}>
                    <th className="pr-1 text-right text-sm font-semibold">{friend}</th>
                    {cat.items.map((item, itemIdx) => {
                      const k = cellKey(catIndex, seat, itemIdx);
                      const m = state.marks[k] ?? 0;
                      return (
                        <td key={item}>
                          <button
                            type="button"
                            className={`lg-cell ${flash.has(k) ? 'flash-wrong' : ''}`}
                            data-mark={m === 1 ? 'yes' : m === 2 ? 'no' : 'blank'}
                            aria-label={`${friend} with ${item}: ${
                              m === 1 ? 'yes' : m === 2 ? 'no' : 'unmarked'
                            }`}
                            onClick={() => cycleMark(catIndex, seat, itemIdx)}
                          >
                            {m === 1 ? '✓' : m === 2 ? '✗' : ''}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        );
      })}
    </main>
  );
}
