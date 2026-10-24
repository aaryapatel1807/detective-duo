'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Lightbulb, RotateCcw, Star } from 'lucide-react';
import {
  generateLevelPuzzle,
  type WordSearchPuzzle,
} from '@/lib/generators/wordSearch';
import {
  getGameProgress,
  loadLocalProgress,
  recordWin,
  type ProgressMap,
} from '@/lib/progress';
import { useTheme } from '@/components/ThemeProvider';

const GAME_ID = 'word-search';

interface PlayState {
  found: string[];
  hints: number;
  mistakes: number;
  hinted: string | null;
}

const freshState = (): PlayState => ({
  found: [],
  hints: 0,
  mistakes: 0,
  hinted: null,
});

const cellKey = (r: number, c: number) => `${r}:${c}`;

export default function WordSearchPage() {
  const { userId } = useTheme();
  const salt = userId ?? 'guest';
  const [progress, setProgress] = useState<ProgressMap>({});
  const [level, setLevel] = useState(1);
  const [state, setState] = useState<PlayState>(freshState());
  const [start, setStart] = useState<[number, number] | null>(null);
  const [hover, setHover] = useState<[number, number] | null>(null);
  const [won, setWon] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const loadedFor = useRef<string>('');

  const myProgress = getGameProgress(progress, GAME_ID);
  const unlocked = Math.max(myProgress.currentLevel, 1);

  useEffect(() => {
    const map = loadLocalProgress();
    setProgress(map);
    setLevel(getGameProgress(map, GAME_ID).currentLevel);
  }, []);

  const puzzle: WordSearchPuzzle = useMemo(
    () => generateLevelPuzzle(level, salt),
    [level, salt],
  );

  useEffect(() => {
    const tag = `${salt}|${level}`;
    if (loadedFor.current === tag) return;
    loadedFor.current = tag;
    setWon(null);
    setMsg(null);
    setStart(null);
    try {
      const raw = localStorage.getItem(`dd-v2-wordsearch-${tag}`);
      if (raw) {
        setState(JSON.parse(raw) as PlayState);
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
      localStorage.setItem(`dd-v2-wordsearch-${salt}|${level}`, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state, level, salt]);

  const foundCells = useMemo(() => {
    const set = new Set<string>();
    for (const w of puzzle.words) {
      if (state.found.includes(w.word)) {
        for (const [r, c] of w.cells) set.add(cellKey(r, c));
      }
    }
    return set;
  }, [puzzle, state.found]);

  /** Cells on the straight line from start to end (inclusive), or null. */
  const lineCells = (a: [number, number], b: [number, number]): [number, number][] | null => {
    const dr = Math.sign(b[0] - a[0]);
    const dc = Math.sign(b[1] - a[1]);
    if (dr === 0 && dc === 0) return null;
    const steps = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]));
    if (Math.abs(b[0] - a[0]) !== steps && Math.abs(b[1] - a[1]) !== steps) return null;
    if (dr !== 0 && dc !== 0 && Math.abs(b[0] - a[0]) !== Math.abs(b[1] - a[1])) return null;
    const cells: [number, number][] = [];
    for (let i = 0; i <= steps; i++) cells.push([a[0] + dr * i, a[1] + dc * i]);
    return cells;
  };

  const previewCells = useMemo(() => {
    if (!start || !hover) return new Set<string>();
    const line = lineCells(start, hover);
    return new Set((line ?? []).map(([r, c]) => cellKey(r, c)));
  }, [start, hover]);

  const tapCell = (r: number, c: number) => {
    if (won !== null) return;
    if (!start) {
      setStart([r, c]);
      setMsg('Now tap the last letter of the word.');
      return;
    }
    if (start[0] === r && start[1] === c) {
      setStart(null);
      setMsg(null);
      return;
    }
    const line = lineCells(start, [r, c]);
    setStart(null);
    if (!line) {
      setMsg('Words run in a straight line. Try again from the first letter.');
      return;
    }
    const spelled = line.map(([rr, cc]) => puzzle.grid[rr][cc]).join('');
    const reversed = spelled.split('').reverse().join('');
    const match = puzzle.words.find(
      (w) => (w.word === spelled || w.word === reversed) && !state.found.includes(w.word),
    );
    if (match) {
      const found = [...state.found, match.word];
      const ns = { ...state, found };
      setState(ns);
      if (found.length === puzzle.words.length) {
        const { map, stars } = recordWin(progress, GAME_ID, level, ns.hints, ns.mistakes);
        setProgress(map);
        setWon(stars);
        try {
          localStorage.removeItem(`dd-v2-wordsearch-${salt}|${level}`);
        } catch {
          /* ignore */
        }
      } else {
        setMsg(`Found ${match.word}. ${puzzle.words.length - found.length} to go.`);
      }
    } else {
      setState((s) => ({ ...s, mistakes: s.mistakes + 1 }));
      setMsg('That is not one of the words. No rush — try another line.');
    }
  };

  const useHint = () => {
    if (won !== null) return;
    const remaining = puzzle.words.filter((w) => !state.found.includes(w.word));
    if (!remaining.length) return;
    const word = remaining[0];
    setState((s) => ({ ...s, hinted: word.word, hints: s.hints + 1 }));
    setMsg(
      `A hint for ${word.word}: its first letter is glowing. Hints are always free.`,
    );
  };

  const restart = () => {
    setState(freshState());
    setStart(null);
    setWon(null);
    setMsg(null);
    try {
      localStorage.removeItem(`dd-v2-wordsearch-${salt}|${level}`);
    } catch {
      /* ignore */
    }
  };

  const hintedCell = useMemo(() => {
    if (!state.hinted) return null;
    const w = puzzle.words.find((x) => x.word === state.hinted);
    if (!w || state.found.includes(w.word)) return null;
    return cellKey(w.startRow, w.startCol);
  }, [puzzle, state.hinted, state.found]);

  const levelStars = myProgress.stars[String(level)] ?? 0;

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

      <h1 className="mt-4 text-3xl font-bold">Word Search</h1>
      <p className="mt-1 text-[var(--ink-dim)]">
        Find every {puzzle.theme.toLowerCase()} word. Tap its first letter, then its
        last letter. Words can run in any direction the level allows.
      </p>
      {levelStars > 0 && (
        <p className="mt-2 flex items-center gap-1 text-sm font-semibold">
          <Star size={16} aria-hidden /> Best on this level: {'★'.repeat(levelStars)}
          {'☆'.repeat(3 - levelStars)}
        </p>
      )}

      <section className="card mt-4 p-3 sm:p-4">
        <div
          className="mx-auto grid"
          style={{
            gridTemplateColumns: `repeat(${puzzle.size}, minmax(0, 1fr))`,
            maxWidth: puzzle.size > 12 ? '100%' : '480px',
          }}
        >
          {puzzle.grid.map((row, r) =>
            row.map((ch, c) => {
              const k = cellKey(r, c);
              const isFound = foundCells.has(k);
              const isStart = start !== null && start[0] === r && start[1] === c;
              const isPreview = previewCells.has(k);
              const isHinted = hintedCell === k;
              return (
                <button
                  key={k}
                  type="button"
                  className="flex aspect-square items-center justify-center border text-base font-bold sm:text-lg"
                  style={{
                    borderColor: 'var(--cell-line)',
                    background: isFound
                      ? 'var(--accent)'
                      : isPreview || isStart
                        ? 'var(--surface-2)'
                        : 'var(--cell)',
                    color: isFound ? 'var(--accent-ink)' : 'var(--ink)',
                    outline: isHinted ? '3px solid var(--accent)' : undefined,
                    outlineOffset: isHinted ? '-1px' : undefined,
                  }}
                  aria-label={`Letter ${ch}, row ${r + 1}, column ${c + 1}`}
                  onClick={() => tapCell(r, c)}
                  onMouseEnter={() => setHover([r, c])}
                >
                  {ch}
                </button>
              );
            }),
          )}
        </div>
      </section>

      <section className="card mt-4 p-4">
        <h2 className="font-display text-lg font-bold">
          Words to find ({state.found.length}/{puzzle.words.length}) · {puzzle.theme}
        </h2>
        <ul className="mt-2 flex flex-wrap gap-2">
          {puzzle.words.map((w) => {
            const found = state.found.includes(w.word);
            return (
              <li
                key={w.word}
                className="chip !py-1 !text-sm"
                style={{
                  opacity: found ? 0.55 : 1,
                  textDecoration: found ? 'line-through' : 'none',
                }}
              >
                {found && <Check size={14} aria-hidden />}
                {w.word}
              </li>
            );
          })}
        </ul>
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
      <p className="mt-1 text-sm text-[var(--ink-dim)]">
        Hints used: {state.hints} · Missed selections: {state.mistakes}
      </p>

      {won !== null && (
        <section className="card mt-4 p-5 text-center">
          <p className="font-display text-2xl font-bold">Every word found.</p>
          <p className="mt-1 text-lg" aria-label={`${won} of 3 stars`}>
            {'★'.repeat(won)}
            <span className="opacity-40">{'★'.repeat(3 - won)}</span>
          </p>
          <p className="text-sm text-[var(--ink-dim)]">
            A tidy grid and a tidy mind. The next one hides a few more words.
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
