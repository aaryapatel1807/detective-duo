'use client';

/**
 * Lantern and Map, solo (Duo Corner).
 * You walk a dark maze and see only your tile and the passages out of
 * it. The bot reads the map and gives vague directions you have to
 * interpret. Keys open locked doors; trapdoors send you back to the start.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, DoorOpen, KeyRound, Lightbulb, RotateCcw } from 'lucide-react';
import {
  describeView,
  generateMaze,
  tryStep,
  vagueDirection,
  visibleCells,
  type Dir,
  type LanternMaze,
} from '@/lib/generators/lanternMaze';
import { levelSeed } from '@/lib/generators/rng';
import {
  getGameProgress,
  loadLocalProgress,
  recordWin,
  type ProgressMap,
} from '@/lib/progress';
import { useTheme } from '@/components/ThemeProvider';
import { PlayHeader, WinPanel } from '@/components/duo/PlayBits';

const GAME_ID = 'lantern-map';

interface SoloState {
  pos: [number, number];
  keys: number[];
  steps: number;
  trapsHit: number;
  hints: number;
}

export default function LanternMapPage() {
  const { userId } = useTheme();
  const salt = userId ?? 'guest';
  const [progress, setProgress] = useState<ProgressMap>({});
  const [level, setLevel] = useState(1);
  const [state, setState] = useState<SoloState | null>(null);
  const [won, setWon] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const loadedFor = useRef('');

  const myProgress = getGameProgress(progress, GAME_ID);
  const unlocked = Math.max(myProgress.currentLevel, 1);
  const maze: LanternMaze = useMemo(
    () => generateMaze(levelSeed(GAME_ID, level, salt), level),
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
    setWon(null);
    setMsg(null);
    try {
      const raw = localStorage.getItem(`dd-v2-lantern-${tag}`);
      if (raw) {
        const parsed = JSON.parse(raw) as SoloState;
        if (parsed.pos) {
          setState(parsed);
          return;
        }
      }
    } catch {
      /* ignore */
    }
    setState({ pos: maze.start, keys: [], steps: 0, trapsHit: 0, hints: 0 });
  }, [level, salt, maze.start]);

  useEffect(() => {
    if (!state || loadedFor.current !== `${salt}|${level}`) return;
    try {
      localStorage.setItem(`dd-v2-lantern-${salt}|${level}`, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state, level, salt]);

  const move = (dir: Dir) => {
    if (!state || won !== null) return;
    const res = tryStep(maze, state.pos, dir, state.keys);
    if (!res.info.ok) {
      setMsg(
        res.info.blocked === 'locked-door'
          ? 'Locked. Its key is somewhere in the dark — go and find it.'
          : res.info.blocked === 'edge'
            ? 'That way is the edge of the map.'
            : 'A wall. Try another way.',
      );
      return;
    }
    const keys = res.info.pickedKey !== null ? [...state.keys, res.info.pickedKey] : state.keys;
    const ns: SoloState = {
      pos: res.pos,
      keys,
      steps: state.steps + 1,
      trapsHit: state.trapsHit + (res.info.hitTrap ? 1 : 0),
      hints: state.hints,
    };
    setState(ns);
    if (res.info.reachedExit) {
      const { map, stars } = recordWin(progress, GAME_ID, level, ns.hints, ns.trapsHit);
      setProgress(map);
      setWon(stars);
      try {
        localStorage.removeItem(`dd-v2-lantern-${salt}|${level}`);
      } catch {
        /* ignore */
      }
      return;
    }
    setMsg(
      res.info.hitTrap
        ? 'A trapdoor! You are back at the start. The maze has not changed — find your way again.'
        : res.info.pickedKey !== null
          ? 'You found a key. It opens one locked door somewhere ahead.'
          : null,
    );
  };

  const askGuide = () => {
    if (!state || won !== null) return;
    const hint = vagueDirection(maze, state.pos, state.keys, Math.random);
    if (!hint) {
      setMsg('The guide is quiet. You must be nearly out.');
      return;
    }
    setState({ ...state, hints: state.hints + 1 });
    setMsg(`The guide whispers: “${hint.text}”`);
  };

  const restart = () => {
    setState({ pos: maze.start, keys: [], steps: 0, trapsHit: 0, hints: 0 });
    setWon(null);
    setMsg(null);
    try {
      localStorage.removeItem(`dd-v2-lantern-${salt}|${level}`);
    } catch {
      /* ignore */
    }
  };

  if (!state) {
    return (
      <main className="mx-auto flex min-h-[60vh] w-full max-w-md items-center justify-center px-4">
        <p className="text-[var(--ink-dim)]">Lighting the lantern…</p>
      </main>
    );
  }

  const vis = new Set(visibleCells(maze, state.pos, state.keys).map(([x, y]) => `${x},${y}`));
  const isDoor = (key: string) => maze.doors.includes(key);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-16">
      <PlayHeader
        title="Lantern and Map"
        intro={`A dark ${maze.w} by ${maze.h} maze. You see only your tile and its open passages. Find the exit${maze.doors.length ? `, unlock ${maze.doors.length === 1 ? 'the door' : 'the doors'}` : ''}${maze.traps.length ? ', and mind the trapdoors' : ''}.`}
        level={level}
        unlocked={unlocked}
        onLevel={setLevel}
        bestStars={myProgress.stars[String(level)] ?? 0}
      />

      <section className="card mt-4 p-4">
        <div
          className="mx-auto grid w-full max-w-md"
          style={{ gridTemplateColumns: `repeat(${maze.w}, minmax(0, 1fr))` }}
          role="img"
          aria-label="Dark maze, only nearby tiles visible"
        >
          {Array.from({ length: maze.h }, (_, y) =>
            Array.from({ length: maze.w }, (_, x) => {
              const key = `${x},${y}`;
              const seen = vis.has(key);
              const isPlayer = state.pos[0] === x && state.pos[1] === y;
              const isExit = maze.exit[0] === x && maze.exit[1] === y;
              const keyHere = maze.keyCells[key];
              const hasKey = keyHere !== undefined && !state.keys.includes(keyHere);
              if (!seen && !isPlayer) {
                return <div key={key} className="aspect-square" />;
              }
              const side = (wall: boolean, doorKey: string) => {
                if (!wall) return { color: 'transparent', style: 'none' as const };
                if (isDoor(doorKey)) return { color: 'var(--accent-2)', style: 'dashed' as const };
                return { color: 'var(--line)', style: 'solid' as const };
              };
              const top = side(maze.hWalls[y][x], `h:${y},${x}`);
              const bottom = side(maze.hWalls[y + 1][x], `h:${y + 1},${x}`);
              const left = side(maze.vWalls[y][x], `v:${y},${x}`);
              const right = side(maze.vWalls[y][x + 1], `v:${y},${x + 1}`);
              return (
                <div
                  key={key}
                  className="relative flex aspect-square items-center justify-center"
                  style={{
                    background: 'var(--cell)',
                    borderTopWidth: 2,
                    borderBottomWidth: 2,
                    borderLeftWidth: 2,
                    borderRightWidth: 2,
                    borderTopColor: top.color,
                    borderTopStyle: top.style,
                    borderBottomColor: bottom.color,
                    borderBottomStyle: bottom.style,
                    borderLeftColor: left.color,
                    borderLeftStyle: left.style,
                    borderRightColor: right.color,
                    borderRightStyle: right.style,
                  }}
                >
                  {isPlayer && (
                    <span
                      className="block h-1/2 w-1/2 rounded-full"
                      style={{ background: 'var(--accent)', boxShadow: 'var(--glow)' }}
                      aria-label="You are here"
                    />
                  )}
                  {!isPlayer && isExit && <DoorOpen size={16} aria-label="Exit" />}
                  {!isPlayer && hasKey && <KeyRound size={14} aria-label="Key" />}
                </div>
              );
            }),
          )}
        </div>

        <div className="mx-auto mt-4 grid w-40 grid-cols-3 gap-1">
          <span />
          <button type="button" className="btn !px-2 !py-3" onClick={() => move('up')} aria-label="Move up">
            <ChevronUp size={20} aria-hidden />
          </button>
          <span />
          <button type="button" className="btn !px-2 !py-3" onClick={() => move('left')} aria-label="Move left">
            <ChevronLeft size={20} aria-hidden />
          </button>
          <button type="button" className="btn !px-2 !py-3" onClick={() => move('down')} aria-label="Move down">
            <ChevronDown size={20} aria-hidden />
          </button>
          <button type="button" className="btn !px-2 !py-3" onClick={() => move('right')} aria-label="Move right">
            <ChevronRight size={20} aria-hidden />
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="btn" onClick={askGuide}>
            <Lightbulb size={18} aria-hidden /> Ask the guide (free)
          </button>
          <button type="button" className="btn" onClick={restart}>
            <RotateCcw size={18} aria-hidden /> Start over
          </button>
        </div>
        {msg && <p className="mt-2 text-sm font-semibold">{msg}</p>}
        <p className="mt-1 text-sm text-[var(--ink-dim)]">
          Steps: {state.steps} · Keys: {state.keys.length} of {maze.doors.length} · Hints used:{' '}
          {state.hints} · Dashed lines are locked doors.
        </p>
        <p className="mt-1 text-sm text-[var(--ink-dim)]">
          {describeView(maze, state.pos, state.keys)}
        </p>
      </section>

      {won !== null && (
        <WinPanel
          stars={won}
          line={`Out in ${state.steps} steps. The next maze is bigger, with more doors and trapdoors.`}
          onNext={() => setLevel(level + 1)}
        />
      )}
    </main>
  );
}
