'use client';

/**
 * Sea Battle, Duo Corner.
 *
 * Classic Battleship-style firing, from the classic rules only (no
 * copied art, board graphics, or text from any Battleship product):
 * 10x10 grids, Carrier 5, Battleship 4, Cruiser 3, Submarine 3,
 * Destroyer 2. Fleets are seeded placements, so there is no placement
 * phase — a round starts straight at firing. Players alternate one
 * shot at a time; a hit, miss, or sunk ship is announced after every
 * shot, and the first side to sink the whole opposing fleet wins.
 *
 * The firing grid shows only hit / miss / sunk, never the opponent's
 * ships, and neither fleet's positions are ever rendered, so a
 * pass-and-play opponent cannot peek. Solo plays against Cosy Bot
 * inside SoloQuickShell (a solo win records via onFinish(true));
 * two-player is pass-and-play with a pass-device banner between
 * turns. No animations are used, so prefers-reduced-motion needs no
 * special handling; the bot's shots are paced with a short delay so
 * they can be watched.
 */
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import SoloQuickShell from '@/components/quickgames/SoloQuickShell';
import {
  BOARD_SIZE,
  botNextShot,
  cellIndex,
  cellLabel,
  createSeaBattle,
  fireShot,
  otherPlayer,
  seaBattleWinner,
  shipAt,
  sunkShips,
  type SeaBattlePlayer,
  type SeaBattleState,
} from '@/lib/generators/seaBattle';
import { rngFromSeed } from '@/lib/generators/rng';
import { useTheme } from '@/components/ThemeProvider';

const GAME_ID = 'sea-battle';
const BLURB =
  'Take turns firing at a hidden fleet: Carrier 5, Battleship 4, Cruiser 3, Submarine 3, Destroyer 2. A ship sinks when every cell is hit — sink the whole fleet first to win.';

type Mode = 'solo' | 'duo';

function label(mode: Mode, player: SeaBattlePlayer): string {
  if (mode === 'solo') return player === 0 ? 'You' : 'Cosy Bot';
  return `Player ${player + 1}`;
}

function hitsOf(state: SeaBattleState, shooter: SeaBattlePlayer): number {
  const target = state.fleets[otherPlayer(shooter)]!;
  return state.shots[shooter]!.filter((shot, cell) => shot && shipAt(target, cell)).length;
}

function SeaBattleBoard({
  seed,
  mode,
  disabled,
  onFinish,
  onPlayAgain,
}: {
  seed: string;
  mode: Mode;
  disabled: boolean;
  onFinish: (won: boolean) => void;
  onPlayAgain?: () => void;
}) {
  const [game, setGame] = useState<SeaBattleState>(() => createSeaBattle(seed));
  const [message, setMessage] = useState('Fire a shot — pick any square.');
  const [passCover, setPassCover] = useState(false);
  const finishedRef = useRef(false);

  const winner = game.finished ? seaBattleWinner(game) : null;
  // The grid on screen is always the active shooter's firing grid
  // (the winner's, once the game ends).
  const displayPlayer: SeaBattlePlayer = game.finished
    ? (winner ?? game.turn)
    : game.turn;
  const targetFleet = game.fleets[otherPlayer(displayPlayer)]!;
  const sunkByDisplay = sunkShips(targetFleet, game.shots[displayPlayer]!);
  const sunkSet = new Set(sunkByDisplay);

  const describe = (shooter: SeaBattlePlayer, cell: number, result: string, sunk?: string) => {
    const who = label(mode, shooter);
    if (result === 'sunk') return `${who} fired at ${cellLabel(cell)} — sunk the ${sunk}!`;
    if (result === 'hit') return `${who} fired at ${cellLabel(cell)} — hit!`;
    return `${who} fired at ${cellLabel(cell)} — miss.`;
  };

  const applyShot = (shooter: SeaBattlePlayer, cell: number) => {
    const out = fireShot(game, shooter, cell);
    if (out.result === 'invalid' || out.result === 'repeat') return;
    setGame(out.state);
    setMessage(describe(shooter, cell, out.result, out.sunkShip));
    if (!out.state.finished && mode === 'duo') setPassCover(true);
  };

  const onCell = (cell: number) => {
    if (game.finished || disabled || passCover) return;
    if (mode === 'solo' && game.turn === 1) return;
    applyShot(game.turn, cell);
  };

  // Cosy Bot: one paced shot per turn so its moves can be watched.
  useEffect(() => {
    if (mode !== 'solo' || game.turn !== 1 || game.finished || disabled) return;
    const t = setTimeout(() => {
      const pick = botNextShot(
        game.fleets[0]!,
        game.shots[1]!,
        rngFromSeed(`sea-battle-bot|${game.shots[1]!.filter(Boolean).length}|${Date.now()}`),
      );
      if (pick >= 0) applyShot(1, pick);
    }, 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game, mode, disabled]);

  // Solo result records once through the shell; duo results stay local.
  useEffect(() => {
    if (!game.finished || winner === null || mode !== 'solo' || finishedRef.current) return;
    finishedRef.current = true;
    onFinish(winner === 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.finished, winner, mode]);

  const botThinking = mode === 'solo' && game.turn === 1 && !game.finished;

  return (
    <section className="card mt-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-semibold">
        <span>
          {label(mode, 0)} · {sunkShips(game.fleets[1]!, game.shots[0]!).length} ships sunk
        </span>
        <span className="chip">
          {game.finished
            ? 'Fleet sunk — game over!'
            : botThinking
              ? 'Cosy Bot is thinking…'
              : `${label(mode, game.turn)}’s turn`}
        </span>
        <span>
          {label(mode, 1)} · {sunkShips(game.fleets[0]!, game.shots[1]!).length} ships sunk
        </span>
      </div>
      <p className="mt-2 text-sm text-[var(--ink-dim)]">
        {label(mode, 0)}: {hitsOf(game, 0)} hits of {game.shots[0]!.filter(Boolean).length} shots ·{' '}
        {label(mode, 1)}: {hitsOf(game, 1)} hits of {game.shots[1]!.filter(Boolean).length} shots
      </p>
      <p className="mt-1 text-sm font-semibold" role="status" aria-live="polite">
        {message}
      </p>

      {passCover && !game.finished ? (
        <div className="mt-4 p-5 text-center">
          <p className="font-display text-2xl font-bold">Pass the device!</p>
          <p className="mt-1 text-sm text-[var(--ink-dim)]">
            {label(mode, game.turn)} — look away, other player. Tap when you are ready to fire.
          </p>
          <button
            type="button"
            className="btn btn-primary min-h-[48px] mt-3"
            onClick={() => setPassCover(false)}
          >
            I&apos;m {label(mode, game.turn)} — show my grid
          </button>
        </div>
      ) : (
        <>
          <p className="mt-3 text-sm text-[var(--ink-dim)]">
            {label(mode, displayPlayer)}&apos;s firing grid — only your own shots are shown, never
            the enemy fleet.
          </p>
          <div
            className="mx-auto mt-3 grid w-full gap-1"
            style={{
              gridTemplateColumns: `1.25rem repeat(${BOARD_SIZE}, minmax(0, 1fr))`,
              maxWidth: '30rem',
            }}
            role="grid"
            aria-label={`${label(mode, displayPlayer)}'s firing grid`}
          >
            <span aria-hidden />
            {'ABCDEFGHIJ'.split('').map((letter) => (
              <span key={letter} className="text-center text-xs font-semibold text-[var(--ink-dim)]" aria-hidden>
                {letter}
              </span>
            ))}
            {Array.from({ length: BOARD_SIZE }, (_, row) => (
              <div key={row} className="contents">
                <span className="flex items-center justify-center text-xs font-semibold text-[var(--ink-dim)]" aria-hidden>
                  {row + 1}
                </span>
                {Array.from({ length: BOARD_SIZE }, (_, col) => {
                  const cell = cellIndex(row, col);
                  const shot = game.shots[displayPlayer]![cell];
                  const ship = shot ? shipAt(targetFleet, cell) : undefined;
                  const sunk = ship !== undefined && sunkSet.has(ship.name);
                  const busy = botThinking || disabled || game.finished || passCover;
                  return (
                    <button
                      key={cell}
                      type="button"
                      className="flex aspect-square items-center justify-center rounded-md border text-base font-bold"
                      style={{
                        borderColor: 'var(--line)',
                        background: ship ? 'var(--accent)' : shot ? 'var(--surface)' : 'var(--cell)',
                        color: ship ? 'var(--accent-ink)' : 'var(--ink-dim)',
                        outline: sunk ? '2px solid var(--ink-dim)' : undefined,
                        outlineOffset: sunk ? '-2px' : undefined,
                      }}
                      disabled={shot || busy}
                      onClick={() => onCell(cell)}
                      aria-label={
                        !shot
                          ? `${cellLabel(cell)}, not fired yet`
                          : ship
                            ? `${cellLabel(cell)}, ${sunk ? `sunk ${ship.name}` : 'hit'}`
                            : `${cellLabel(cell)}, miss`
                      }
                    >
                      {ship ? '×' : shot ? '•' : ''}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="mt-4 text-sm">
            <p>
              <strong>Ships you have sunk:</strong>{' '}
              {sunkByDisplay.length > 0 ? sunkByDisplay.join(', ') : 'none yet'}
            </p>
            <p className="mt-1 text-[var(--ink-dim)]">
              Fleet: Carrier 5 · Battleship 4 · Cruiser 3 · Submarine 3 · Destroyer 2. A ship
              sinks when all its squares are hit.
            </p>
          </div>
        </>
      )}

      {game.finished && winner !== null && mode === 'duo' && (
        <section className="card mt-4 p-4 text-center">
          <p className="font-display text-2xl font-bold">✓ {label(mode, winner)} wins!</p>
          <p className="mt-1 text-sm text-[var(--ink-dim)]">
            {label(mode, winner)} sank all {game.fleets[otherPlayer(winner)]!.ships.length} ships
            first.
          </p>
          <p className="mt-1 text-sm text-[var(--ink-dim)]">
            Final score: {label(mode, 0)} — {sunkShips(game.fleets[1]!, game.shots[0]!).length}{' '}
            ships sunk, {hitsOf(game, 0)} hits · {label(mode, 1)} —{' '}
            {sunkShips(game.fleets[0]!, game.shots[1]!).length} ships sunk, {hitsOf(game, 1)} hits
          </p>
          {onPlayAgain && (
            <div className="mt-3 flex justify-center gap-2">
              <button
                type="button"
                className="btn btn-primary min-h-[48px]"
                onClick={onPlayAgain}
              >
                Play again
              </button>
            </div>
          )}
        </section>
      )}
      {game.finished && winner !== null && mode === 'solo' && winner === 1 && (
        <section className="card mt-4 p-4 text-center">
          <p className="font-display text-2xl font-bold">✗ Cosy Bot sank your fleet.</p>
          <p className="mt-1 text-sm text-[var(--ink-dim)]">
            Final score: You — {sunkShips(game.fleets[1]!, game.shots[0]!).length} ships sunk,{' '}
            {hitsOf(game, 0)} hits · Cosy Bot — {sunkShips(game.fleets[0]!, game.shots[1]!).length}{' '}
            ships sunk, {hitsOf(game, 1)} hits
          </p>
          <p className="mt-1 text-sm text-[var(--ink-dim)]">
            The shell below has the Try again button — try again whenever you like.
          </p>
        </section>
      )}
    </section>
  );
}

export default function SeaBattlePage() {
  const { userId } = useTheme();
  const salt = userId ?? 'guest';
  const [mode, setMode] = useState<Mode | null>(null);
  const [round, setRound] = useState(0);

  if (mode === 'solo') {
    return (
      <SoloQuickShell gameId={GAME_ID} title="Sea Battle" blurb={BLURB}>
        {({ seed, disabled, onFinish }) => (
          <SeaBattleBoard seed={seed} mode="solo" disabled={disabled} onFinish={onFinish} />
        )}
      </SoloQuickShell>
    );
  }

  if (mode === 'duo') {
    const seed = `duo|sea-battle|${salt}|round-${round}`;
    return (
      <main className="mx-auto w-full max-w-3xl px-4 pb-16">
        <div className="mt-2">
          <Link href="/" className="btn min-h-[48px] !px-3 !py-2 text-sm">
            <ArrowLeft size={16} aria-hidden /> Home
          </Link>
        </div>
        <h1 className="mt-4 text-3xl font-bold">Sea Battle</h1>
        <p className="mt-1 text-sm text-[var(--ink-dim)]">{BLURB}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="btn min-h-[48px]" onClick={() => setRound((r) => r + 1)}>
            New fleets
          </button>
          <button type="button" className="btn min-h-[48px]" onClick={() => setMode(null)}>
            Change mode
          </button>
        </div>
        <SeaBattleBoard
          key={seed}
          seed={seed}
          mode="duo"
          disabled={false}
          onFinish={() => {}}
          onPlayAgain={() => setRound((r) => r + 1)}
        />
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-16">
      <div className="mt-2">
        <Link href="/" className="btn min-h-[48px] !px-3 !py-2 text-sm">
          <ArrowLeft size={16} aria-hidden /> Home
        </Link>
      </div>
      <h1 className="mt-4 text-3xl font-bold">Sea Battle</h1>
      <p className="mt-1 text-sm text-[var(--ink-dim)]">{BLURB}</p>
      <section className="card mt-4 p-5 text-center">
        <p className="text-sm text-[var(--ink-dim)]">How do you want to play?</p>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          <button type="button" className="btn btn-primary min-h-[48px]" onClick={() => setMode('solo')}>
            Solo vs Cosy Bot
          </button>
          <button type="button" className="btn btn-primary min-h-[48px]" onClick={() => setMode('duo')}>
            Two players, one device
          </button>
        </div>
        <p className="mt-3 text-sm text-[var(--ink-dim)]">
          10 by 10 grids · 5 ships each · no placement phase, the fleets are already hidden and
          waiting.
        </p>
      </section>
    </main>
  );
}
