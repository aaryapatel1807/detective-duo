'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ChevronLeft, ChevronRight, Lightbulb, RotateCcw, Star } from 'lucide-react';
import {
  generateLevelPuzzle,
  type NonogramPuzzle,
} from '@/lib/generators/nonogram';
import {
  autoCrossBW,
  autoCrossColor,
  BW_PICTURES,
  bwPictureAt,
  COLOR_PICTURES,
  colorPictureAt,
  colorPuzzleFromPicture,
  PALETTE,
  picturePuzzleFromBW,
  type ColorPuzzle,
} from '@/lib/generators/nonogramPictures';
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
type Mode = 'pictures' | 'color' | 'endless';

interface BWState {
  cells: Record<string, Mark>;
  hints: number;
  mistakes: number;
  countedWrong: string[];
}

/** Color cells: 0 blank, -1 X, otherwise a palette digit. */
interface ColorState {
  cells: Record<string, number>;
  hints: number;
  mistakes: number;
  countedWrong: string[];
}

const freshBWState = (): BWState => ({
  cells: {},
  hints: 0,
  mistakes: 0,
  countedWrong: [],
});

const freshColorState = (): ColorState => ({
  cells: {},
  hints: 0,
  mistakes: 0,
  countedWrong: [],
});

const cellKey = (r: number, c: number) => `${r}:${c}`;

const MODE_LABEL: Record<Mode, string> = {
  pictures: 'Pictures',
  color: 'Color',
  endless: 'Endless',
};

const MODE_INTRO: Record<Mode, string> = {
  pictures:
    'Real pictures, drawn by hand — solve the numbers to reveal what it is. Tap a square to fill it, again for an X, again to clear. Finished lines cross themselves out.',
  color:
    'Colored numbers: each number is a run of that colour, in order. Runs of the same colour need a gap between them; different colours may touch. Pick a colour, then tap squares.',
  endless:
    'Fill squares to match the numbers: each number is a run of filled squares, in order, with at least one gap between runs. Tap a square to fill it, again for an X, again to clear. Finished lines cross themselves out.',
};

export default function NonogramsPage() {
  const { userId } = useTheme();
  const salt = userId ?? 'guest';
  const [progress, setProgress] = useState<ProgressMap>({});
  const [level, setLevel] = useState(1);
  const [mode, setMode] = useState<Mode>('pictures');
  const [bwState, setBwState] = useState<BWState>(freshBWState());
  const [colorState, setColorState] = useState<ColorState>(freshColorState());
  const [selectedColor, setSelectedColor] = useState(1);
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
    try {
      const saved = localStorage.getItem('dd-v2-nonogram-mode');
      if (saved === 'pictures' || saved === 'color' || saved === 'endless') setMode(saved);
    } catch {
      /* ignore */
    }
  }, []);

  const switchMode = (m: Mode) => {
    setMode(m);
    setWon(null);
    setMsg(null);
    try {
      localStorage.setItem('dd-v2-nonogram-mode', m);
    } catch {
      /* ignore */
    }
  };

  // ------------------------------------------------------------ puzzles ----
  // Pictures and Color are finite galleries: level N is picture N.
  // Endless keeps the old seeded ladder. A level past the end of a
  // gallery renders the gallery-complete card instead of a board.
  const bwPuzzle: NonogramPuzzle | null = useMemo(() => {
    if (mode === 'endless') return generateLevelPuzzle(level, salt);
    if (mode === 'pictures') {
      const pic = bwPictureAt(level);
      return pic ? picturePuzzleFromBW(pic, level) : null;
    }
    return null;
  }, [mode, level, salt]);

  const bwPicture = mode === 'pictures' ? bwPictureAt(level) : null;

  const colorPuzzle: ColorPuzzle | null = useMemo(() => {
    if (mode !== 'color') return null;
    const pic = colorPictureAt(level);
    return pic ? colorPuzzleFromPicture(pic) : null;
  }, [mode, level]);

  // --------------------------------------------------------- persistence ----
  // Endless keeps its legacy key so in-progress endless puzzles survive
  // the rebuild; Pictures and Color get their own keys per level.
  const saveKey = () => {
    if (mode === 'endless') return `dd-v2-nonogram-${salt}|${level}`;
    return `dd-v2-nonogram-${salt}|${mode}|${level}`;
  };

  useEffect(() => {
    const tag = `${salt}|${mode}|${level}`;
    if (loadedFor.current === tag) return;
    loadedFor.current = tag;
    setWon(null);
    setMsg(null);
    countedRef.current = new Set();
    try {
      const raw = localStorage.getItem(saveKey());
      if (raw) {
        const parsed = JSON.parse(raw) as BWState & ColorState;
        if (mode === 'color') {
          setColorState({
            cells: parsed.cells ?? {},
            hints: parsed.hints ?? 0,
            mistakes: parsed.mistakes ?? 0,
            countedWrong: parsed.countedWrong ?? [],
          });
        } else {
          setBwState({
            cells: parsed.cells ?? {},
            hints: parsed.hints ?? 0,
            mistakes: parsed.mistakes ?? 0,
            countedWrong: parsed.countedWrong ?? [],
          });
        }
        countedRef.current = new Set(parsed.countedWrong ?? []);
        return;
      }
    } catch {
      /* ignore */
    }
    if (mode === 'color') setColorState(freshColorState());
    else setBwState(freshBWState());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, salt, mode]);

  useEffect(() => {
    if (loadedFor.current !== `${salt}|${mode}|${level}`) return;
    try {
      const state = mode === 'color' ? colorState : bwState;
      localStorage.setItem(saveKey(), JSON.stringify({ ...state, countedWrong: [...countedRef.current] }));
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bwState, colorState, level, salt, mode]);

  const clearSave = () => {
    try {
      localStorage.removeItem(saveKey());
    } catch {
      /* ignore */
    }
  };

  // -------------------------------------------------------------- B&W play ----
  const bwFilledSet = (cells: Record<string, Mark>) => {
    const set = new Set<string>();
    for (const [k, m] of Object.entries(cells)) if (m === 1) set.add(k);
    return set;
  };

  const bwIsWon = (cells: Record<string, Mark>) => {
    if (!bwPuzzle) return false;
    const filled = bwFilledSet(cells);
    for (let r = 0; r < bwPuzzle.size; r++) {
      for (let c = 0; c < bwPuzzle.size; c++) {
        if (bwPuzzle.grid[r][c] !== filled.has(cellKey(r, c))) return false;
      }
    }
    return true;
  };

  const finishBwIfWon = (cells: Record<string, Mark>, s: BWState) => {
    if (won !== null || botWon) return;
    if (bwIsWon(cells)) {
      const { map, stars } = recordWin(progress, GAME_ID, level, s.hints, s.mistakes);
      setProgress(map);
      setWon(stars);
      clearSave();
    }
  };

  const cycleCell = (r: number, c: number) => {
    if (won !== null || botWon || !bwPuzzle) return;
    setBwState((s) => {
      const k = cellKey(r, c);
      const next = (((s.cells[k] ?? 0) + 1) % 3) as Mark;
      const rawCells = { ...s.cells, [k]: next };
      const cells = autoCrossBW(rawCells, bwPuzzle.grid) as Record<string, Mark>;
      let mistakes = s.mistakes;
      if (next === 1 && !bwPuzzle.grid[r][c] && !countedRef.current.has(k)) {
        countedRef.current.add(k);
        mistakes += 1;
      }
      const ns = { ...s, cells, mistakes };
      setTimeout(() => finishBwIfWon(cells, ns), 0);
      return ns;
    });
  };

  const useBwHint = () => {
    if (won !== null || botWon || !bwPuzzle) return;
    const options: [number, number][] = [];
    for (let r = 0; r < bwPuzzle.size; r++) {
      for (let c = 0; c < bwPuzzle.size; c++) {
        if (bwPuzzle.grid[r][c] && bwState.cells[cellKey(r, c)] !== 1) options.push([r, c]);
      }
    }
    if (!options.length) return;
    const [r, c] = options[Math.floor(Math.random() * options.length)];
    setBwState((s) => {
      const rawCells = { ...s.cells, [cellKey(r, c)]: 1 as Mark };
      const cells = autoCrossBW(rawCells, bwPuzzle.grid) as Record<string, Mark>;
      const ns = { ...s, cells, hints: s.hints + 1 };
      setTimeout(() => finishBwIfWon(cells, ns), 0);
      return ns;
    });
    setMsg('One true square filled in for you. Hints are always free.');
  };

  const restartBw = () => {
    setBwState(freshBWState());
    countedRef.current = new Set();
    setWon(null);
    setMsg(null);
    clearSave();
  };

  const bwRowDone = (r: number) => {
    if (!bwPuzzle) return false;
    for (let c = 0; c < bwPuzzle.size; c++) {
      const filled = bwState.cells[cellKey(r, c)] === 1;
      if (filled !== bwPuzzle.grid[r][c]) return false;
    }
    return true;
  };
  const bwColDone = (c: number) => {
    if (!bwPuzzle) return false;
    for (let r = 0; r < bwPuzzle.size; r++) {
      const filled = bwState.cells[cellKey(r, c)] === 1;
      if (filled !== bwPuzzle.grid[r][c]) return false;
    }
    return true;
  };

  // ------------------------------------------------------------- color play ----
  const colorIsWon = (cells: Record<string, number>) => {
    if (!colorPuzzle) return false;
    for (let r = 0; r < colorPuzzle.size; r++) {
      for (let c = 0; c < colorPuzzle.size; c++) {
        const v = cells[cellKey(r, c)] ?? 0;
        const sol = colorPuzzle.grid[r][c];
        if (sol === 0) {
          if (v !== 0 && v !== -1) return false;
        } else if (v !== sol) {
          return false;
        }
      }
    }
    return true;
  };

  const finishColorIfWon = (cells: Record<string, number>, s: ColorState) => {
    if (won !== null) return;
    if (colorIsWon(cells)) {
      const { map, stars } = recordWin(progress, GAME_ID, level, s.hints, s.mistakes);
      setProgress(map);
      setWon(stars);
      clearSave();
    }
  };

  const tapColorCell = (r: number, c: number) => {
    if (won !== null || !colorPuzzle) return;
    setColorState((s) => {
      const k = cellKey(r, c);
      const cur = s.cells[k] ?? 0;
      let next: number;
      if (cur === 0) next = selectedColor;
      else if (cur === -1) next = 0;
      else next = cur === selectedColor ? -1 : selectedColor;
      const rawCells = { ...s.cells, [k]: next };
      const cells = autoCrossColor(rawCells, colorPuzzle.grid);
      let mistakes = s.mistakes;
      const sol = colorPuzzle.grid[r][c];
      if (next > 0 && next !== sol && !countedRef.current.has(k)) {
        countedRef.current.add(k);
        mistakes += 1;
      }
      const ns = { ...s, cells, mistakes };
      setTimeout(() => finishColorIfWon(cells, ns), 0);
      return ns;
    });
  };

  const useColorHint = () => {
    if (won !== null || !colorPuzzle) return;
    const options: [number, number][] = [];
    for (let r = 0; r < colorPuzzle.size; r++) {
      for (let c = 0; c < colorPuzzle.size; c++) {
        const sol = colorPuzzle.grid[r][c];
        if (sol !== 0 && colorState.cells[cellKey(r, c)] !== sol) options.push([r, c]);
      }
    }
    if (!options.length) return;
    const [r, c] = options[Math.floor(Math.random() * options.length)];
    setColorState((s) => {
      const rawCells = { ...s.cells, [cellKey(r, c)]: colorPuzzle.grid[r][c] };
      const cells = autoCrossColor(rawCells, colorPuzzle.grid);
      const ns = { ...s, cells, hints: s.hints + 1 };
      setTimeout(() => finishColorIfWon(cells, ns), 0);
      return ns;
    });
    setMsg('One true square filled in for you, in its true colour. Hints are always free.');
  };

  const restartColor = () => {
    setColorState(freshColorState());
    countedRef.current = new Set();
    setWon(null);
    setMsg(null);
    clearSave();
  };

  const colorLineDone = (isRow: boolean, i: number) => {
    if (!colorPuzzle) return false;
    for (let j = 0; j < colorPuzzle.size; j++) {
      const r = isRow ? i : j;
      const c = isRow ? j : i;
      const v = colorState.cells[cellKey(r, c)] ?? 0;
      const sol = colorPuzzle.grid[r][c];
      if (sol === 0) {
        if (v !== 0 && v !== -1) return false;
      } else if (v !== sol) {
        return false;
      }
    }
    return true;
  };

  // -------------------------------------------------------------- bot race ----
  // Bot race runs on the B&W board only (color has no boolean grid).
  const bot = useBotRace(raceBot && won === null && mode !== 'color', level, `${GAME_ID}|${level}|${salt}`);
  const botWon = raceBot && mode !== 'color' && bot.botFinished && won === null;

  const versusCells: Record<string, 'fill' | 'x'> = {};
  if (bwPuzzle) {
    for (const [k, m] of Object.entries(bwState.cells)) {
      if (m === 1) versusCells[k.replace(':', ',')] = 'fill';
      else if (m === 2) versusCells[k.replace(':', ',')] = 'x';
    }
  }
  const playerPct = bwPuzzle ? nonogramProgress(bwPuzzle, versusCells) : 0;

  // -------------------------------------------------------------- derived ----
  const levelStars = myProgress.stars[String(level)] ?? 0;
  const bwFilledCount = Object.values(bwState.cells).filter((m) => m === 1).length;
  const bwSolutionCount = bwPuzzle ? bwPuzzle.grid.flat().filter(Boolean).length : 0;
  const colorFilledCount = colorPuzzle
    ? Object.entries(colorState.cells).filter(
        ([k, v]) => v > 0 && v === colorPuzzle.grid[Number(k.split(':')[0])][Number(k.split(':')[1])],
      ).length
    : 0;
  const colorSolutionCount = colorPuzzle ? colorPuzzle.grid.flat().filter((v) => v !== 0).length : 0;

  const chipLabel = (() => {
    if (mode === 'color' && colorPuzzle) return `${colorPuzzle.name} · ${colorPuzzle.group} · ${colorPuzzle.size}×${colorPuzzle.size}`;
    if (mode === 'pictures' && bwPicture && bwPuzzle) return `${bwPicture.name} · ${bwPicture.group} · ${bwPuzzle.size}×${bwPuzzle.size}`;
    if (bwPuzzle) return `Level ${level} · ${bwPuzzle.tier} · ${bwPuzzle.size}×${bwPuzzle.size}`;
    return `Level ${level} · gallery complete`;
  })();

  const galleryComplete = (mode === 'pictures' && !bwPuzzle) || (mode === 'color' && !colorPuzzle);
  const revealedName = mode === 'color' ? colorPuzzle?.name : bwPicture?.name;

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
          <span className="chip">{chipLabel}</span>
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
      <div className="dash-filters mt-3">
        {(['pictures', 'color', 'endless'] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            className={`dash-filter${mode === m ? ' active' : ''}`}
            aria-pressed={mode === m}
            onClick={() => switchMode(m)}
          >
            {MODE_LABEL[m]}
          </button>
        ))}
      </div>
      <p className="mt-2 text-[var(--ink-dim)]">{MODE_INTRO[mode]}</p>
      {levelStars > 0 && (
        <p className="mt-2 flex items-center gap-1 text-sm font-semibold">
          <Star size={16} aria-hidden /> Best on this level: {'★'.repeat(levelStars)}
          {'☆'.repeat(3 - levelStars)}
        </p>
      )}

      {galleryComplete ? (
        <section className="card mt-4 p-5 text-center">
          <p className="font-display text-2xl font-bold">Every picture revealed.</p>
          <p className="mt-1 text-sm text-[var(--ink-dim)]">
            You finished this gallery. Pick any picture below to play it again, or try another mode.
          </p>
        </section>
      ) : mode === 'color' && colorPuzzle ? (
        <>
          <section className="card mt-4 overflow-x-auto p-3 sm:p-4">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold">Colour:</span>
              {colorPuzzle.palette.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-bold"
                  style={{
                    background: PALETTE[c],
                    borderColor: selectedColor === c ? 'var(--ink)' : 'transparent',
                    color: '#fff',
                  }}
                  aria-label={`Paint with colour ${c}`}
                  aria-pressed={selectedColor === c}
                  onClick={() => setSelectedColor(c)}
                >
                  {selectedColor === c ? '✓' : ''}
                </button>
              ))}
            </div>
            <div
              className="mx-auto grid"
              style={{
                gridTemplateColumns: `auto repeat(${colorPuzzle.size}, minmax(0, 1fr))`,
                maxWidth: colorPuzzle.size > 12 ? '100%' : '480px',
              }}
            >
              <div />
              {colorPuzzle.colClues.map((clue, c) => (
                <div
                  key={`ch-${c}`}
                  className="flex flex-col items-center justify-end px-0.5 pb-1 text-[0.65rem] font-bold leading-tight sm:text-xs"
                  style={{
                    opacity: colorLineDone(false, c) ? 0.35 : 1,
                    textDecoration: colorLineDone(false, c) ? 'line-through' : 'none',
                  }}
                >
                  {clue.length ? (
                    clue.map((cl, i) => (
                      <span key={i} style={{ color: PALETTE[cl.c] }}>
                        {cl.n}
                      </span>
                    ))
                  ) : (
                    <span style={{ color: 'var(--ink-dim)' }}>0</span>
                  )}
                </div>
              ))}
              {colorPuzzle.rowClues.map((clue, r) => (
                <div key={`row-${r}`} className="contents">
                  <div
                    className="flex items-center justify-end gap-1 pr-1.5 text-[0.65rem] font-bold sm:text-xs"
                    style={{
                      opacity: colorLineDone(true, r) ? 0.35 : 1,
                      textDecoration: colorLineDone(true, r) ? 'line-through' : 'none',
                    }}
                  >
                    {clue.length ? (
                      clue.map((cl, i) => (
                        <span key={i} style={{ color: PALETTE[cl.c] }}>
                          {cl.n}
                        </span>
                      ))
                    ) : (
                      <span style={{ color: 'var(--ink-dim)' }}>0</span>
                    )}
                  </div>
                  {Array.from({ length: colorPuzzle.size }, (_, c) => {
                    const v = colorState.cells[cellKey(r, c)] ?? 0;
                    return (
                      <button
                        key={cellKey(r, c)}
                        type="button"
                        className="flex aspect-square items-center justify-center border text-sm font-bold"
                        style={{
                          borderColor: 'var(--cell-line)',
                          background: v > 0 ? PALETTE[v] : 'var(--cell)',
                          color: v === -1 ? 'var(--ink-dim)' : 'var(--cell)',
                        }}
                        aria-label={`Row ${r + 1}, column ${c + 1}: ${
                          v > 0 ? 'painted' : v === -1 ? 'marked empty' : 'blank'
                        }`}
                        onClick={() => tapColorCell(r, c)}
                      >
                        {v === -1 ? '✕' : ''}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
            <p className="mt-3 text-center text-sm text-[var(--ink-dim)]">
              {colorFilledCount} of {colorSolutionCount} true squares painted · Hints used: {colorState.hints} ·
              Mistakes: {colorState.mistakes}
            </p>
          </section>

          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className="btn" onClick={useColorHint}>
              <Lightbulb size={18} aria-hidden /> Hint (free)
            </button>
            <button type="button" className="btn" onClick={restartColor}>
              <RotateCcw size={18} aria-hidden /> Start over
            </button>
          </div>
        </>
      ) : bwPuzzle ? (
        <>
          <section className="card mt-4 overflow-x-auto p-3 sm:p-4">
            <div
              className="mx-auto grid"
              style={{
                gridTemplateColumns: `auto repeat(${bwPuzzle.size}, minmax(0, 1fr))`,
                maxWidth: bwPuzzle.size > 12 ? '100%' : '480px',
              }}
            >
              <div />
              {bwPuzzle.colClues.map((clue, c) => (
                <div
                  key={`ch-${c}`}
                  className="flex flex-col items-center justify-end px-0.5 pb-1 text-[0.65rem] font-bold leading-tight sm:text-xs"
                  style={{
                    opacity: bwColDone(c) ? 0.35 : 1,
                    textDecoration: bwColDone(c) ? 'line-through' : 'none',
                    color: 'var(--ink-dim)',
                  }}
                >
                  {clue.length ? clue.map((n, i) => <span key={i}>{n}</span>) : <span>0</span>}
                </div>
              ))}
              {bwPuzzle.rowClues.map((clue, r) => (
                <div key={`row-${r}`} className="contents">
                  <div
                    className="flex items-center justify-end gap-1 pr-1.5 text-[0.65rem] font-bold sm:text-xs"
                    style={{
                      opacity: bwRowDone(r) ? 0.35 : 1,
                      textDecoration: bwRowDone(r) ? 'line-through' : 'none',
                      color: 'var(--ink-dim)',
                    }}
                  >
                    {clue.length ? clue.join(' ') : '0'}
                  </div>
                  {Array.from({ length: bwPuzzle.size }, (_, c) => {
                    const m = bwState.cells[cellKey(r, c)] ?? 0;
                    return (
                      <button
                        key={cellKey(r, c)}
                        type="button"
                        className="flex aspect-square items-center justify-center border text-sm font-bold"
                        style={{
                          borderColor: 'var(--cell-line)',
                          background: m === 1 ? 'var(--ink)' : 'var(--cell)',
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
              {bwFilledCount} of {bwSolutionCount} true squares filled · Hints used: {bwState.hints} ·
              Mistakes: {bwState.mistakes}
            </p>
          </section>

          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className="btn" onClick={useBwHint}>
              <Lightbulb size={18} aria-hidden /> Hint (free)
            </button>
            <button type="button" className="btn" onClick={restartBw}>
              <RotateCcw size={18} aria-hidden /> Start over
            </button>
          </div>
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
                The bot finished first this time — no progress recorded. Start over to race again.
              </p>
            )}
          </section>
        </>
      ) : null}
      {msg && <p className="mt-2 text-sm font-semibold">{msg}</p>}

      {won !== null && (
        <section className="card mt-4 p-5 text-center">
          <p className="font-display text-2xl font-bold">
            {revealedName ? `You revealed a ${revealedName}!` : 'Picture complete.'}
          </p>
          <p className="mt-1 text-lg" aria-label={`${won} of 3 stars`}>
            {'★'.repeat(won)}
            <span className="opacity-40">{'★'.repeat(3 - won)}</span>
          </p>
          <p className="text-sm text-[var(--ink-dim)]">
            {revealedName
              ? 'A real picture, revealed one square at a time.'
              : 'Every number lines up. The next picture is a little bigger.'}
          </p>
          <div className="mt-3 flex justify-center gap-2">
            <button type="button" className="btn btn-primary" onClick={() => setLevel(level + 1)}>
              Next level
            </button>
            <Link href="/" className="btn">Home</Link>
          </div>
        </section>
      )}

      {(mode === 'pictures' || mode === 'color') && (
        <section className="card mt-4 p-4">
          <h2 className="font-display text-lg font-bold">Gallery</h2>
          <p className="mt-1 text-sm text-[var(--ink-dim)]">
            {mode === 'pictures'
              ? 'Every picture in the gallery, in order. Locked pictures open as you finish levels.'
              : 'Every colour picture in the gallery, in order. Locked pictures open as you finish levels.'}
          </p>
          <div className="dash-filters mt-3">
            {(mode === 'pictures' ? BW_PICTURES : COLOR_PICTURES).map((pic, i) => {
              const picLevel = i + 1;
              const locked = picLevel > unlocked;
              return (
                <button
                  key={pic.name}
                  type="button"
                  className={`dash-filter${level === picLevel ? ' active' : ''}`}
                  disabled={locked}
                  onClick={() => setLevel(picLevel)}
                >
                  {pic.name} · {pic.rows.length}×{pic.rows.length}
                  {locked ? ' 🔒' : ''}
                </button>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}
