'use client';

/**
 * Dots and Boxes, solo vs the bot (Duo Corner).
 * Take turns drawing a line; close a box and you go again. The bot
 * counts chains (see lib/generators/dotsBoxes) and is weaker on Easy.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Lightbulb, RotateCcw } from 'lucide-react';
import {
  chooseBotMove,
  claimEdge,
  emptyBoard,
  hintMove,
  isFull,
  paramsForLevel,
  score,
  type DotsBoxesBoard,
  type DotsEdge,
} from '@/lib/generators/dotsBoxes';
import {
  getGameProgress,
  loadLocalProgress,
  recordWin,
  type ProgressMap,
} from '@/lib/progress';
import { useTheme } from '@/components/ThemeProvider';
import { PlayHeader, WinPanel } from '@/components/duo/PlayBits';
import DotsBoard from '@/components/duo/DotsBoard';

const GAME_ID = 'dots-boxes';

interface SoloState {
  board: DotsBoxesBoard;
  turn: 0 | 1;
  hints: number;
}

export default function DotsBoxesPage() {
  const { userId } = useTheme();
  const salt = userId ?? 'guest';
  const [progress, setProgress] = useState<ProgressMap>({});
  const [level, setLevel] = useState(1);
  const [state, setState] = useState<SoloState | null>(null);
  const [won, setWon] = useState<number | null>(null);
  const [botWon, setBotWon] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [hintEdge, setHintEdge] = useState<DotsEdge | null>(null);
  const loadedFor = useRef('');

  const myProgress = getGameProgress(progress, GAME_ID);
  const unlocked = Math.max(myProgress.currentLevel, 1);
  const params = useMemo(() => paramsForLevel(level), [level]);

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
    setBotWon(false);
    setMsg(null);
    setHintEdge(null);
    try {
      const raw = localStorage.getItem(`dd-v2-dots-${tag}`);
      if (raw) {
        const parsed = JSON.parse(raw) as SoloState;
        if (parsed.board && parsed.board.size === params.size) {
          setState(parsed);
          return;
        }
      }
    } catch {
      /* ignore */
    }
    setState({ board: emptyBoard(params.size), turn: 0, hints: 0 });
  }, [level, salt, params.size]);

  // Persist in-progress state.
  useEffect(() => {
    if (!state || loadedFor.current !== `${salt}|${level}`) return;
    try {
      localStorage.setItem(`dd-v2-dots-${salt}|${level}`, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state, level, salt]);

  const finishIfFull = (board: DotsBoxesBoard, s: SoloState) => {
    if (!isFull(board)) return;
    const [mine, bot] = score(board);
    if (mine > bot) {
      const { map, stars } = recordWin(progress, GAME_ID, level, s.hints, 0);
      setProgress(map);
      setWon(stars);
      try {
        localStorage.removeItem(`dd-v2-dots-${salt}|${level}`);
      } catch {
        /* ignore */
      }
    } else if (bot > mine) {
      setBotWon(true);
    } else {
      // A tie still counts as a finished round.
      const { map, stars } = recordWin(progress, GAME_ID, level, s.hints, 0);
      setProgress(map);
      setWon(stars);
    }
  };

  const doMove = (edge: DotsEdge, player: 0 | 1) => {
    if (won !== null || botWon || !state) return;
    if (player === 0 && state.turn !== 0) return;
    if (player === 1 && state.turn !== 1) return;
    const res = claimEdge(state.board, player, edge);
    if (!res.valid) return;
    const nextTurn = res.completed.length > 0 ? player : ((1 - player) as 0 | 1);
    const ns: SoloState = { board: res.board, turn: nextTurn, hints: state.hints };
    setState(ns);
    setHintEdge(null);
    setMsg(
      res.completed.length > 0
        ? player === 0
          ? `You closed ${res.completed.length === 1 ? 'a box' : `${res.completed.length} boxes`} — go again.`
          : `The bot closed ${res.completed.length === 1 ? 'a box' : `${res.completed.length} boxes`} — it goes again.`
        : null,
    );
    setTimeout(() => finishIfFull(res.board, ns), 0);
  };

  // Bot turn.
  useEffect(() => {
    if (!state || state.turn !== 1 || won !== null || botWon) return;
    const t = setTimeout(() => {
      const move = chooseBotMove(state.board, 1, params.botSkill, Math.random);
      if (move) doMove(move, 1);
    }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.turn, state?.board, won, botWon, params.botSkill]);

  const useHint = () => {
    if (!state || state.turn !== 0 || won !== null || botWon) return;
    const edge = hintMove(state.board, 0, Math.random);
    if (!edge) return;
    setHintEdge(edge);
    setState((s) => (s ? { ...s, hints: s.hints + 1 } : s));
    setMsg('One good line, highlighted. Hints are always free.');
  };

  const restart = () => {
    setState({ board: emptyBoard(params.size), turn: 0, hints: 0 });
    setWon(null);
    setBotWon(false);
    setMsg(null);
    setHintEdge(null);
    try {
      localStorage.removeItem(`dd-v2-dots-${salt}|${level}`);
    } catch {
      /* ignore */
    }
  };

  if (!state) {
    return (
      <main className="mx-auto flex min-h-[60vh] w-full max-w-md items-center justify-center px-4">
        <p className="text-[var(--ink-dim)]">Setting out the dots…</p>
      </main>
    );
  }

  const { board } = state;
  const [mine, bot] = score(board);
  const size = board.size;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-16">
      <PlayHeader
        title="Dots and Boxes"
        intro={`${size} by ${size} boxes. Tap a gap to draw a line. Close a box and you go again — most boxes wins.`}
        level={level}
        unlocked={unlocked}
        onLevel={setLevel}
        bestStars={myProgress.stars[String(level)] ?? 0}
      />

      <section className="card mt-4 p-4">
        <div className="flex items-center justify-between gap-2 text-sm font-semibold">
          <span>
            You · {mine} {mine === 1 ? 'box' : 'boxes'}
          </span>
          <span className="chip">
            {won !== null || botWon
              ? 'Game over'
              : state.turn === 0
                ? 'Your turn'
                : 'Bot is thinking…'}
          </span>
          <span>
            Bot · {bot} {bot === 1 ? 'box' : 'boxes'}
          </span>
        </div>
        <DotsBoard
          board={board}
          onEdge={(e) => doMove(e, 0)}
          interactive={state.turn === 0 && won === null && !botWon}
          hintEdge={hintEdge}
        />
      </section>

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className="btn" onClick={useHint} disabled={state.turn !== 0}>
          <Lightbulb size={18} aria-hidden /> Hint (free)
        </button>
        <button type="button" className="btn" onClick={restart}>
          <RotateCcw size={18} aria-hidden /> Start over
        </button>
      </div>
      {msg && <p className="mt-2 text-sm font-semibold">{msg}</p>}
      <p className="mt-1 text-sm text-[var(--ink-dim)]">
        Hints used: {state.hints} · The bot counts chains, so late-game lines matter most.
      </p>

      {won !== null && (
        <WinPanel
          stars={won}
          line={
            won === 3
              ? 'No hints, and you out-boxed the bot. Lovely work.'
              : 'Most boxes wins, and you won. The next grid is a little bigger.'
          }
          onNext={() => setLevel(level + 1)}
        />
      )}
      {botWon && (
        <section className="card mt-4 p-5 text-center">
          <p className="font-display text-2xl font-bold">The bot took more boxes.</p>
          <p className="mt-1 text-sm text-[var(--ink-dim)]">
            No harm done — the level stays open. Watch for chains: never hand over a long
            run of boxes unless you have to.
          </p>
          <div className="mt-3 flex justify-center gap-2">
            <button type="button" className="btn btn-primary" onClick={restart}>
              Try again
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
