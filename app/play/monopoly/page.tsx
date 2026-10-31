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
import StickyActionBar from '@/components/StickyActionBar';
import {
  botTokenFor,
  isValidToken,
  MONOPOLY_TOKENS,
  tokenGlyph,
} from '@/lib/generators/monopolyTokens';

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

/** Display name: strip ", Country" from property names; corners have no comma. */
function shortName(name: string): string {
  return name.split(',')[0] ?? name;
}

const COUNTRY_FLAGS: Record<string, string> = {
  Portugal: '🇵🇹',
  Spain: '🇪🇸',
  France: '🇫🇷',
  Germany: '🇩🇪',
  Italy: '🇮🇹',
  Japan: '🇯🇵',
  'United Kingdom': '🇬🇧',
  'United States': '🇺🇸',
};

function countryFlag(name: string): string {
  const country = name.split(',')[1]?.trim();
  return (country && COUNTRY_FLAGS[country]) || '';
}

/** One white 3D die face, pips placed on a 3x3 grid. */
function DieFace({ value, label }: { value: number; label: string }) {
  const pips: Record<number, number[]> = {
    1: [4],
    2: [0, 8],
    3: [0, 4, 8],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8],
  };
  const on = new Set(pips[value] ?? [4]);
  return (
    <span
      role="img"
      aria-label={label}
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gridTemplateRows: 'repeat(3, 1fr)',
        width: 46,
        height: 46,
        padding: 7,
        borderRadius: 11,
        background: 'linear-gradient(145deg, #ffffff, #d9d9e8)',
        boxShadow: '0 6px 0 #a8a8c0, 0 12px 16px rgba(0,0,0,0.55)',
      }}
    >
      {Array.from({ length: 9 }, (_, i) => (
        <span
          key={i}
          aria-hidden
          style={{
            width: 8,
            height: 8,
            margin: 'auto',
            borderRadius: 999,
            background: on.has(i) ? '#1a1a2e' : 'transparent',
          }}
        />
      ))}
    </span>
  );
}

/** Tiny drawn house / hotel shapes for owned properties (no emoji art). */
function HouseMark({ hotel }: { hotel: boolean }) {
  if (hotel) {
    return (
      <svg width="16" height="12" viewBox="0 0 16 12" aria-hidden>
        <rect x="2" y="2" width="12" height="10" rx="1" fill="#facc15" />
        <rect x="4" y="4" width="3" height="3" fill="#7c2d12" />
        <rect x="9" y="4" width="3" height="3" fill="#7c2d12" />
        <rect x="4" y="8" width="3" height="3" fill="#7c2d12" />
        <rect x="9" y="8" width="3" height="3" fill="#7c2d12" />
      </svg>
    );
  }
  return (
    <svg width="11" height="10" viewBox="0 0 11 10" aria-hidden>
      <polygon points="5.5,0 11,5 0,5" fill="#4ade80" />
      <rect x="2" y="5" width="7" height="5" fill="#bbf7d0" />
    </svg>
  );
}

/**
 * Original isometric-style miniature city, drawn in SVG (oblique projection:
 * front face with a window grid, shaded side and top faces, pitched roofs).
 * No image files, no art copied from any other game.
 */
function CitySkyline() {
  const buildings = [
    { x: 10, y: 88, w: 52, h: 102, color: '#7fb3d5', roof: 'flat' as const },
    { x: 70, y: 62, w: 58, h: 128, color: '#f2a0b5', roof: 'pitched' as const },
    { x: 136, y: 104, w: 48, h: 86, color: '#f2c94c', roof: 'flat' as const },
    { x: 192, y: 74, w: 54, h: 116, color: '#f28482', roof: 'pitched' as const },
    { x: 254, y: 96, w: 56, h: 94, color: '#b8a9e8', roof: 'flat' as const },
  ];
  const shade = (hex: string, f: number) => {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.min(255, Math.round(((n >> 16) & 255) * f));
    const g = Math.min(255, Math.round(((n >> 8) & 255) * f));
    const b = Math.min(255, Math.round((n & 255) * f));
    return `rgb(${r},${g},${b})`;
  };
  return (
    <svg
      viewBox="0 0 360 240"
      role="img"
      aria-label="A miniature city in the middle of the board"
      style={{ width: '100%', maxWidth: 340, height: 'auto', display: 'block' }}
    >
      {/* Ground, roads and park */}
      <rect x="0" y="190" width="360" height="50" fill="#1a2440" />
      <rect x="0" y="212" width="360" height="12" fill="#0b0820" />
      <line x1="0" y1="218" x2="360" y2="218" stroke="#e8e0ff" strokeWidth="1.5" strokeDasharray="8 8" opacity="0.6" />
      <rect x="246" y="192" width="96" height="18" rx="4" fill="#2f9e5f" />
      {/* Trees */}
      {[
        [262, 200],
        [288, 203],
        [318, 199],
        [24, 222],
      ].map(([cx, cy], i) => (
        <g key={i}>
          <rect x={cx - 1.5} y={cy} width="3" height="8" fill="#7c4a21" />
          <circle cx={cx} cy={cy - 2} r="8" fill="#2f9e5f" />
          <circle cx={cx - 3} cy={cy - 5} r="4" fill="#57c984" />
        </g>
      ))}
      {buildings.map((b, bi) => {
        const rows = Math.max(1, Math.floor(b.h / 20));
        const cols = Math.max(2, Math.floor(b.w / 16));
        return (
          <g key={bi}>
            {/* Side and top faces give the 3D depth */}
            <polygon
              points={`${b.x + b.w},${b.y} ${b.x + b.w + 12},${b.y - 12} ${b.x + b.w + 12},${b.y + b.h - 12} ${b.x + b.w},${b.y + b.h}`}
              fill={shade(b.color, 0.62)}
            />
            <polygon
              points={`${b.x},${b.y} ${b.x + 12},${b.y - 12} ${b.x + b.w + 12},${b.y - 12} ${b.x + b.w},${b.y}`}
              fill={shade(b.color, 1.25)}
            />
            {b.roof === 'pitched' ? (
              <polygon
                points={`${b.x - 2},${b.y} ${b.x + b.w / 2},${b.y - 18} ${b.x + b.w + 2},${b.y}`}
                fill={shade(b.color, 0.8)}
              />
            ) : (
              <rect x={b.x + 2} y={b.y - 4} width={b.w - 4} height="4" fill={shade(b.color, 0.8)} />
            )}
            <rect x={b.x} y={b.y} width={b.w} height={b.h} fill={b.color} />
            {Array.from({ length: rows }, (_, r) =>
              Array.from({ length: cols }, (_, c) => (
                <rect
                  key={`${r}-${c}`}
                  x={b.x + 5 + c * 16}
                  y={b.y + 8 + r * 20}
                  width="7"
                  height="9"
                  fill={(r + c) % 3 === 0 ? '#ffe9a8' : '#dbeafe'}
                  opacity="0.9"
                />
              )),
            )}
          </g>
        );
      })}
      {/* Foreground cottages with pitched roofs */}
      {[
        { x: 30, color: '#90be6d' },
        { x: 292, color: '#f9c74f' },
      ].map((c, i) => (
        <g key={i}>
          <rect x={c.x} y="168" width="38" height="26" fill={c.color} />
          <polygon points={`${c.x - 3},168 ${c.x + 19},150 ${c.x + 41},168`} fill={shade(c.color, 0.75)} />
          <rect x={c.x + 14} y="178" width="10" height="16" fill="#5b3a1e" />
          <rect x={c.x + 4} y="172" width="7" height="7" fill="#dbeafe" />
        </g>
      ))}
    </svg>
  );
}

/** A player token: the chosen shape glyph on the player's colour disc. */
function TokenMark({ token, colour, size = 18 }: { token: string; colour: string; size?: number }) {
  return (
    <span
      aria-hidden
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: 999,
        background: colour,
        border: '1px solid rgba(255,255,255,0.7)',
        boxShadow: '0 2px 3px rgba(0,0,0,0.5), inset -1px -2px 3px rgba(0,0,0,0.35)',
        fontSize: Math.max(10, size - 7),
        lineHeight: 1,
      }}
    >
      {tokenGlyph(token)}
    </span>
  );
}

const SOLO_TOKEN_KEY = 'sachi-monopoly-token-solo';
const DUO_TOKENS_KEY = 'sachi-monopoly-tokens-duo';

function loadToken(key: string, fallback: string): string {
  try {
    const raw = localStorage.getItem(key);
    return raw && isValidToken(raw) ? raw : fallback;
  } catch {
    return fallback;
  }
}

function loadDuoTokens(): [string, string] {
  try {
    const raw = localStorage.getItem(DUO_TOKENS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed) && isValidToken(parsed[0]) && isValidToken(parsed[1]) && parsed[0] !== parsed[1]) {
        return [parsed[0], parsed[1]];
      }
    }
  } catch {
    /* fall through */
  }
  return ['heart', 'star'];
}

export default function MonopolyPage() {
  const { userId } = useTheme();
  const [progress, setProgress] = useState<ProgressMap>({});
  const [mode, setMode] = useState<Mode | null>(null);
  const [game, setGame] = useState<GameState | null>(null);
  const [buildChoice, setBuildChoice] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  // Token picks: chosen on the mode screen, persisted per mode, and
  // frozen into gameTokens when a game starts (cosmetic only).
  const [pendingMode, setPendingMode] = useState<Mode | null>(null);
  const [soloToken, setSoloToken] = useState('heart');
  const [duoTokens, setDuoTokens] = useState<[string, string]>(['heart', 'star']);
  const [duoPickStep, setDuoPickStep] = useState<0 | 1>(0);
  const [gameTokens, setGameTokens] = useState<[string, string]>(['heart', 'star']);
  const recordedRef = useRef(false);
  const botBuiltRef = useRef('');

  useEffect(() => {
    setProgress(loadLocalProgress());
    setSoloToken(loadToken(SOLO_TOKEN_KEY, 'heart'));
    setDuoTokens(loadDuoTokens());
  }, []);

  const beginGame = (m: Mode) => {
    const tokens: [string, string] =
      m === 'solo' ? [soloToken, botTokenFor(soloToken)] : duoTokens;
    setGameTokens(tokens);
    try {
      if (m === 'solo') localStorage.setItem(SOLO_TOKEN_KEY, tokens[0]);
      else localStorage.setItem(DUO_TOKENS_KEY, JSON.stringify(tokens));
    } catch {
      /* persistence is a nicety, never a blocker */
    }
    setPendingMode(null);
    startGame(m);
  };

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
            <button type="button" className="btn btn-primary" onClick={() => { setPendingMode('solo'); }}>
              Solo vs Cosy Bot
            </button>
            <button type="button" className="btn" onClick={() => { setPendingMode('duo'); setDuoPickStep(0); }}>
              Two players, one device
            </button>
          </div>
          {pendingMode === 'solo' && (
            <div className="mt-4">
              <p className="font-semibold">Pick your token</p>
              <p className="mt-1 text-sm text-[var(--ink-dim)]">
                Cosy Bot takes a different one automatically.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {MONOPOLY_TOKENS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`btn min-h-[48px] !px-3 ${soloToken === t.id ? 'btn-primary' : ''}`}
                    aria-pressed={soloToken === t.id}
                    aria-label={`${t.label} token`}
                    onClick={() => setSoloToken(t.id)}
                  >
                    <span aria-hidden className="text-xl">{t.glyph}</span>
                    <span className="ml-1 text-sm">{t.label}</span>
                  </button>
                ))}
              </div>
              <p className="mt-2 flex items-center gap-2 text-sm">
                You: <TokenMark token={soloToken} colour={PLAYER_COLOURS[0]} size={24} />
                <span className="text-[var(--ink-dim)]">Cosy Bot:</span>
                <TokenMark token={botTokenFor(soloToken)} colour={PLAYER_COLOURS[1]} size={24} />
              </p>
              <button type="button" className="btn btn-primary mt-3" onClick={() => beginGame('solo')}>
                Start solo game
              </button>
            </div>
          )}
          {pendingMode === 'duo' && (
            <div className="mt-4">
              <p className="font-semibold">
                {duoPickStep === 0 ? 'Player 1, pick your token' : 'Player 2, pick your token'}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {MONOPOLY_TOKENS.filter((t) => duoPickStep === 0 || t.id !== duoTokens[0]).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`btn min-h-[48px] !px-3 ${duoTokens[duoPickStep] === t.id ? 'btn-primary' : ''}`}
                    aria-pressed={duoTokens[duoPickStep] === t.id}
                    aria-label={`${t.label} token`}
                    onClick={() =>
                      setDuoTokens((prev) => {
                        const next: [string, string] = [...prev] as [string, string];
                        next[duoPickStep] = t.id;
                        if (next[0] === next[1]) next[1] = botTokenFor(next[0]);
                        return next;
                      })
                    }
                  >
                    <span aria-hidden className="text-xl">{t.glyph}</span>
                    <span className="ml-1 text-sm">{t.label}</span>
                  </button>
                ))}
              </div>
              <p className="mt-2 flex items-center gap-2 text-sm">
                Player 1: <TokenMark token={duoTokens[0]} colour={PLAYER_COLOURS[0]} size={24} />
                <span className="text-[var(--ink-dim)]">Player 2:</span>
                <TokenMark token={duoTokens[1]} colour={PLAYER_COLOURS[1]} size={24} />
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {duoPickStep === 0 ? (
                  <button type="button" className="btn btn-primary" onClick={() => setDuoPickStep(1)}>
                    Player 2 picks next
                  </button>
                ) : (
                  <>
                    <button type="button" className="btn" onClick={() => setDuoPickStep(0)}>
                      Back to Player 1
                    </button>
                    <button type="button" className="btn btn-primary" onClick={() => beginGame('duo')}>
                      Start two-player game
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
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

  // Sticky bar actions: the SAME handlers as the in-page controls, with
  // the same legality, so the bar can never offer an illegal move.
  const stickyActions =
    winner !== null
      ? [{ label: 'Start over', onClick: restart, primary: true }]
      : isBotTurn
        ? [{ label: 'Cosy Bot is thinking…', onClick: () => {}, disabled: true }]
        : game.phase === 'roll'
          ? [
              { label: 'Roll dice', onClick: () => setGame(rollTurn(game, rollDicePair(Math.random))), primary: true },
              { label: 'Start over', onClick: restart },
            ]
          : game.phase === 'jail'
            ? [
                { label: 'Pay $50', onClick: () => setGame(payJailFine(game)), primary: true },
                { label: `Use a pass (${current.getOutCards})`, onClick: () => setGame(useJailCard(game)), disabled: current.getOutCards <= 0 },
                { label: 'Roll for doubles', onClick: () => setGame(rollJailDice(game, rollDicePair(Math.random))) },
              ]
            : game.phase === 'buy' && pendingSquare
              ? [
                  { label: `Buy ${pendingSquare.name} ($${pendingSquare.price})`, onClick: () => setGame(buyProperty(game)), primary: true },
                  { label: 'Pass', onClick: () => setGame(declineBuy(game)) },
                ]
              : [{ label: 'Start over', onClick: restart }];
  const stickyStatus =
    winner !== null
      ? `${playerLabel(mode, winner)} wins!`
      : isBotTurn
        ? 'Cosy Bot is thinking…'
        : `${playerLabel(mode, game.turn)} · On ${current ? BOARD[current.position].name : ''}`;

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
        <p className="flex items-center justify-center gap-2 text-lg font-bold" style={{ color: PLAYER_COLOURS[game.turn] }}>
          <TokenMark token={gameTokens[winner ?? game.turn]} colour={PLAYER_COLOURS[winner ?? game.turn]} size={26} />
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
            <p className="flex items-center gap-2 font-bold" style={{ color: PLAYER_COLOURS[i] }}>
              <TokenMark token={gameTokens[i]} colour={PLAYER_COLOURS[i]} size={22} />
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

      {/* Board — dark 3D board: raised tiles, isometric city centre, 3D dice. */}
      <section
        className="mt-4 p-2 sm:p-3"
        aria-label="Game board"
        style={{
          background: 'linear-gradient(160deg, #241640, #14102a)',
          borderRadius: 18,
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 24px 48px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.15)',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(11, minmax(0, 1fr))',
            gap: 3,
          }}
        >
          {BOARD.map((square) => {
            const propState = game.property[square.index];
            const tokens = game.players
              .map((p, i) => ({ p, i }))
              .filter(({ p }) => p.position === square.index && !p.bankrupt);
            const isCorner =
              square.kind === 'go' ||
              square.kind === 'jail' ||
              square.kind === 'parking' ||
              square.kind === 'goto-jail';
            const flag = countryFlag(square.name);
            return (
              <div
                key={square.index}
                style={{
                  ...gridPos(square.index),
                  background: 'linear-gradient(180deg, #3a2566, #2a1b4a)',
                  borderRadius: 10,
                  border:
                    propState.owner !== null
                      ? `2px solid ${PLAYER_COLOURS[propState.owner]}`
                      : '1px solid rgba(255,255,255,0.10)',
                  boxShadow:
                    '0 5px 0 #120a24, 0 8px 12px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.28)',
                  color: '#fff',
                  padding: 3,
                  minHeight: 52,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {(square.kind === 'property' || square.kind === 'station' || square.kind === 'utility') && (
                  <span
                    aria-hidden
                    style={{
                      display: 'block',
                      height: 5,
                      borderRadius: 3,
                      background: groupColour(square.group),
                    }}
                  />
                )}
                {square.kind === 'chance' && (
                  <span aria-hidden className="block text-center text-base font-black leading-tight" style={{ color: '#ff6b9d' }}>
                    ?
                  </span>
                )}
                {square.kind === 'chest' && (
                  <span aria-hidden className="block text-center text-sm leading-tight">
                    📦
                  </span>
                )}
                {square.kind === 'station' && (
                  <span aria-hidden className="block text-center text-sm leading-tight">
                    ✈
                  </span>
                )}
                {square.kind === 'utility' && (
                  <span aria-hidden className="block text-center text-sm leading-tight">
                    {square.name.includes('Lantern') ? '🏮' : '💧'}
                  </span>
                )}
                <span
                  className="block text-[8px] font-semibold leading-tight text-white sm:text-[10px]"
                  style={{
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    wordBreak: 'break-word',
                  }}
                >
                  {isCorner ? square.name : shortName(square.name)}
                </span>
                {square.price || square.tax ? (
                  <span
                    className="flex items-center justify-between text-[9px]"
                    style={{ color: '#d8ccf0' }}
                  >
                    <span>${square.price ?? square.tax}</span>
                    {flag && (
                      <span aria-hidden className="text-[13px] leading-tight">
                        {flag}
                      </span>
                    )}
                  </span>
                ) : null}
                {propState.houses > 0 && (
                  <span className="mt-0.5 flex items-center gap-0.5" aria-label={propState.houses === 5 ? 'Hotel' : `${propState.houses} house${propState.houses > 1 ? 's' : ''}`}>
                    {propState.houses === 5 ? (
                      <HouseMark hotel />
                    ) : (
                      Array.from({ length: propState.houses }, (_, h) => <HouseMark key={h} hotel={false} />)
                    )}
                  </span>
                )}
                {propState.owner !== null && (
                  <span
                    className="block truncate text-[9px] font-bold"
                    style={{ color: PLAYER_COLOURS[propState.owner] }}
                  >
                    {playerLabel(mode, propState.owner)}
                  </span>
                )}
                {tokens.length > 0 && (
                  <span className="mt-auto flex" aria-label={`${tokens.length} player token${tokens.length > 1 ? 's' : ''} here`}>
                    {tokens.map(({ i }, ti) => (
                      <span key={i} aria-hidden style={{ marginLeft: ti > 0 ? -6 : 0, display: 'inline-flex' }}>
                        <TokenMark token={gameTokens[i]} colour={PLAYER_COLOURS[i]} size={18} />
                      </span>
                    ))}
                  </span>
                )}
              </div>
            );
          })}
          <div
            style={{
              gridRow: '2 / 11',
              gridColumn: '2 / 11',
              background: 'radial-gradient(circle at 50% 35%, #2e1d55, #180f30)',
              borderRadius: 14,
              overflow: 'hidden',
              minHeight: 0,
            }}
            className="flex flex-col items-center justify-center gap-2 p-2 text-center"
          >
            <p className="font-display text-lg font-bold text-white sm:text-xl">Monopoly</p>
            <CitySkyline />
            <div className="flex items-center gap-3" aria-hidden={false}>
              <DieFace value={game.lastDice ? game.lastDice[0] : 3} label={game.lastDice ? `First die: ${game.lastDice[0]}` : 'Die showing three'} />
              <DieFace value={game.lastDice ? game.lastDice[1] : 4} label={game.lastDice ? `Second die: ${game.lastDice[1]}` : 'Die showing four'} />
            </div>
            <p className="text-sm" style={{ color: '#d8ccf0' }}>
              {game.lastDice
                ? `Dice: ${game.lastDice[0]} · ${game.lastDice[1]}`
                : 'Roll to start your stroll.'}
            </p>
            <p className="text-sm" style={{ color: '#d8ccf0' }}>
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
          <button type="button" className="btn" onClick={() => { setMode(null); setGame(null); setPendingMode(null); }}>
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
      <StickyActionBar status={stickyStatus} actions={stickyActions} />
    </main>
  );
}
