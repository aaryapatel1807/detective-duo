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
  acceptTrade,
  BOARD,
  botBuildChoice,
  botJailAction,
  botShouldBuy,
  buildHouse,
  buildableSquares,
  buyProperty,
  createGame,
  declineBuy,
  declineTrade,
  groupColour,
  netWorth,
  payJailFine,
  proposeTrade,
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

/** Small 3D-style buildings for owned properties: front face, shaded
 * side face and pitched roof, so houses read as buildings, not icons.
 * Count stays exact: 1-4 houses, a taller hotel at 5. */
function HouseMark({ hotel }: { hotel: boolean }) {
  if (hotel) {
    return (
      <svg width="16" height="14" viewBox="0 0 16 14" aria-hidden>
        <polygon points="12,2 16,0 16,14 12,14" fill="#a16207" />
        <polygon points="0,4 8,0 12,2 12,4" fill="#fde047" />
        <rect x="0" y="4" width="12" height="10" fill="#facc15" />
        <rect x="2" y="6" width="3" height="3" fill="#7c2d12" />
        <rect x="7" y="6" width="3" height="3" fill="#7c2d12" />
        <rect x="2" y="10" width="3" height="3" fill="#7c2d12" />
        <rect x="7" y="10" width="3" height="3" fill="#7c2d12" />
      </svg>
    );
  }
  return (
    <svg width="14" height="12" viewBox="0 0 14 12" aria-hidden>
      <polygon points="10,2 14,0 14,12 10,12" fill="#166534" />
      <polygon points="0,4 5,0 10,2 10,4" fill="#22c55e" />
      <rect x="0" y="4" width="10" height="8" fill="#4ade80" />
      <rect x="2" y="6" width="3" height="3" fill="#14532d" />
      <rect x="6" y="8" width="2" height="4" fill="#14532d" />
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
  // Animated token positions: tokens hop square-by-square toward the
  // logical position instead of teleporting. Card jumps (forward
  // distance > 12, or into Prison) snap straight to the destination.
  const [displayPos, setDisplayPos] = useState<[number, number]>([0, 0]);
  const displayTargetRef = useRef<[number, number]>([0, 0]);
  // Dice tumble: cycling faces shown while a roll is animating. The
  // rolled values are fixed BEFORE the tumble starts, so the animation
  // can never change the outcome.
  const [rollAnim, setRollAnim] = useState<null | { faces: [number, number] }>(null);
  const [botFaces, setBotFaces] = useState<[number, number]>([3, 4]);
  const rollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Drawn-card modal + deed card (both cosmetic detail views).
  const [cardModal, setCardModal] = useState<null | { deck: 'chance' | 'chest'; text: string }>(null);
  const shownCardKeysRef = useRef<Set<string>>(new Set());
  const prevPendingBuyRef = useRef<number | null>(null);
  const [deedIndex, setDeedIndex] = useState<number | null>(null);
  // Duo trade form (duo-only; solo never shows it).
  const [tradeOfferProps, setTradeOfferProps] = useState<number[]>([]);
  const [tradeRequestProps, setTradeRequestProps] = useState<number[]>([]);
  const [tradeOfferMoney, setTradeOfferMoney] = useState('');
  const [tradeRequestMoney, setTradeRequestMoney] = useState('');
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

  // Reset animation/card/deed state whenever a fresh game starts.
  useEffect(() => {
    if (!game) return;
    displayTargetRef.current = [game.players[0].position, game.players[1].position];
    setDisplayPos([game.players[0].position, game.players[1].position]);
    setCardModal(null);
    setDeedIndex(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.turnCount === 0 && game ? game : null]);

  // Keep the animated target in step with the logical game state.
  useEffect(() => {
    if (!game) return;
    displayTargetRef.current = [game.players[0].position, game.players[1].position];
  }, [game]);

  // Step tokens toward their target, one square per tick.
  useEffect(() => {
    const id = setInterval(() => {
      setDisplayPos((prev) => {
        const t = displayTargetRef.current;
        return prev.map((cur, i) => {
          if (cur === t[i]) return cur;
          const fwd = (t[i] - cur + 40) % 40;
          return fwd >= 1 && fwd <= 12 ? (cur + 1) % 40 : t[i];
        }) as [number, number];
      });
    }, 170);
    return () => clearInterval(id);
  }, []);

  // Bot dice tumble: while Cosy Bot is about to roll, the centre dice
  // cycle faces (display only — the bot's real roll lands afterwards).
  const botTumbling =
    game !== null && mode === 'solo' && game.turn === 1 && game.phase === 'roll' && game.winner === null;
  useEffect(() => {
    if (!botTumbling) return;
    const id = setInterval(() => {
      setBotFaces([1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)]);
    }, 120);
    return () => clearInterval(id);
  }, [botTumbling]);

  // Show a drawn Chance / Neighbour Chest card as a real card the first
  // time its log line appears (get-out cards are not discarded, so their
  // deck is read from the square the drawer is standing on).
  useEffect(() => {
    if (!game) return;
    const cardLines = game.log.filter((l) => l.startsWith('Card: '));
    const lastLine = cardLines[cardLines.length - 1];
    if (!lastLine) return;
    const text = lastLine.slice('Card: '.length);
    const key = `${game.turnCount}|${text}`;
    if (shownCardKeysRef.current.has(key)) return;
    shownCardKeysRef.current.add(key);
    const discarded = [...game.chanceDiscard, ...game.chestDiscard].find((c) => c.text === text);
    if (discarded) {
      setCardModal({ deck: discarded.deck, text });
      return;
    }
    const drawer = (1 - game.turn) as 0 | 1;
    const drawerSquare = BOARD[game.players[drawer].position];
    setCardModal({ deck: drawerSquare.kind === 'chest' ? 'chest' : 'chance', text });
  }, [game]);

  // Auto-open the deed card when a property is offered for sale; closing
  // it does not reopen it until the next offer.
  useEffect(() => {
    if (!game) return;
    const pending = game.pendingBuy;
    if (pending !== null && prevPendingBuyRef.current !== pending) setDeedIndex(pending);
    prevPendingBuyRef.current = pending;
  }, [game]);

  const reducedMotion = () =>
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /** Roll with a dice tumble; the dice are fixed first, animation only. */
  const animateRoll = (apply: (dice: [number, number]) => void) => {
    if (rollAnim) return;
    const dice = rollDicePair(Math.random);
    if (reducedMotion()) {
      apply(dice);
      return;
    }
    let n = 0;
    setRollAnim({ faces: [1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)] });
    if (rollIntervalRef.current) clearInterval(rollIntervalRef.current);
    rollIntervalRef.current = setInterval(() => {
      n += 1;
      if (n >= 9) {
        if (rollIntervalRef.current) clearInterval(rollIntervalRef.current);
        rollIntervalRef.current = null;
        setRollAnim(null);
        apply(dice);
      } else {
        setRollAnim({ faces: [1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)] });
      }
    }, 100);
  };

  const handleRoll = () => {
    if (!game || game.phase !== 'roll' || (mode === 'solo' && game.turn === 1)) return;
    animateRoll((dice) => setGame(rollTurn(game, dice)));
  };

  const handleJailRoll = () => {
    if (!game || game.phase !== 'jail') return;
    animateRoll((dice) => setGame(rollJailDice(game, dice)));
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
            No real money, no timers, no auctions — decline a property
            and it simply stays for sale. Two-player games can also trade
            before rolling. First to bankrupt the other wins.
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
              { label: rollAnim ? 'Rolling…' : 'Roll dice', onClick: handleRoll, primary: true, disabled: rollAnim !== null },
              { label: 'Start over', onClick: restart },
            ]
          : game.phase === 'jail'
            ? [
                { label: 'Pay $50', onClick: () => setGame(payJailFine(game)), primary: true },
                { label: `Use a pass (${current.getOutCards})`, onClick: () => setGame(useJailCard(game)), disabled: current.getOutCards <= 0 },
                { label: rollAnim ? 'Rolling…' : 'Roll for doubles', onClick: handleJailRoll, disabled: rollAnim !== null },
              ]
            : game.phase === 'buy' && pendingSquare
              ? [
                  { label: `Buy ${pendingSquare.name} ($${pendingSquare.price})`, onClick: () => setGame(buyProperty(game)), primary: true },
                  { label: 'Pass', onClick: () => setGame(declineBuy(game)) },
                ]
              : [{ label: 'Start over', onClick: restart }];
  const botStatus =
    game.phase === 'roll'
      ? 'Cosy Bot is rolling…'
      : game.phase === 'buy'
        ? 'Cosy Bot is deciding…'
        : game.phase === 'jail'
          ? 'Cosy Bot in Prison…'
          : 'Cosy Bot is thinking…';
  const stickyStatus =
    winner !== null
      ? `${playerLabel(mode, winner)} wins!`
      : isBotTurn
        ? botStatus
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
              ? botStatus
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
              boxShadow: game.turn === i && winner === null ? `0 0 0 2px ${PLAYER_COLOURS[i]}` : undefined,
              opacity: p.bankrupt ? 0.6 : 1,
            }}
          >
            <p className="flex items-center gap-2 font-bold" style={{ color: PLAYER_COLOURS[i] }}>
              <TokenMark token={gameTokens[i]} colour={PLAYER_COLOURS[i]} size={22} />
              {playerLabel(mode, i as PlayerIndex)}
              {p.bankrupt ? ' · out' : game.turn === i && winner === null ? ' · your turn' : ''}
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
            // Tokens render at their ANIMATED position, so they hop
            // square-by-square instead of teleporting.
            const tokens = game.players
              .map((p, i) => ({ p, i }))
              .filter(({ p, i }) => displayPos[i] === square.index && !p.bankrupt);
            const isCorner =
              square.kind === 'go' ||
              square.kind === 'jail' ||
              square.kind === 'parking' ||
              square.kind === 'goto-jail';
            const flag = countryFlag(square.name);
            return (
              <div
                key={square.index}
                onClick={() => {
                  if (
                    square.kind === 'property' ||
                    square.kind === 'station' ||
                    square.kind === 'utility'
                  ) {
                    setDeedIndex(square.index);
                  }
                }}
                role={
                  square.kind === 'property' || square.kind === 'station' || square.kind === 'utility'
                    ? 'button'
                    : undefined
                }
                aria-label={
                  square.kind === 'property' || square.kind === 'station' || square.kind === 'utility'
                    ? `View deed card for ${square.name}`
                    : undefined
                }
                style={{
                  ...gridPos(square.index),
                  cursor:
                    square.kind === 'property' || square.kind === 'station' || square.kind === 'utility'
                      ? 'pointer'
                      : 'default',
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
            {/* Realistic centre city: an original photorealistic miniature
                city photograph generated fresh for this game (no copied
                artwork, no logos, no board art from any other game). */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/monopoly-city.jpg"
              alt="A miniature city in the middle of the board"
              style={{ width: '100%', maxWidth: 340, height: 'auto', display: 'block', borderRadius: 12 }}
            />
            <div className="flex items-center gap-3" aria-hidden={false}>
              <DieFace
                value={rollAnim ? rollAnim.faces[0] : botTumbling ? botFaces[0] : game.lastDice ? game.lastDice[0] : 3}
                label={
                  rollAnim
                    ? 'Dice tumbling'
                    : botTumbling
                      ? 'Cosy Bot dice tumbling'
                      : game.lastDice
                        ? `First die: ${game.lastDice[0]}`
                        : 'Die showing three'
                }
              />
              <DieFace
                value={rollAnim ? rollAnim.faces[1] : botTumbling ? botFaces[1] : game.lastDice ? game.lastDice[1] : 4}
                label={
                  rollAnim
                    ? 'Dice tumbling'
                    : botTumbling
                      ? 'Cosy Bot dice tumbling'
                      : game.lastDice
                        ? `Second die: ${game.lastDice[1]}`
                        : 'Die showing four'
                }
              />
            </div>
            <p className="text-sm" style={{ color: '#d8ccf0' }}>
              {rollAnim
                ? 'Rolling…'
                : botTumbling
                  ? 'Cosy Bot is rolling…'
                  : game.lastDice
                    ? `Dice: ${game.lastDice[0]} · ${game.lastDice[1]}`
                    : 'Roll to start your stroll.'}
            </p>
            {/* Card decks, visible on the board even when no card is showing. */}
            <div className="flex items-center gap-3" aria-label="Card decks">
              <span
                className="flex flex-col items-center justify-center rounded-md px-2 py-1 text-[10px] font-bold"
                style={{ background: 'linear-gradient(180deg, #ff6b9d, #c2185b)', color: '#fff', minWidth: 56 }}
              >
                <span aria-hidden className="text-base leading-none">?</span>
                Chance · {game.chanceDeck.length} left
              </span>
              <span
                className="flex flex-col items-center justify-center rounded-md px-2 py-1 text-[10px] font-bold"
                style={{ background: 'linear-gradient(180deg, #8b5a2b, #5d3a1a)', color: '#fff', minWidth: 56 }}
              >
                <span aria-hidden className="text-base leading-none">📦</span>
                Chest · {game.chestDeck.length} left
              </span>
            </div>
            <p className="text-sm" style={{ color: '#d8ccf0' }}>
              Pass Start: +$200 · Prison fine: $50
            </p>
          </div>
        </div>
      </section>

      {/* Deed card: tap any property, airport or utility, or land on one
          offered for sale. All figures come from BOARD — nothing invented. */}
      {deedIndex !== null && (() => {
        const sq = BOARD[deedIndex];
        const st = game.property[deedIndex];
        const owner = st.owner;
        return (
          <section className="card mt-4 p-4" aria-label={`Deed card for ${sq.name}`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold" style={{ color: groupColour(sq.group) }}>
                  {sq.group === 'station' ? 'Airport' : sq.group === 'utility' ? 'Utility' : `${sq.name.split(',')[1]?.trim() ?? ''} group`}
                </p>
                <p className="font-display text-xl font-bold">{sq.name}</p>
                <p className="text-sm text-[var(--ink-dim)]">
                  {owner === null
                    ? 'Unowned'
                    : `${playerLabel(mode, owner)} owns this${st.houses === 5 ? ' · hotel' : st.houses > 0 ? ` · ${st.houses} house${st.houses > 1 ? 's' : ''}` : ''}`}
                </p>
              </div>
              <button type="button" className="btn !px-3 !py-2 text-sm" onClick={() => setDeedIndex(null)}>
                Close
              </button>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div><dt className="text-[var(--ink-dim)]">Price</dt><dd className="font-bold">${sq.price ?? '—'}</dd></div>
              {sq.kind === 'property' && sq.rent && (
                <>
                  <div><dt className="text-[var(--ink-dim)]">Rent · no houses</dt><dd className="font-bold">${sq.rent[0]}</dd></div>
                  <div><dt className="text-[var(--ink-dim)]">Rent · 1 house</dt><dd className="font-bold">${sq.rent[1]}</dd></div>
                  <div><dt className="text-[var(--ink-dim)]">Rent · 2 houses</dt><dd className="font-bold">${sq.rent[2]}</dd></div>
                  <div><dt className="text-[var(--ink-dim)]">Rent · 3 houses</dt><dd className="font-bold">${sq.rent[3]}</dd></div>
                  <div><dt className="text-[var(--ink-dim)]">Rent · 4 houses</dt><dd className="font-bold">${sq.rent[4]}</dd></div>
                  <div><dt className="text-[var(--ink-dim)]">Rent · hotel</dt><dd className="font-bold">${sq.rent[5]}</dd></div>
                  <div><dt className="text-[var(--ink-dim)]">House / hotel cost</dt><dd className="font-bold">${sq.houseCost}</dd></div>
                </>
              )}
              {sq.kind === 'station' && (
                <div className="col-span-2"><dt className="text-[var(--ink-dim)]">Rent</dt><dd className="font-bold">$25 · $50 · $100 · $200 for 1–4 airports owned</dd></div>
              )}
              {sq.kind === 'utility' && (
                <div className="col-span-2"><dt className="text-[var(--ink-dim)]">Rent</dt><dd className="font-bold">4× the dice total with one utility · 10× with both</dd></div>
              )}
            </dl>
            <p className="mt-2 text-sm text-[var(--ink-dim)]">
              Tap another property tile to view its deed.
            </p>
          </section>
        );
      })()}

      {/* Drawn card, shown as a real card instead of only a log line. */}
      {cardModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${cardModal.deck === 'chance' ? 'Chance' : 'Neighbour Chest'} card`}
          style={{
            position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(8, 4, 20, 0.72)', padding: 16,
          }}
          onClick={() => setCardModal(null)}
        >
          <div
            className="card w-full max-w-sm p-5 text-center"
            style={{
              background: cardModal.deck === 'chance'
                ? 'linear-gradient(180deg, #3b1d4a, #241640)'
                : 'linear-gradient(180deg, #3a2a1a, #241a10)',
              borderTop: `6px solid ${cardModal.deck === 'chance' ? '#ff6b9d' : '#d9a05b'}`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-bold tracking-wide" style={{ color: cardModal.deck === 'chance' ? '#ff6b9d' : '#d9a05b' }}>
              {cardModal.deck === 'chance' ? 'CHANCE' : 'NEIGHBOUR CHEST'}
            </p>
            <p className="mt-3 text-lg font-semibold leading-snug">{cardModal.text}</p>
            <button type="button" className="btn btn-primary mt-4" onClick={() => setCardModal(null)}>
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Controls */}
      {winner === null && (
        <div className="mt-4 flex flex-wrap gap-2">
          {game.phase === 'roll' && !isBotTurn && (
            <button
              type="button"
              className="btn btn-primary"
              disabled={rollAnim !== null}
              onClick={handleRoll}
            >
              <Dices size={18} aria-hidden /> {rollAnim ? 'Rolling…' : 'Roll dice'}
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
                disabled={rollAnim !== null}
                onClick={handleJailRoll}
              >
                {rollAnim ? 'Rolling…' : 'Roll for doubles'}
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

      {/* Duo trade: propose before rolling, opponent answers on their device turn. */}
      {mode === 'duo' && winner === null && (
        <section className="card mt-4 p-4">
          {game.trade ? (
            <>
              <p className="font-semibold">Trade offer — pass the device to {playerLabel(mode, (1 - game.trade.proposer) as PlayerIndex)} to answer</p>
              <p className="mt-1 text-sm">
                {playerLabel(mode, game.trade.proposer)} offers:{' '}
                {game.trade.offerProps.length > 0
                  ? game.trade.offerProps.map((i) => BOARD[i].name).join(', ')
                  : 'nothing'}
                {game.trade.offerMoney > 0 ? ` + $${game.trade.offerMoney}` : ''}
              </p>
              <p className="mt-1 text-sm">
                Asks for:{' '}
                {game.trade.requestProps.length > 0
                  ? game.trade.requestProps.map((i) => BOARD[i].name).join(', ')
                  : 'nothing'}
                {game.trade.requestMoney > 0 ? ` + $${game.trade.requestMoney}` : ''}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" className="btn btn-primary" onClick={() => { const r = acceptTrade(game); setGame(r.state); setMsg(r.message); }}>
                  Accept trade
                </button>
                <button type="button" className="btn" onClick={() => { const r = declineTrade(game); setGame(r.state); setMsg(r.message); }}>
                  Decline
                </button>
              </div>
            </>
          ) : game.phase === 'roll' ? (
            <>
              <p className="font-semibold">Propose a trade</p>
              <p className="mt-1 text-sm text-[var(--ink-dim)]">
                Offer your properties and money for your opponent's. Accepting swaps them at once; your turn continues.
              </p>
              <p className="mt-3 text-sm font-semibold">You offer</p>
              <div className="mt-1 flex flex-wrap gap-2">
                {BOARD.filter(
                  (sq) =>
                    (sq.kind === 'property' || sq.kind === 'station' || sq.kind === 'utility') &&
                    game.property[sq.index].owner === game.turn,
                ).map((sq) => (
                  <label key={sq.index} className="btn !px-3 !py-2 text-sm" style={{ cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      className="mr-1"
                      checked={tradeOfferProps.includes(sq.index)}
                      onChange={() =>
                        setTradeOfferProps((prev) =>
                          prev.includes(sq.index) ? prev.filter((i) => i !== sq.index) : [...prev, sq.index],
                        )
                      }
                    />
                    {sq.name}
                  </label>
                ))}
                {BOARD.filter(
                  (sq) =>
                    (sq.kind === 'property' || sq.kind === 'station' || sq.kind === 'utility') &&
                    game.property[sq.index].owner === game.turn,
                ).length === 0 && <span className="text-sm text-[var(--ink-dim)]">You own nothing tradable yet.</span>}
              </div>
              <p className="mt-3 text-sm font-semibold">You ask for</p>
              <div className="mt-1 flex flex-wrap gap-2">
                {BOARD.filter(
                  (sq) =>
                    (sq.kind === 'property' || sq.kind === 'station' || sq.kind === 'utility') &&
                    game.property[sq.index].owner === (1 - game.turn),
                ).map((sq) => (
                  <label key={sq.index} className="btn !px-3 !py-2 text-sm" style={{ cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      className="mr-1"
                      checked={tradeRequestProps.includes(sq.index)}
                      onChange={() =>
                        setTradeRequestProps((prev) =>
                          prev.includes(sq.index) ? prev.filter((i) => i !== sq.index) : [...prev, sq.index],
                        )
                      }
                    />
                    {sq.name}
                  </label>
                ))}
                {BOARD.filter(
                  (sq) =>
                    (sq.kind === 'property' || sq.kind === 'station' || sq.kind === 'utility') &&
                    game.property[sq.index].owner === (1 - game.turn),
                ).length === 0 && <span className="text-sm text-[var(--ink-dim)]">Your opponent owns nothing tradable yet.</span>}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <label className="text-sm">
                  Money you offer $
                  <input
                    className="input ml-1 w-24"
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={tradeOfferMoney}
                    onChange={(e) => setTradeOfferMoney(e.target.value)}
                  />
                </label>
                <label className="text-sm">
                  Money you ask $
                  <input
                    className="input ml-1 w-24"
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={tradeRequestMoney}
                    onChange={(e) => setTradeRequestMoney(e.target.value)}
                  />
                </label>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    const r = proposeTrade(
                      game,
                      tradeOfferProps,
                      Math.max(0, Math.floor(Number(tradeOfferMoney) || 0)),
                      tradeRequestProps,
                      Math.max(0, Math.floor(Number(tradeRequestMoney) || 0)),
                    );
                    setGame(r.state);
                    setMsg(r.message);
                    if (r.ok) {
                      setTradeOfferProps([]);
                      setTradeRequestProps([]);
                      setTradeOfferMoney('');
                      setTradeRequestMoney('');
                    }
                  }}
                >
                  Propose trade
                </button>
              </div>
            </>
          ) : (
            <p className="text-sm text-[var(--ink-dim)]">
              Trades are proposed before rolling, on your own turn.
            </p>
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
