'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ChevronLeft, ChevronRight, Lightbulb, RotateCcw, Star } from 'lucide-react';
import {
  generateLevelPuzzle,
  type NonogramPuzzle,
} from '@/lib/generators/nonogram';
import {
  getGameProgress,
  loadLocalProgress,
  recordWin,
  type ProgressMap,
} from '@/lib/progress';
import { useTheme } from '@/components/ThemeProvider';
import BotRaceBar, { useBotRace } from '@/components/BotRaceBar';
import { nonogramProgress } from '@/lib/together/versus';

const GAME_ID = 'nonograms';
type Mark = 0 | 1 | 2; // blank, filled, X

interface PlayState {
  cells: Record<string, Mark>;
  hints: number;
  mistakes: number;
  countedWrong: string[];
}

const freshState = (): PlayState => ({
  cells: {},
  hints: 0,
  mistakes: 0,
  countedWrong: [],
});

const cellKey = (r: number, c: number) => `${r}:${c}`;

export default function NonogramsPage() {
  const { userId } = useTheme();
  const salt = userId ?? 'guest';
  const [progress, setProgress] = useState<ProgressMap>({});
  const [level, setLevel] = useState(1);
  const [state, setState] = useState<PlayState>(freshState());
  const [won, setWon] = useState<number | null>(null);
  const [raceBot, setRaceBot] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const countedRef = useRef<Set<string>>(new Set());
  const loadedFor = useRef<string>('');

  const myProgress = getGameProgress(progress, GAME_ID);
  const unlocked = Math.max(myProgress.currentLevel, 1);

  useEffect(() => {
    const map = loadLocalProgress();
    setProgress(map);
    setLevel(getGameProgress(map, GAME_ID).currentLevel);
  }, []);

  const puzzle: NonogramPuzzle = useMemo(
    () => generateLevelPuzzle(level, salt),
    [level, salt],
  );

  const bot = useBotRace(raceBot && won === null, level, `${GAME_ID}|${level}|${salt}`);
  const botWon = raceBot && bot.botFinished && won === null;

  useEffect(() => {
    const tag = `${salt}|${level}`;
    if (loadedFor.current === tag) return;
    loadedFor.current = tag;
    setWon(null);
    setMsg(null);
    countedRef.current = new Set();
    try {
      const raw = localStorage.getItem(`dd-v2-nonogram-${tag}`);
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

  useEffect(() => {
    if (loadedFor.current !== `${salt}|${level}`) return;
    try {
      localStorage.setItem(
        `dd-v2-nonogram-${salt}|${level}`,
        JSON.stringify({ ...state, countedWrong: [...countedRef.current] }),
      );
    } catch {
      /* ignore */
    }
  }, [state, level, salt]);

  const filledSet = (cells: Record<string, Mark>) => {
    const set = new Set<string>();
    for (const [k, m] of Object.entries(cells)) if (m === 1) set.add(k);
    return set;
  };

  const isWon = (cells: Record<string, Mark>) => {
    const filled = filledSet(cells);
    for (let r = 0; r < puzzle.size; r++) {
      for (let c = 0; c < puzzle.size; c++) {
        if (puzzle.grid[r][c] !== filled.has(cellKey(r, c))) return false;
      }
    }
    return true;
  };

  const finishIfWon = (cells: Record<string, Mark>, s: PlayState) => {
    if (won !== null || botWon) return;
    if (isWon(cells)) {
      const { map, stars } = recordWin(progress, GAME_ID, level, s.hints, s.mistakes);
      setProgress(map);
      setWon(stars);
      try {
        localStorage.removeItem(`dd-v2-nonogram-${salt}|${level}`);
      } catch {
        /* ignore */
      }
    }
  };

  const cycleCell = (r: number, c: number) => {
    if (won !== null || botWon) return;
    setState((s) => {
      const k = cellKey(r, c);
      const next = (((s.cells[k] ?? 0) + 1) % 3) as Mark;
      const cells = { ...s.cells, [k]: next };
      let mistakes = s.mistakes;
      if (next === 1 && !puzzle.grid[r][c] && !countedRef.current.has(k)) {
        countedRef.current.add(k);
        mistakes += 1;
      }
      const ns = { ...s, cells, mistakes };
      setTimeout(() => finishIfWon(cells, ns), 0);
      return ns;
    });
  };

  const useHint = () => {
    if (won !== null || botWon) return;
    const options: [number, number][] = [];
    for (let r = 0; r < puzzle.size; r++) {
      for (let c = 0; c < puzzle.size; c++) {
        if (puzzle.grid[r][c] && state.cells[cellKey(r, c)] !== 1) options.push([r, c]);
      }
    }
    if (!options.length) return;
    const [r, c] = options[Math.floor(Math.random() * options.length)];
    setState((s) => {
      const cells = { ...s.cells, [cellKey(r, c)]: 1 as Mark };
      const ns = { ...s, cells, hints: s.hints + 1 };
      setTimeout(() => finishIfWon(cells, ns), 0);
      return ns;
    });
    setMsg('One true square filled in for you. Hints are always free.');
  };

  const restart = () => {
    setState(freshState());
    countedRef.current = new Set();
    setWon(null);
    setMsg(null);
    try {
      localStorage.removeItem(`dd-v2-nonogram-${salt}|${level}`);
    } catch {
      /* ignore */
    }
  };

  const rowDone = (r: number) => {
    for (let c = 0; c < puzzle.size; c++) {
      const filled = state.cells[cellKey(r, c)] === 1;
      if (filled !== puzzle.grid[r][c]) return false;
    }
    return true;
  };
  const colDone = (c: number) => {
    for (let r = 0; r < puzzle.size; r++) {
      const filled = state.cells[cellKey(r, c)] === 1;
      if (filled !== puzzle.grid[r][c]) return false;
    }
    return true;
  };

  const levelStars = myProgress.stars[String(level)] ?? 0;
  const filledCount = Object.values(state.cells).filter((m) => m === 1).length;
  const solutionCount = puzzle.grid.flat().filter(Boolean).length;

  const versusCells: Record<string, 'fill' | 'x'> = {};
  for (const [k, m] of Object.entries(state.cells)) {
    if (m === 1) versusCells[k.replace(':', ',')] = 'fill';
    else if (m === 2) versusCells[k.replace(':', ',')] = 'x';
  }
  const playerPct = nonogramProgress(puzzle, versusCells);

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
            Level {level} · {puzzle.tier} · {puzzle.size}×{puzzle.size}
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

      <h1 className="mt-4 text-3xl font-bold">Nonograms</h1>
      <p className="mt-1 text-[var(--ink-dim)]">
        Fill squares to match the numbers: each number is a run of filled squares, in
        order, with at least one gap between runs. Tap a square to fill it, again for
        an X, again to clear. Finished lines fade out.
      </p>
      {levelStars > 0 && (
        <p className="mt-2 flex items-center gap-1 text-sm font-semibold">
          <Star size={16} aria-hidden /> Best on this level: {'★'.repeat(levelStars)}
          {'☆'.repeat(3 - levelStars)}
        </p>
      )}

      <section className="card mt-4 overflow-x-auto p-3 sm:p-4">
        <div
          className="mx-auto grid"
          style={{
            gridTemplateColumns: `auto repeat(${puzzle.size}, minmax(0, 1fr))`,
            maxWidth: puzzle.size > 12 ? '100%' : '480px',
          }}
        >
          <div />
          {puzzle.colClues.map((clue, c) => (
            <div
              key={`ch-${c}`}
              className="flex flex-col items-center justify-end px-0.5 pb-1 text-[0.65rem] font-bold leading-tight sm:text-xs"
              style={{
                opacity: colDone(c) ? 0.35 : 1,
                textDecoration: colDone(c) ? 'line-through' : 'none',
                color: 'var(--ink-dim)',
              }}
            >
              {clue.length ? clue.map((n, i) => <span key={i}>{n}</span>) : <span>0</span>}
            </div>
          ))}
          {puzzle.rowClues.map((clue, r) => (
            <div key={`row-${r}`} className="contents">
              <div
                className="flex items-center justify-end gap-1 pr-1.5 text-[0.65rem] font-bold sm:text-xs"
                style={{
                  opacity: rowDone(r) ? 0.35 : 1,
                  textDecoration: rowDone(r) ? 'line-through' : 'none',
                  color: 'var(--ink-dim)',
                }}
              >
                {clue.length ? clue.join(' ') : '0'}
              </div>
              {Array.from({ length: puzzle.size }, (_, c) => {
                const m = state.cells[cellKey(r, c)] ?? 0;
                return (
                  <button
                    key={cellKey(r, c)}
                    type="button"
                    className="flex aspect-square items-center justify-center border text-sm font-bold"
                    style={{
                      borderColor: 'var(--cell-line)',
                      background:
                        m === 1 ? 'var(--ink)' : 'var(--cell)',
                      color: m === 2 ? 'var(--ink-dim)' : 'var(--cell)',
                    }}
                    aria-label={`Row ${r + 1}, column ${c + 1}: ${
                      m === 1 ? 'filled' : m === 2 ? 'marked empty' : 'blank'
                    }`}
                    onClick={() => cycleCell(r, c)}
                  >
                    {m === 2 ? '✕' : ''}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <p className="mt-3 text-center text-sm text-[var(--ink-dim)]">
          {filledCount} of {solutionCount} true squares filled · Hints used: {state.hints} ·
          Mistakes: {state.mistakes}
        </p>
      </section>

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className="btn" onClick={useHint}>
          <Lightbulb size={18} aria-hidden /> Hint (free)
        </button>
        <button type="button" className="btn" onClick={restart}>
          <RotateCcw size={18} aria-hidden /> Start over
        </button>
      </div>
      {msg && <p className="mt-2 text-sm font-semibold">{msg}</p>}
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
          <p className="font-display text-2xl font-bold">Picture complete.</p>
          <p className="mt-1 text-lg" aria-label={`${won} of 3 stars`}>
            {'★'.repeat(won)}
            <span className="opacity-40">{'★'.repeat(3 - won)}</span>
          </p>
          <p className="text-sm text-[var(--ink-dim)]">
            Every number lines up. The next picture is a little bigger.
          </p>
          <div className="mt-3 flex justify-center gap-2">
            <button type="button" className="btn btn-primary" onClick={() => setLevel(level + 1)}>
              Next level
            </button>
            <Link href="/" className="btn">Home</Link>
          </div>
        </section>
      )}
    </main>
  );
}
