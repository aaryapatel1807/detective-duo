'use client';

/**
 * Escape the Maze, solo.
 * A seeded maze per level (see lib/generators/maze): the grid grows with
 * the level, the exit is always the bottom-right corner, and the maze is
 * always solvable. Move with arrow keys / WASD or the on-screen pad.
 * The timer only records how long a round took — it never ends a round
 * and never costs a star. Hints are free and just count toward stars,
 * like every other game here.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Flag, Lightbulb, RotateCcw } from 'lucide-react';
import {
  generateLevelMaze,
  movePos,
  nextStep,
  samePos,
  solveMaze,
  type MazeDirection,
  type MazePos,
} from '@/lib/generators/maze';
import {
  getGameProgress,
  loadLocalProgress,
  recordWin,
  type ProgressMap,
} from '@/lib/progress';
import { useTheme } from '@/components/ThemeProvider';
import StickyActionBar from '@/components/StickyActionBar';
import { PlayHeader, WinPanel } from '@/components/duo/PlayBits';

const GAME_ID = 'escape-maze';

interface MazeState {
  pos: MazePos;
  moves: number;
  hints: number;
  elapsed: number;
}

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function EscapeMazePage() {
  const { userId } = useTheme();
  const salt = userId ?? 'guest';
  const [progress, setProgress] = useState<ProgressMap>({});
  const [level, setLevel] = useState(1);
  const [state, setState] = useState<MazeState | null>(null);
  const [won, setWon] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [hintCell, setHintCell] = useState<MazePos | null>(null);
  const loadedFor = useRef('');

  const myProgress = getGameProgress(progress, GAME_ID);
  const unlocked = Math.max(myProgress.currentLevel, 1);
  const maze = useMemo(() => generateLevelMaze(level, salt), [level, salt]);
  const shortest = useMemo(() => {
    const path = solveMaze(maze);
    return path ? path.length - 1 : 0;
  }, [maze]);

  useEffect(() => {
    const map = loadLocalProgress();
    setProgress(map);
    setLevel(getGameProgress(map, GAME_ID).currentLevel);
  }, []);

  // Load / fresh state per level (resume where she left off).
  useEffect(() => {
    const tag = `${salt}|${level}`;
    if (loadedFor.current === tag) return;
    loadedFor.current = tag;
    setWon(null);
    setMsg(null);
    setHintCell(null);
    try {
      const raw = localStorage.getItem(`dd-v2-maze-${tag}`);
      if (raw) {
        const parsed = JSON.parse(raw) as MazeState;
        if (
          parsed.pos &&
          parsed.pos.x >= 0 &&
          parsed.pos.x < maze.width &&
          parsed.pos.y >= 0 &&
          parsed.pos.y < maze.height &&
          typeof parsed.moves === 'number' &&
          typeof parsed.hints === 'number'
        ) {
          // A saved position on the exit should not happen (a win clears
          // the save); if it does, restart the level rather than showing
          // a win panel with no stars.
          if (samePos(parsed.pos, maze.exit)) {
            setState({ pos: maze.start, moves: 0, hints: 0, elapsed: 0 });
            return;
          }
          setState({ ...parsed, elapsed: parsed.elapsed ?? 0 });
          return;
        }
      }
    } catch {
      /* ignore */
    }
    setState({ pos: maze.start, moves: 0, hints: 0, elapsed: 0 });
  }, [level, salt, maze]);

  // Persist in-progress state.
  useEffect(() => {
    if (!state || loadedFor.current !== `${salt}|${level}`) return;
    try {
      localStorage.setItem(`dd-v2-maze-${salt}|${level}`, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state, level, salt]);

  // Timer: a record only, never a loss condition.
  useEffect(() => {
    if (!state || won !== null) return;
    const t = setInterval(() => {
      setState((s) => (s ? { ...s, elapsed: s.elapsed + 1 } : s));
    }, 1000);
    return () => clearInterval(t);
  }, [state, won]);

  const doMove = (dir: MazeDirection) => {
    if (!state || won !== null) return;
    const next = movePos(maze, state.pos, dir);
    if (samePos(next, state.pos)) {
      setMsg('That way is a wall. Try another direction.');
      return;
    }
    const ns: MazeState = { ...state, pos: next, moves: state.moves + 1 };
    setState(ns);
    setHintCell(null);
    if (samePos(next, maze.exit)) {
      const { map, stars } = recordWin(progress, GAME_ID, level, state.hints, 0);
      setProgress(map);
      setWon(stars);
      try {
        localStorage.removeItem(`dd-v2-maze-${salt}|${level}`);
      } catch {
        /* ignore */
      }
    } else {
      setMsg(null);
    }
  };

  // Keyboard: arrows and WASD.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const dir: MazeDirection | null =
        key === 'arrowup' || key === 'w'
          ? 'up'
          : key === 'arrowdown' || key === 's'
            ? 'down'
            : key === 'arrowleft' || key === 'a'
              ? 'left'
              : key === 'arrowright' || key === 'd'
                ? 'right'
                : null;
      if (!dir) return;
      e.preventDefault();
      doMove(dir);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, won, maze, level, progress, salt]);

  const useHint = () => {
    if (!state || won !== null) return;
    const step = nextStep(maze, state.pos);
    if (!step) return;
    setHintCell(step);
    setState((s) => (s ? { ...s, hints: s.hints + 1 } : s));
    setMsg('The next step on the shortest route is highlighted. Hints are always free.');
  };

  const restart = () => {
    setState({ pos: maze.start, moves: 0, hints: 0, elapsed: 0 });
    setWon(null);
    setMsg(null);
    setHintCell(null);
    try {
      localStorage.removeItem(`dd-v2-maze-${salt}|${level}`);
    } catch {
      /* ignore */
    }
  };

  if (!state) {
    return (
      <main className="mx-auto flex min-h-[60vh] w-full max-w-md items-center justify-center px-4">
        <p className="text-[var(--ink-dim)]">Drawing the maze…</p>
      </main>
    );
  }

  const padButton = (dir: MazeDirection, Icon: typeof ChevronUp, label: string) => (
    <button
      type="button"
      className="btn !px-3 !py-2"
      onClick={() => doMove(dir)}
      aria-label={`Move ${label}`}
      disabled={won !== null}
    >
      <Icon size={20} aria-hidden />
    </button>
  );

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-16">
      <PlayHeader
        title="Escape the Maze"
        intro={`Find your way from the top-left corner to the flag in the bottom-right. The maze is ${maze.width} by ${maze.height} at this level, and it grows as you climb. No rush — the clock only keeps score.`}
        level={level}
        unlocked={unlocked}
        onLevel={setLevel}
        bestStars={myProgress.stars[String(level)] ?? 0}
      />

      <section className="card mt-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-semibold">
          <span>
            Moves · {state.moves} (shortest route: {shortest})
          </span>
          <span className="chip">{won !== null ? 'You made it out!' : `Time · ${formatTime(state.elapsed)}`}</span>
          <span>Hints · {state.hints}</span>
        </div>

        <div
          className="mx-auto mt-4 w-full max-w-xl"
          role="img"
          aria-label={`${maze.width} by ${maze.height} maze, you are at row ${state.pos.y + 1}, column ${state.pos.x + 1}, exit at the bottom-right corner`}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${maze.width}, 1fr)`,
            }}
          >
            {maze.cells.flatMap((row) =>
              row.map((cell) => {
                const isPlayer = samePos(cell, state.pos);
                const isExit = samePos(cell, maze.exit);
                const isHint = hintCell !== null && samePos(cell, hintCell);
                const wall = '3px solid var(--ink)';
                const open = '1px solid transparent';
                return (
                  <div
                    key={`${cell.x}-${cell.y}`}
                    style={{
                      position: 'relative',
                      aspectRatio: '1',
                      borderTop: cell.walls.top ? wall : open,
                      borderRight: cell.walls.right ? wall : open,
                      borderBottom: cell.walls.bottom ? wall : open,
                      borderLeft: cell.walls.left ? wall : open,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {isHint && (
                      <div
                        aria-hidden
                        style={{
                          position: 'absolute',
                          inset: '15%',
                          borderRadius: '999px',
                          background: 'var(--accent-2)',
                          opacity: 0.45,
                        }}
                      />
                    )}
                    {isPlayer && (
                      <div
                        aria-label="You"
                        style={{
                          width: '60%',
                          height: '60%',
                          borderRadius: '999px',
                          background: 'var(--accent)',
                          border: '2px solid var(--accent-ink)',
                        }}
                      />
                    )}
                    {isExit && !isPlayer && (
                      <Flag size={Math.max(12, Math.min(22, 320 / maze.width))} aria-label="Exit" style={{ color: 'var(--accent-2)' }} />
                    )}
                  </div>
                );
              }),
            )}
          </div>
        </div>
        <p className="mt-3 text-center text-sm text-[var(--ink-dim)]">
          Arrow keys or WASD work too — or tap the pad below.
        </p>
      </section>

      <div className="mt-4 flex flex-col items-center gap-3">
        <div className="flex flex-col items-center gap-1">
          {padButton('up', ChevronUp, 'up')}
          <div className="flex gap-1">
            {padButton('left', ChevronLeft, 'left')}
            {padButton('down', ChevronDown, 'down')}
            {padButton('right', ChevronRight, 'right')}
          </div>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <button type="button" className="btn" onClick={useHint} disabled={won !== null}>
            <Lightbulb size={18} aria-hidden /> Hint (free)
          </button>
          <button type="button" className="btn" onClick={restart}>
            <RotateCcw size={18} aria-hidden /> Start over
          </button>
        </div>
      </div>
      {msg && <p className="mt-2 text-center text-sm font-semibold">{msg}</p>}
      <p className="mt-1 text-center text-sm text-[var(--ink-dim)]">
        Hints used: {state.hints} · Time is only a record — it never ends a round.
      </p>

      {won !== null && (
        <WinPanel
          stars={won}
          line={
            won === 3
              ? 'Out with no hints at all. The next maze is a little bigger.'
              : 'You found the way out. The next maze is a little bigger.'
          }
          onNext={() => setLevel(level + 1)}
        />
      )}
      <StickyActionBar
        status="Escape the Maze"
        spacerPx={176}
        actions={
          won === null
            ? [
                { label: 'Hint (free)', onClick: useHint },
                { label: 'Start over', onClick: restart },
              ]
            : []
        }
      >
        <div className="flex flex-col items-center gap-1">
          {padButton('up', ChevronUp, 'up')}
          <div className="flex gap-1">
            {padButton('left', ChevronLeft, 'left')}
            {padButton('down', ChevronDown, 'down')}
            {padButton('right', ChevronRight, 'right')}
          </div>
        </div>
      </StickyActionBar>
    </main>
  );
}
