'use client';

/**
 * Memory (Concentration), Duo Corner.
 * Flip two cards on your turn: a matching pair is yours and you go
 * again; a mismatch flips both cards back and passes the turn. When
 * every pair is found, the player with the most pairs wins (a tie is
 * possible). Solo plays the same game against Cosy Bot; two-player is
 * pass-and-play on one device. The grid grows with the level: 6 pairs
 * (Easy), 8 (Medium), 12 (Hard), 18 (Expert). A mismatch counts as a
 * mistake for stars; there is no timer and no way to lose a round
 * except by collecting fewer pairs.
 */
import { useEffect, useRef, useState } from 'react';
import {
  botPick,
  createMemoryGame,
  flipCard,
  generateMemory,
  memoryWinner,
  resolveMismatch,
  type MemoryPlayer,
  type MemoryState,
} from '@/lib/generators/memory';
import { rngFromSeed } from '@/lib/generators/rng';
import {
  getGameProgress,
  loadLocalProgress,
  recordWin,
  type ProgressMap,
} from '@/lib/progress';
import { useTheme } from '@/components/ThemeProvider';
import { PlayHeader, WinPanel } from '@/components/duo/PlayBits';

const GAME_ID = 'memory';
const PLAYER_COLOURS = ['#2563eb', '#db2777'];

type Mode = 'solo' | 'duo';

function playerLabel(mode: Mode, index: MemoryPlayer): string {
  if (mode === 'solo') return index === 0 ? 'You' : 'Cosy Bot';
  return `Player ${index + 1}`;
}

export default function MemoryPage() {
  const { userId } = useTheme();
  const salt = userId ?? 'guest';
  const [progress, setProgress] = useState<ProgressMap>({});
  const [level, setLevel] = useState(1);
  const [mode, setMode] = useState<Mode | null>(null);
  const [game, setGame] = useState<MemoryState | null>(null);
  const [stars, setStars] = useState<number | null>(null);
  const [round, setRound] = useState(0);
  const recordedRef = useRef(false);
  const seenRef = useRef(new Map<string, Set<number>>());

  const myProgress = getGameProgress(progress, GAME_ID);
  const unlocked = Math.max(myProgress.currentLevel, 1);
  const grid = generateMemory('preview', level);

  useEffect(() => {
    const map = loadLocalProgress();
    setProgress(map);
    setLevel(getGameProgress(map, GAME_ID).currentLevel);
  }, []);

  const startGame = (m: Mode, lvl: number, rnd: number) => {
    seenRef.current = new Map();
    recordedRef.current = false;
    setStars(null);
    setMode(m);
    setGame(createMemoryGame(`${salt}|${Date.now()}|${rnd}`, lvl));
  };

  const changeLevel = (lvl: number) => {
    setLevel(lvl);
    if (mode !== null) startGame(mode, lvl, round + 1);
  };

  const restart = () => {
    if (mode === null) return;
    setRound((r) => r + 1);
    startGame(mode, level, round + 1);
  };

  const applyFlip = (index: number) => {
    setGame((prev) => {
      if (!prev) return prev;
      const next = flipCard(prev, index);
      if (next === prev) return prev;
      const symbol = prev.deck[index]!.symbol;
      const set = seenRef.current.get(symbol) ?? new Set<number>();
      set.add(index);
      seenRef.current.set(symbol, set);
      return next;
    });
  };

  const onCard = (index: number) => {
    if (!game || game.finished) return;
    if (mode === 'solo' && game.turn === 1) return;
    applyFlip(index);
  };

  // Mismatched cards stay face up briefly, then flip back and pass the turn.
  useEffect(() => {
    if (!game || !game.awaitingFlipBack) return;
    const t = setTimeout(() => setGame((prev) => (prev ? resolveMismatch(prev) : prev)), 900);
    return () => clearTimeout(t);
  }, [game]);

  // Cosy Bot: one flip per pause so its moves can be watched.
  useEffect(() => {
    if (!game || mode !== 'solo' || game.turn !== 1 || game.finished || game.awaitingFlipBack) return;
    const t = setTimeout(() => {
      const pick = botPick(game, seenRef.current, null, rngFromSeed(`bot|${game.flips}|${Date.now()}`));
      if (pick >= 0) applyFlip(pick);
    }, 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game, mode]);

  // Record a human win once (solo: only when you win; duo: any winner is local).
  const winner = game && game.finished ? memoryWinner(game) : null;
  useEffect(() => {
    if (!game || !game.finished || winner === null || mode === null || recordedRef.current) return;
    if (mode === 'solo' && winner !== 0) {
      recordedRef.current = true;
      return;
    }
    recordedRef.current = true;
    const pairs = game.deck.length / 2;
    const mismatches = Math.max(0, Math.round((game.flips - 2 * pairs) / 2));
    const { map, stars: s } = recordWin(progress, GAME_ID, level, 0, mismatches);
    setProgress(map);
    setStars(s);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.finished, winner, mode]);

  const pairsLeft = game ? game.deck.length / 2 - game.scores[0] - game.scores[1] : 0;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-16">
      <PlayHeader
        title="Memory"
        intro="Flip two cards: find a pair and you keep it and go again; miss, and both flip back and the turn passes. Most pairs wins. The board grows as you climb."
        level={level}
        unlocked={unlocked}
        onLevel={changeLevel}
        bestStars={myProgress.stars[String(level)] ?? 0}
      />

      {mode === null ? (
        <section className="card mt-4 p-5 text-center">
          <p className="text-sm text-[var(--ink-dim)]">How do you want to play?</p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <button type="button" className="btn btn-primary" onClick={() => startGame('solo', level, round)}>
              Solo vs Cosy Bot
            </button>
            <button type="button" className="btn btn-primary" onClick={() => startGame('duo', level, round)}>
              Two players, one device
            </button>
          </div>
          <p className="mt-3 text-sm text-[var(--ink-dim)]">
            {grid.pairs} pairs · {grid.cols} by {grid.rows} board at this level.
          </p>
        </section>
      ) : game === null ? (
        <p className="mt-4 text-[var(--ink-dim)]">Shuffling the cards…</p>
      ) : (
        <>
          <section className="card mt-4 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-semibold">
              <span>
                {playerLabel(mode, 0)} · {game.scores[0]} pairs
              </span>
              <span className="chip">
                {game.finished
                  ? 'All pairs found!'
                  : mode === 'solo' && game.turn === 1
                    ? 'Cosy Bot is thinking…'
                    : `${playerLabel(mode, game.turn)}’s turn${mode === 'duo' ? ' — pass the device' : ''}`}
              </span>
              <span>
                {playerLabel(mode, 1)} · {game.scores[1]} pairs
              </span>
            </div>
            <p className="mt-2 text-sm text-[var(--ink-dim)]">
              Pairs left: {pairsLeft} · Flips: {game.flips}
            </p>

            <div
              className="mx-auto mt-4 grid w-full gap-2"
              style={{
                gridTemplateColumns: `repeat(${grid.cols}, minmax(0, 1fr))`,
                maxWidth: grid.cols <= 4 ? '28rem' : '36rem',
              }}
              role="grid"
              aria-label={`${grid.cols} by ${grid.rows} memory board`}
            >
              {game.deck.map((card) => {
                const owner = game.matchedBy[card.index];
                const faceUp = game.faceUp.includes(card.index) || owner !== null;
                return (
                  <button
                    key={card.index}
                    type="button"
                    className="flex aspect-square items-center justify-center rounded-xl border-2 px-1 text-center text-sm font-bold sm:text-base"
                    style={{
                      borderColor: owner !== null ? PLAYER_COLOURS[owner] : 'var(--line)',
                      background: faceUp ? 'var(--surface)' : 'var(--cell)',
                      opacity: owner !== null ? 0.85 : 1,
                    }}
                    disabled={
                      faceUp ||
                      game.awaitingFlipBack ||
                      game.finished ||
                      (mode === 'solo' && game.turn === 1)
                    }
                    onClick={() => onCard(card.index)}
                    aria-label={
                      faceUp
                        ? `${card.symbol}${owner !== null ? `, collected by ${playerLabel(mode, owner)}` : ''}`
                        : 'Face-down card'
                    }
                  >
                    {faceUp ? card.symbol : '?'}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <button type="button" className="btn" onClick={restart} disabled={game.finished}>
                New board
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setMode(null);
                  setGame(null);
                }}
              >
                Change mode
              </button>
            </div>
          </section>

          {game.finished && winner !== null && stars !== null && (
            <WinPanel
              stars={stars}
              line={`${playerLabel(mode, winner)} found ${game.scores[winner]} of ${game.deck.length / 2} pairs.`}
              onNext={() => {
                const next = level + 1;
                setLevel(next);
                startGame(mode, next, round + 1);
              }}
            />
          )}
          {game.finished && winner !== null && stars === null && (
            <section className="card mt-4 p-5 text-center">
              <p className="font-display text-2xl font-bold">
                {mode === 'solo' && winner === 1 ? 'Cosy Bot wins this one.' : 'Lovely round.'}
              </p>
              <p className="mt-1 text-sm text-[var(--ink-dim)]">
                {playerLabel(mode, winner)} found {game.scores[winner]} of {game.deck.length / 2} pairs.
              </p>
              <div className="mt-3 flex justify-center gap-2">
                <button type="button" className="btn btn-primary" onClick={restart}>
                  Play again
                </button>
              </div>
            </section>
          )}
          {game.finished && winner === null && (
            <section className="card mt-4 p-5 text-center">
              <p className="font-display text-2xl font-bold">A perfect tie.</p>
              <p className="mt-1 text-sm text-[var(--ink-dim)]">
                {game.scores[0]} pairs each — neither side blinked.
              </p>
              <div className="mt-3 flex justify-center gap-2">
                <button type="button" className="btn btn-primary" onClick={restart}>
                  Play again
                </button>
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}
