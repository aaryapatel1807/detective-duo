'use client';

/**
 * Tic Tac Toe, Duo Corner — classic 3x3, X vs O.
 * Solo vs Cosy Bot (the bot sharpens as levels rise, and blunders
 * sometimes at low levels, so it is never unbeatable there) or
 * two-player pass-and-play on one device, with a turn banner for the
 * handoff. First to complete a row, column, or diagonal wins; a full
 * board with no winner is a draw — never a loss, and never recorded
 * as a win. Solo wins record through SoloQuickShell; a solo draw
 * shows its own panel and a replay instead.
 */
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Home, RotateCcw } from 'lucide-react';
import {
  botMove,
  EMPTY_BOARD,
  isDraw,
  placeMark,
  winner,
  winningLine,
  type Board,
  type Mark,
} from '@/lib/generators/ticTacToe';
import { rngFromSeed } from '@/lib/generators/rng';
import { useTheme } from '@/components/ThemeProvider';
import SoloQuickShell from '@/components/quickgames/SoloQuickShell';

const GAME_ID = 'tic-tac-toe';
const PLAYER_COLOURS = ['var(--accent)', 'var(--accent-2)'];
const MARKS: [Mark, Mark] = ['X', 'O'];

type Mode = 'solo' | 'duo';

function playerLabel(mode: Mode, index: 0 | 1): string {
  if (mode === 'solo') return index === 0 ? 'You' : 'Cosy Bot';
  return `Player ${index + 1}`;
}

function reducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * One game of Tic Tac Toe. The parent remounts this component for a
 * fresh round (SoloQuickShell does so on level change and Replay).
 */
function TicTacToeGame({
  mode,
  level,
  rngSeed,
  disabled,
  onFinish,
}: {
  mode: Mode;
  level: number;
  rngSeed: string;
  disabled: boolean;
  onFinish?: (won: boolean) => void;
}) {
  const [board, setBoard] = useState<Board>([...EMPTY_BOARD]);
  const [turn, setTurn] = useState<0 | 1>(0);
  const [drawShown, setDrawShown] = useState(false);
  const [tally, setTally] = useState({ x: 0, o: 0, draws: 0 });
  const reportedRef = useRef(false);
  const rngRef = useRef<(() => number) | null>(null);
  if (rngRef.current === null) {
    // Seeded per mount, so every fresh round plays differently.
    rngRef.current = rngFromSeed(`${rngSeed}|${Date.now()}`);
  }

  const win = winner(board);
  const winLine = winningLine(board);
  const draw = isDraw(board);
  const finished = win !== null || draw;
  const isBotTurn = mode === 'solo' && turn === 1 && !finished;

  // Report the result exactly once: a solo win/loss to the shell.
  // Duo results stay local — only the session tally below counts
  // them, nothing is recorded. A draw is never reported as a win or
  // a loss — it just shows its own panel below.
  useEffect(() => {
    if (!finished || reportedRef.current) return;
    reportedRef.current = true;
    if (draw) {
      setDrawShown(true);
      setTally((t) => ({ ...t, draws: t.draws + 1 }));
      return;
    }
    setTally((t) => (win === 'X' ? { ...t, x: t.x + 1 } : { ...t, o: t.o + 1 }));
    if (mode === 'solo') {
      onFinish?.(win === 'X');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished, draw, win, mode]);

  // Cosy Bot: one move per pause so its move can be watched. No pause
  // when reduced motion is preferred.
  useEffect(() => {
    if (!isBotTurn) return;
    const t = setTimeout(
      () => {
        const move = botMove(board, 'O', level, rngRef.current!);
        if (move < 0) return;
        const next = placeMark(board, move, 'O');
        if (next) {
          setBoard(next);
          setTurn(0);
        }
      },
      reducedMotion() ? 0 : 650,
    );
    return () => clearTimeout(t);
  }, [isBotTurn, board, level]);

  const rematch = () => {
    setBoard([...EMPTY_BOARD]);
    setTurn(0);
    setDrawShown(false);
    reportedRef.current = false;
    // The tally deliberately survives a rematch: it is the session
    // score, reset only when the page remounts the game.
    rngRef.current = rngFromSeed(`${rngSeed}|${Date.now()}`);
  };

  const onCell = (index: number) => {
    if (disabled || finished || isBotTurn) return;
    const next = placeMark(board, index, MARKS[turn]);
    if (!next) return;
    setBoard(next);
    setTurn(turn === 0 ? 1 : 0);
  };

  const banner = finished
    ? win !== null
      ? `${playerLabel(mode, win === 'X' ? 0 : 1)} wins!`
      : "It's a draw!"
    : isBotTurn
      ? 'Cosy Bot is thinking…'
      : mode === 'duo'
        ? `${playerLabel(mode, turn)} — your turn`
        : 'Your turn';

  // At the finish the banner takes the winner's colour; mid-game it
  // follows the player to move. Words always carry the result, never
  // colour alone.
  const bannerColour =
    finished && win !== null ? PLAYER_COLOURS[win === 'X' ? 0 : 1] : PLAYER_COLOURS[turn];

  return (
    <div>
      {/* Turn banner — in duo mode this is the pass-and-play handoff. */}
      <section
        className="card p-4 text-center"
        style={{ borderColor: bannerColour }}
      >
        <p className="text-lg font-bold" style={{ color: bannerColour }}>
          {banner}
        </p>
        <p className="text-sm text-[var(--ink-dim)]">
          {finished
            ? win !== null
              ? `${MARKS[0]} is ${playerLabel(mode, 0)} · ${MARKS[1]} is ${playerLabel(mode, 1)}`
              : 'Nobody takes this one — the board is full. Play again whenever you like.'
            : `${playerLabel(mode, 0)} plays ${MARKS[0]} · ${playerLabel(mode, 1)} plays ${MARKS[1]}`}
          {tally.x + tally.o + tally.draws > 0 &&
            ` · Round tally: ${playerLabel(mode, 0)} ${tally.x} · ${playerLabel(mode, 1)} ${tally.o} · Draws ${tally.draws}`}
        </p>
      </section>

      {/* Board */}
      <section className="card mt-4 p-3 sm:p-4" aria-label="Tic Tac Toe board">
        <div
          role="grid"
          aria-label="3 by 3 Tic Tac Toe board"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: 8,
          }}
        >
          {board.map((cell, i) => {
            const inWinLine = winLine !== null && winLine.includes(i);
            const row = Math.floor(i / 3) + 1;
            const col = (i % 3) + 1;
            return (
              <button
                key={i}
                type="button"
                role="gridcell"
                aria-label={
                  cell === null
                    ? `Row ${row}, column ${col}, empty`
                    : `Row ${row}, column ${col}, ${cell}`
                }
                disabled={disabled || finished || isBotTurn || cell !== null}
                onClick={() => onCell(i)}
                className="flex min-h-[96px] items-center justify-center rounded-xl border text-5xl font-bold sm:min-h-[112px]"
                style={{
                  borderColor: inWinLine ? 'var(--accent)' : undefined,
                  background: inWinLine ? 'color-mix(in srgb, var(--accent) 18%, transparent)' : undefined,
                  color:
                    cell === null
                      ? undefined
                      : PLAYER_COLOURS[cell === 'X' ? 0 : 1],
                }}
              >
                {cell ?? ''}
              </button>
            );
          })}
        </div>
      </section>

      {/* Draw panel — shown in place of a win/loss panel, and never
          recorded as a win. The shell's Replay also starts a fresh
          round in solo mode. */}
      {drawShown && (
        <section className="card mt-4 p-5 text-center">
          <p className="font-display text-2xl font-bold">A draw — nicely matched.</p>
          <p className="mt-1 text-sm text-[var(--ink-dim)]">
            No winner this time, and no loss either. The board is ready again.
          </p>
          <p className="mt-1 text-sm text-[var(--ink-dim)]">
            Round tally: {playerLabel(mode, 0)} {tally.x} · {playerLabel(mode, 1)} {tally.o} ·
            Draws {tally.draws}
          </p>
          <div className="mt-3 flex justify-center gap-2">
            <button type="button" className="btn btn-primary min-h-[48px]" onClick={rematch}>
              <RotateCcw size={18} aria-hidden /> Play again
            </button>
          </div>
        </section>
      )}

      {win !== null && mode === 'duo' && (
        <section className="card mt-4 p-5 text-center">
          <p className="font-display text-2xl font-bold">
            ✓ {playerLabel(mode, win === 'X' ? 0 : 1)} takes the round!
          </p>
          <p className="mt-1 text-sm text-[var(--ink-dim)]">
            Three in a row. Play again whenever you like.
          </p>
          <p className="mt-1 text-sm text-[var(--ink-dim)]">
            Round tally: {playerLabel(mode, 0)} {tally.x} · {playerLabel(mode, 1)} {tally.o} ·
            Draws {tally.draws}
          </p>
          <div className="mt-3 flex justify-center gap-2">
            <button type="button" className="btn btn-primary min-h-[48px]" onClick={rematch}>
              <RotateCcw size={18} aria-hidden /> Play again
            </button>
          </div>
        </section>
      )}

      {!finished && !drawShown && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="btn min-h-[48px]" onClick={rematch}>
            <RotateCcw size={18} aria-hidden /> Start over
          </button>
        </div>
      )}
    </div>
  );
}

export default function TicTacToePage() {
  const { userId } = useTheme();
  const salt = userId ?? 'guest';
  const [mode, setMode] = useState<Mode | null>(null);

  const startGame = (m: Mode) => {
    setMode(m);
  };

  // Duo wins stay local — nothing is recorded, like the other
  // pass-and-play modes. Solo wins record through SoloQuickShell.

  if (mode === null) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 pb-16">
        <div className="mt-2">
          <Link href="/" className="btn min-h-[48px] !px-3 !py-2 text-sm">
            <ArrowLeft size={16} aria-hidden /> Home
          </Link>
        </div>
        <h1 className="mt-4 text-3xl font-bold">Tic Tac Toe</h1>
        <p className="mt-1 text-sm text-[var(--ink-dim)]">
          The classic 3×3: get three of your marks in a row, column, or
          diagonal. You play X and move first.
        </p>
        <section className="card mt-4 p-5">
          <p className="font-semibold">How do you want to play?</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn btn-primary min-h-[48px]" onClick={() => startGame('solo')}>
              Solo vs Cosy Bot
            </button>
            <button type="button" className="btn min-h-[48px]" onClick={() => startGame('duo')}>
              Two players, one device
            </button>
          </div>
          <p className="mt-3 text-sm text-[var(--ink-dim)]">
            Solo: Cosy Bot plays O and sharpens as levels rise — at low
            levels it sometimes plays a random move, so it can always be
            beaten. A full board with no winner is a draw, never a loss.
            Two players: pass the device on the turn banner.
          </p>
        </section>
      </main>
    );
  }

  if (mode === 'solo') {
    return (
      <div>
        <div className="mx-auto flex w-full max-w-3xl px-4 pt-2">
          <button type="button" className="btn min-h-[48px] !px-3 !py-2 text-sm" onClick={() => setMode(null)}>
            <Home size={18} aria-hidden /> Change mode
          </button>
        </div>
        <SoloQuickShell
          gameId={GAME_ID}
          title="Tic Tac Toe"
          blurb="Classic 3×3: three in a row wins. You play X and move first; Cosy Bot plays O and gets sharper as levels rise."
        >
          {({ level, seed, disabled, onFinish }) => (
            <TicTacToeGame
              mode="solo"
              level={level}
              rngSeed={seed}
              disabled={disabled}
              onFinish={onFinish}
            />
          )}
        </SoloQuickShell>
      </div>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-16">
      <div className="mt-2 flex items-center justify-between gap-2">
        <Link href="/" className="btn min-h-[48px] !px-3 !py-2 text-sm">
          <ArrowLeft size={16} aria-hidden /> Home
        </Link>
        <span className="chip">Two players</span>
      </div>
      <h1 className="mt-4 text-3xl font-bold">Tic Tac Toe</h1>
      <p className="mt-1 text-sm text-[var(--ink-dim)]">
        Classic 3×3, pass-and-play: Player 1 plays X and moves first, Player 2
        plays O. Three in a row wins; a full board is a draw.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className="btn min-h-[48px] !px-3 !py-2" onClick={() => setMode(null)}>
          <Home size={18} aria-hidden /> Change mode
        </button>
      </div>
      <div className="mt-4">
        <TicTacToeGame
          mode="duo"
          level={1}
          rngSeed={`duo|${salt}|${Date.now()}`}
          disabled={false}
        />
      </div>
    </main>
  );
}
