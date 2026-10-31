'use client';

/**
 * A Monopoly-style board game, solo vs the bot or two-player pass-and-play.
 * Classic mechanics live in lib/generators/monopoly (real world cities
 * and airports, original card wording — no official Monopoly streets,
 * card text, logos, or artwork).
 * No real money, no timers that can fail a player; the bot just pauses
 * briefly so its moves can be watched.
 */
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Dices, Home, RotateCcw } from 'lucide-react';
import {
  BOARD,
  botBuildChoice,
  botJailAction,
  botShouldBuy,
  buildHouse,
  buildableSquares,
  buyProperty,
  createGame,
  declineBuy,
  groupColour,
  netWorth,
  payJailFine,
  rollDicePair,
  rollJailDice,
  rollTurn,
  useJailCard,
  type GameState,
  type PlayerIndex,
} from '@/lib/generators/monopoly';
import {
  getGameProgress,
  loadLocalProgress,
  recordWin,
  type ProgressMap,
} from '@/lib/progress';
import { useTheme } from '@/components/ThemeProvider';

const GAME_ID = 'monopoly';
const PLAYER_COLOURS = ['#2563eb', '#db2777'];

type Mode = 'solo' | 'duo';

/** Classic perimeter layout on an 11x11 grid (Go at bottom-right). */
function gridPos(index: number): { gridRow: string; gridColumn: string } {
  if (index === 0) return { gridRow: '11', gridColumn: '11' };
  if (index >= 1 && index <= 9) return { gridRow: '11', gridColumn: `${11 - index}` };
  if (index === 10) return { gridRow: '11', gridColumn: '1' };
  if (index >= 11 && index <= 19) return { gridRow: `${21 - index}`, gridColumn: '1' };
  if (index === 20) return { gridRow: '1', gridColumn: '1' };
  if (index >= 21 && index <= 29) return { gridRow: '1', gridColumn: `${index - 19}` };
  if (index === 30) return { gridRow: '1', gridColumn: '11' };
  return { gridRow: `${index - 29}`, gridColumn: '11' };
}

function playerLabel(mode: Mode, index: PlayerIndex): string {
  if (mode === 'solo') return index === 0 ? 'You' : 'Cosy Bot';
  return `Player ${index + 1}`;
}

export default function MonopolyPage() {
  const { userId } = useTheme();
  const [progress, setProgress] = useState<ProgressMap>({});
  const [mode, setMode] = useState<Mode | null>(null);
  const [game, setGame] = useState<GameState | null>(null);
  const [buildChoice, setBuildChoice] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const recordedRef = useRef(false);
  const botBuiltRef = useRef('');

  useEffect(() => {
    setProgress(loadLocalProgress());
  }, []);

  const startGame = (m: Mode) => {
    const names: [string, string] =
      m === 'solo' ? ['You', 'Cosy Bot'] : ['Player 1', 'Player 2'];
    setMode(m);
    setGame(createGame(`monopoly|${userId ?? 'guest'}|${Date.now()}`, names));
    setMsg(null);
    setBuildChoice(null);
    recordedRef.current = false;
    botBuiltRef.current = '';
  };

  const current = game ? game.players[game.turn] : null;
  const winner = game?.winner ?? null;

  // Record a human win once. A bot win in solo mode is never recorded.
  useEffect(() => {
    if (!game || winner === null || mode === null || recordedRef.current) return;
    const humanWon = mode === 'duo' || winner === 0;
    if (!humanWon) {
      recordedRef.current = true;
      return;
    }
    recordedRef.current = true;
    const { map } = recordWin(progress, GAME_ID, 1, 0, 0);
    setProgress(map);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [winner, mode]);

  // Bot turn: one action per pause so moves can be watched.
  useEffect(() => {
    if (!game || mode !== 'solo' || game.turn !== 1 || game.winner !== null) return;
    const t = setTimeout(() => {
      if (game.phase === 'jail') {
        const action = botJailAction(game);
        setGame(
          action === 'card'
            ? useJailCard(game)
            : action === 'pay'
              ? payJailFine(game)
              : rollJailDice(game, rollDicePair(Math.random)),
        );
        return;
      }
      if (game.phase === 'buy') {
        setGame(botShouldBuy(game) ? buyProperty(game) : declineBuy(game));
        return;
      }
      if (game.phase === 'roll') {
        const key = `${game.turnCount}|${game.turn}`;
        const choice = botBuildChoice(game);
        if (choice !== null && botBuiltRef.current !== key) {
          botBuiltRef.current = key;
          setGame(buildHouse(game, choice).state);
          return;
        }
        setGame(rollTurn(game, rollDicePair(Math.random)));
      }
    }, 900);
    return () => clearTimeout(t);
  }, [game, mode]);

  if (mode === null || game === null || current === null) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 pb-16">
        <div className="mt-2">
          <Link href="/" className="btn !px-3 !py-2 text-sm">
            <ArrowLeft size={16} aria-hidden /> Games
          </Link>
        </div>
        <h1 className="mt-4 text-3xl font-bold">Monopoly</h1>
        <p className="mt-1 text-[var(--ink-dim)]">
          A Monopoly-style stroll around the world: roll, buy cities, collect
          rent, build houses and hotels, and be the last player with money.
          Properties are real cities grouped by country, and the airports are
          real too — the rules are the classic ones.
        </p>
        <section className="card mt-4 p-5">
          <p className="font-semibold">How do you want to play?</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn btn-primary" onClick={() => startGame('solo')}>
              Solo vs Cosy Bot
            </button>
            <button type="button" className="btn" onClick={() => startGame('duo')}>
              Two players, one device
            </button>
          </div>
          <p className="mt-3 text-sm text-[var(--ink-dim)]">
            No real money, no timers, no auctions or trading — decline a property
            and it simply stays for sale. First to bankrupt the other wins.
          </p>
        </section>
      </main>
    );
  }

  const isBotTurn = mode === 'solo' && game.turn === 1;
  const pendingSquare = game.pendingBuy !== null ? BOARD[game.pendingBuy] : null;
  const buildable = buildableSquares(game, game.turn);
  const lastCard = [...game.log].reverse().find((l) => l.startsWith('Card:'));
  const myProgress = getGameProgress(progress, GAME_ID);

  const doBuild = () => {
    if (buildChoice === null) return;
    const res = buildHouse(game, buildChoice);
    setGame(res.state);
    setMsg(res.message);
    setBuildChoice(null);
  };

  const restart = () => {
    if (mode) startGame(mode);
  };

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-16">
      <div className="mt-2 flex items-center justify-between gap-2">
        <Link href="/" className="btn !px-3 !py-2 text-sm">
          <ArrowLeft size={16} aria-hidden /> Games
        </Link>
        <span className="chip">{mode === 'solo' ? 'Solo vs Cosy Bot' : 'Two players'}</span>
      </div>
      <h1 className="mt-4 text-3xl font-bold">Monopoly</h1>
      <p className="mt-1 text-[var(--ink-dim)]">
        Roll, buy, collect rent, build — last player with money wins.
        {myProgress.stars['1'] ? ' You have won this board before.' : ''}
      </p>

      {/* Turn banner — in duo mode this is the pass-and-play handoff. */}
      <section
        className="card mt-4 p-4 text-center"
        style={{ borderColor: PLAYER_COLOURS[game.turn] }}
      >
        <p className="text-lg font-bold" style={{ color: PLAYER_COLOURS[game.turn] }}>
          {winner !== null
            ? `${playerLabel(mode, winner)} wins!`
            : isBotTurn
              ? 'Cosy Bot is thinking…'
              : mode === 'duo'
                ? `${playerLabel(mode, game.turn)} — your turn`
                : 'Your turn'}
        </p>
        <p className="text-sm text-[var(--ink-dim)]">
          {winner !== null
            ? `Final value: ${playerLabel(mode, 0)} $${netWorth(game, 0)} · ${playerLabel(mode, 1)} $${netWorth(game, 1)}`
            : game.phase === 'buy' && pendingSquare
              ? `${pendingSquare.name} is for sale — buy it or pass.`
              : game.phase === 'jail'
                ? 'In Prison: pay, use a pass, or roll for doubles.'
                : game.lastDice
                  ? `Last roll: ${game.lastDice[0]} + ${game.lastDice[1]}`
                  : 'Roll the dice to begin.'}
        </p>
        {lastCard && winner === null && (
          <p className="mt-1 text-sm font-semibold">{lastCard}</p>
        )}
      </section>

      {/* Player money panels */}
      <section className="mt-4 grid grid-cols-2 gap-2">
        {game.players.map((p, i) => (
          <div
            key={p.name}
            className="card p-3"
            style={{
              borderColor: game.turn === i && winner === null ? PLAYER_COLOURS[i] : undefined,
              opacity: p.bankrupt ? 0.6 : 1,
            }}
          >
            <p className="font-bold" style={{ color: PLAYER_COLOURS[i] }}>
              {playerLabel(mode, i as PlayerIndex)}
              {p.bankrupt ? ' · out' : ''}
            </p>
            <p className="text-lg font-bold">${p.money}</p>
            <p className="text-sm text-[var(--ink-dim)]">
              On {BOARD[p.position].name}
              {p.inJail ? ' · in Prison' : ''}
              {p.getOutCards > 0 ? ` · ${p.getOutCards} pass${p.getOutCards > 1 ? 'es' : ''}` : ''}
            </p>
            <p className="text-sm text-[var(--ink-dim)]">
              {game.property.filter((pr) => pr.owner === i).length} properties · value $
              {netWorth(game, i as PlayerIndex)}
            </p>
          </div>
        ))}
      </section>

      {/* Board */}
      <section className="card mt-4 p-2 sm:p-3" aria-label="Game board">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(11, minmax(0, 1fr))',
            gap: 2,
          }}
        >
          {BOARD.map((square) => {
            const propState = game.property[square.index];
            const tokens = game.players
              .map((p, i) => ({ p, i }))
              .filter(({ p }) => p.position === square.index && !p.bankrupt);
            return (
              <div
                key={square.index}
                style={gridPos(square.index)}
                className="min-h-[44px] overflow-hidden rounded border p-1 sm:min-h-[52px]"
              >
                {(square.kind === 'property' || square.kind === 'station' || square.kind === 'utility') && (
                  <span
                    aria-hidden
                    style={{
                      display: 'block',
                      height: 4,
                      borderRadius: 2,
                      background: groupColour(square.group),
                    }}
                  />
                )}
                <span className="block truncate text-[9px] font-semibold leading-tight sm:text-[10px]">
                  {square.name}
                </span>
                {square.price && (
                  <span className="block text-[9px] text-[var(--ink-dim)]">${square.price}</span>
                )}
                {propState.houses > 0 && (
                  <span className="block text-[9px] font-bold">
                    {propState.houses === 5 ? '🏨 Hotel' : `🏠 ×${propState.houses}`}
                  </span>
                )}
                {propState.owner !== null && (
                  <span
                    className="block text-[9px] font-bold"
                    style={{ color: PLAYER_COLOURS[propState.owner] }}
                  >
                    {playerLabel(mode, propState.owner)}
                  </span>
                )}
                {tokens.length > 0 && (
                  <span className="mt-0.5 flex gap-0.5" aria-label={`${tokens.length} player token${tokens.length > 1 ? 's' : ''} here`}>
                    {tokens.map(({ i }) => (
                      <span
                        key={i}
                        aria-hidden
                        style={{
                          display: 'inline-block',
                          width: 10,
                          height: 10,
                          borderRadius: 999,
                          background: PLAYER_COLOURS[i],
                          border: '1px solid white',
                        }}
                      />
                    ))}
                  </span>
                )}
              </div>
            );
          })}
          <div
            style={{ gridRow: '2 / 11', gridColumn: '2 / 11' }}
            className="flex flex-col items-center justify-center p-2 text-center"
          >
            <Dices size={28} aria-hidden />
            <p className="mt-1 font-display text-lg font-bold">Monopoly</p>
            <p className="text-sm text-[var(--ink-dim)]">
              {game.lastDice
                ? `Dice: ${game.lastDice[0]} · ${game.lastDice[1]}`
                : 'Roll to start your stroll.'}
            </p>
            <p className="text-sm text-[var(--ink-dim)]">
              Pass Start: +$200 · Prison fine: $50
            </p>
          </div>
        </div>
      </section>

      {/* Controls */}
      {winner === null && (
        <div className="mt-4 flex flex-wrap gap-2">
          {game.phase === 'roll' && !isBotTurn && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setGame(rollTurn(game, rollDicePair(Math.random)))}
            >
              <Dices size={18} aria-hidden /> Roll dice
            </button>
          )}
          {game.phase === 'jail' && !isBotTurn && (
            <>
              <button type="button" className="btn btn-primary" onClick={() => setGame(payJailFine(game))}>
                Pay $50
              </button>
              <button
                type="button"
                className="btn"
                disabled={current.getOutCards <= 0}
                onClick={() => setGame(useJailCard(game))}
              >
                Use a pass ({current.getOutCards})
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => setGame(rollJailDice(game, rollDicePair(Math.random)))}
              >
                Roll for doubles
              </button>
            </>
          )}
          {game.phase === 'buy' && pendingSquare && !isBotTurn && (
            <>
              <button type="button" className="btn btn-primary" onClick={() => setGame(buyProperty(game))}>
                Buy {pendingSquare.name} (${pendingSquare.price})
              </button>
              <button type="button" className="btn" onClick={() => setGame(declineBuy(game))}>
                Pass
              </button>
            </>
          )}
          <button type="button" className="btn" onClick={restart}>
            <RotateCcw size={18} aria-hidden /> Start over
          </button>
          <button type="button" className="btn" onClick={() => { setMode(null); setGame(null); }}>
            <Home size={18} aria-hidden /> Change mode
          </button>
        </div>
      )}

      {/* Building (human turn, before rolling) */}
      {winner === null && !isBotTurn && game.phase === 'roll' && (
        <section className="card mt-4 p-4">
          <p className="font-semibold">Build houses</p>
          {buildable.length === 0 ? (
            <p className="mt-1 text-sm text-[var(--ink-dim)]">
              Own a full colour set to build — houses go up evenly across the set,
              and a fifth build becomes a hotel.
            </p>
          ) : (
            <div className="mt-2 flex flex-wrap gap-2">
              <label className="sr-only" htmlFor="build-square">Choose a property to build on</label>
              <select
                id="build-square"
                className="btn"
                value={buildChoice ?? ''}
                onChange={(e) => setBuildChoice(e.target.value === '' ? null : Number(e.target.value))}
              >
                <option value="">Choose a property…</option>
                {buildable.map((idx) => (
                  <option key={idx} value={idx}>
                    {BOARD[idx].name} (${BOARD[idx].houseCost})
                  </option>
                ))}
              </select>
              <button type="button" className="btn btn-primary" disabled={buildChoice === null} onClick={doBuild}>
                Build
              </button>
            </div>
          )}
          {msg && <p className="mt-2 text-sm font-semibold">{msg}</p>}
        </section>
      )}

      {/* Owned properties */}
      <section className="card mt-4 p-4">
        <p className="font-semibold">Who owns what</p>
        {game.players.map((p, i) => {
          const owned = BOARD.filter((sq) => game.property[sq.index].owner === i);
          return (
            <p key={p.name} className="mt-1 text-sm">
              <span className="font-bold" style={{ color: PLAYER_COLOURS[i] }}>
                {playerLabel(mode, i as PlayerIndex)}:
              </span>{' '}
              {owned.length === 0
                ? 'nothing yet'
                : owned
                    .map((sq) => {
                      const h = game.property[sq.index].houses;
                      return h === 5 ? `${sq.name} (hotel)` : h > 0 ? `${sq.name} (×${h})` : sq.name;
                    })
                    .join(', ')}
            </p>
          );
        })}
      </section>

      {/* Recent events */}
      <section className="card mt-4 p-4">
        <p className="font-semibold">What just happened</p>
        <ul className="mt-1 space-y-1 text-sm text-[var(--ink-dim)]">
          {[...game.log].slice(-8).reverse().map((line, i) => (
            <li key={`${game.turnCount}-${i}`}>{line}</li>
          ))}
        </ul>
      </section>

      {winner !== null && (
        <section className="card mt-4 p-5 text-center">
          <p className="font-display text-2xl font-bold">
            {playerLabel(mode, winner)} wins the board walk!
          </p>
          <p className="mt-1 text-sm text-[var(--ink-dim)]">
            {mode === 'solo' && winner === 0
              ? 'You bankrupted the bot — lovely strolling.'
              : mode === 'solo'
                ? 'The bot takes this one. No harm done — the board is ready again.'
                : 'A well-walked game. Play again whenever you like.'}
          </p>
          <div className="mt-3 flex justify-center gap-2">
            <button type="button" className="btn btn-primary" onClick={restart}>
              Play again
            </button>
            <Link href="/" className="btn">Home</Link>
          </div>
        </section>
      )}
    </main>
  );
}
