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
import dynamic from 'next/dynamic';
import { AnimatePresence, motion } from 'framer-motion';
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
import { tilePos } from './three/boardMath';
import {
  ensureAudio,
  loadMuted,
  saveMuted,
  setMutedInitial,
  sfx,
  startAmbient,
  stopAmbient,
} from './three/audio';
import type { BurstEvent } from './three/MonopolyScene';
import type { CameraMode } from './three/CameraRig';
import type { MoneyFlight } from './three/Effects';

/** The 3D scene is lazy-loaded client-only so Three.js never enters
 * the server bundle or the pages that do not use it. */
const Monopoly3D = dynamic(() => import('./three/MonopolyScene'), { ssr: false });

/** Button press feel for this page only: lift on hover, compress on
 * click, soft glow — the Sachi glass buttons, just more tactile.
 * Plus the Turn Director's tiny animations: money floats, owner
 * badge drops, tap bounce, thinking dots, and the turn banner pulse.
 * All 200–300ms except where the director's timeline says otherwise.
 * Reduced-motion skips the floats (the page does not render them). */
function MonopolyButtonStyles() {
  return (
    <style>{`main .btn { transition: transform 0.15s ease, box-shadow 0.15s ease; }
main .btn:hover { transform: translateY(-1px); box-shadow: 0 8px 18px rgba(0,0,0,0.25); }
main .btn:active { transform: scale(0.97); }
@keyframes walletPulse { 0% { box-shadow: 0 0 0 0 rgba(74,222,128,0.55); } 100% { box-shadow: 0 0 0 14px rgba(74,222,128,0); } }
main .wallet-pulse { animation: walletPulse 1.3s ease-out; }
@keyframes moneyFloatUp { 0% { opacity: 0; transform: translate(-50%, 6px) scale(0.9); } 15% { opacity: 1; transform: translate(-50%, 0) scale(1.05); } 100% { opacity: 0; transform: translate(-50%, -46px) scale(1); } }
@keyframes moneyShake { 0%, 100% { margin-left: 0; } 25% { margin-left: -3px; } 75% { margin-left: 3px; } }
main .money-float { position: absolute; top: 2px; z-index: 5; font-weight: 800; font-size: 15px; pointer-events: none; animation: moneyFloatUp 1.4s ease-out forwards; text-shadow: 0 1px 2px rgba(255,255,255,0.9); }
main .money-float.loss { animation: moneyFloatUp 1.4s ease-out forwards, moneyShake 0.3s ease-in-out 2; }
@keyframes ownerDrop { 0% { opacity: 0; transform: translateY(-8px); } 100% { opacity: 1; transform: translateY(0); } }
main .owner-drop { display: block; animation: ownerDrop 0.8s ease-out; }
@keyframes btnTap { 0% { transform: scale(1); } 30% { transform: scale(0.94); } 100% { transform: scale(1); } }
main .btn-tap { animation: btnTap 0.3s ease; }
@keyframes thinkingBlink { 0%, 100% { opacity: 0.25; } 50% { opacity: 1; } }
main .thinking-dot { animation: thinkingBlink 1.2s infinite; }
main .thinking-dot:nth-child(2) { animation-delay: 0.2s; }
main .thinking-dot:nth-child(3) { animation-delay: 0.4s; }
@keyframes bannerPulse { 0% { box-shadow: 0 0 0 0 rgba(255,107,157,0.35); } 100% { box-shadow: 0 0 0 12px rgba(255,107,157,0); } }
main .turn-banner-pulse { animation: bannerPulse 1s ease-out; }
main .mono-tile { transition: filter 0.2s ease, transform 0.15s ease; }
main .mono-tile:hover { filter: brightness(1.18); }
main .mono-tile:active { transform: scale(0.98); }`}</style>
  );
}

/** Money counter that counts smoothly to its target instead of
 * jumping — the underlying balance is always the generator's value.
 * Counts over the director's 1s money beat; reduced-motion jumps
 * straight to the value. */
function AnimatedMoney({ value }: { value: number }) {
  const [shown, setShown] = useState(value);
  const prev = useRef(value);
  useEffect(() => {
    const from = prev.current;
    const to = value;
    prev.current = value;
    if (from === to) return;
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setShown(to);
      return;
    }
    const start = performance.now();
    const duration = DIRECTOR_TIMING.moneyMs;
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(Math.round(from + (to - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span>${shown}</span>;
}

/** Floating money feedback over a wallet: red loss floats up with a
 * shake, green gain glows with sparkles. Amounts are signed and
 * reason-free, so they can never mislabel a transfer. */
function MoneyFloat({ player, amount }: { player: number; amount: number }) {
  const gain = amount > 0;
  return (
    <span
      aria-hidden
      className={gain ? 'money-float' : 'money-float loss'}
      style={{
        left: player === 0 ? '25%' : '75%',
        color: gain ? '#15803d' : '#dc2626',
        textShadow: gain ? '0 0 8px rgba(74,222,128,0.9)' : undefined,
      }}
    >
      {gain ? `✦ +$${amount} ✦` : `-$${Math.abs(amount)}`}
    </span>
  );
}

/** One momentary glass notification for a key event (rent, buy,
 * build, pass). Slides in and out; the event log below stays the
 * permanent history. */
interface GameNotification {
  key: number;
  icon: string;
  title: string;
  detail: string;
  sub: string;
}

function ThinkingDots() {
  return (
    <span aria-hidden>
      <span className="thinking-dot">.</span>
      <span className="thinking-dot">.</span>
      <span className="thinking-dot">.</span>
    </span>
  );
}

/** Victory statistics, tracked in page-level localStorage only —
 * per-device, best-effort, and never fed back into gameplay. */
interface WinStats {
  games: number;
  longestMs: number;
  luckiest: number;
  propertiesAtWin: number;
  moneyAtWin: number;
  housesBuilt: number;
  hotelsBuilt: number;
}
const STATS_KEY = 'sachi-monopoly-stats-v1';
const EMPTY_STATS: WinStats = {
  games: 0,
  longestMs: 0,
  luckiest: 0,
  propertiesAtWin: 0,
  moneyAtWin: 0,
  housesBuilt: 0,
  hotelsBuilt: 0,
};
function loadStats(): WinStats {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return EMPTY_STATS;
    const parsed = JSON.parse(raw) as Partial<WinStats>;
    return { ...EMPTY_STATS, ...parsed };
  } catch {
    return EMPTY_STATS;
  }
}
function formatDuration(ms: number): string {
  const total = Math.floor(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

const GAME_ID = 'monopoly';
const PLAYER_COLOURS = ['#2563eb', '#db2777'];

/** TURN DIRECTOR — the presentation timeline for one turn. Every
 * outcome is already decided by the generator; the director only
 * stages WHEN it is revealed, so a turn reads instead of flashing by:
 *   dice tumble 1.2s → settle 0.5s → token walks 170ms/square →
 *   camera pauses 0.5s → popup springs in (~0.7s feel) → money
 *   counts over 1s → ownership shines for 0.8s → next-turn banner
 *   pulses for 1s. A full turn lands around 7–8s instead of 2–3s.
 * The director never re-rolls, re-decides, or blocks input: reveals
 * staged behind a walk are dropped (not queued) if a faster second
 * action supersedes them, so bot chains and duo passing never stall.
 * Reduced-motion skips every stage and reveals immediately. */
const DIRECTOR_TIMING = {
  rollTumbleMs: 1200,
  settleMs: 500,
  stepMs: 170,
  cameraPauseMs: 500,
  moneyMs: 1000,
  ownershipMs: 800,
  nextTurnBeatMs: 1000,
} as const;

/** Turn Director — staged reveal types. A staged reveal is always
 * tied to the exact game state that produced it; if a newer state
 * arrives first, the staged reveal is dropped, never queued. */
interface StagedMoney {
  line: string | null;
  flight: MoneyFlight | null;
  pulsePlayer: number | null;
  floats: { player: number; amount: number }[];
  sound: 'rent' | 'coin' | null;
}
interface StagedReveal {
  game: GameState;
  card?: { deck: 'chance' | 'chest'; text: string; key: string };
  deed?: number;
  money?: StagedMoney;
}

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

/** Event-feed icon for one generator log line. The line itself is
 * shown verbatim — only the icon is derived, so nothing is invented. */
function feedIcon(line: string): string {
  if (line.includes('is out of money')) return '💔';
  if (line.startsWith('Turn cap reached')) return '🏁';
  if (line.includes('goes to Prison')) return '🔒';
  if (line.includes('leaves Prison') || line.includes('Prison pass')) return '🔓';
  if (line.startsWith('Card: ')) return '🃏';
  if (line.includes('proposes a trade')) return '🤝';
  if (line.includes('accepts the trade')) return '✅';
  if (line.includes('declines the trade')) return '❌';
  if (line.includes('passes Start')) return '💰';
  if (line.includes('passes on')) return '🤝';
  if (line.includes(' buys ')) return '🏡';
  if (line.includes(' pays $')) return '💸';
  if (line.includes('lands on')) return '📍';
  if (line.includes('is for sale')) return '🏷️';
  if (line.includes('rolls')) return '🎲';
  return '•';
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
  // 3D presentation state (cosmetic only — game state stays in `game`).
  const [view3D, setView3D] = useState(true);
  const [muted, setMuted] = useState(false);
  const [burst, setBurst] = useState<BurstEvent | null>(null);
  const [moneyFlight, setMoneyFlight] = useState<MoneyFlight | null>(null);
  const [buildFlash, setBuildFlash] = useState<{ tile: number; at: number } | null>(null);
  // Delta-pass presentation state (cosmetic only): pass-Go popup,
  // latest money-transfer line, wallet pulse on the receiver's panel,
  // and the tile a travelling token just stepped onto.
  const [passGo, setPassGo] = useState<{ key: number; player: number; amount: number } | null>(null);
  const [moneyLine, setMoneyLine] = useState<string | null>(null);
  const [walletPulse, setWalletPulse] = useState<{ player: number; key: number } | null>(null);
  const [travelHighlight, setTravelHighlight] = useState<number | null>(null);
  const [stepPuff, setStepPuff] = useState<{ key: number; tile: number } | null>(null);
  // Turn Director state (presentation only): one momentary glass
  // notification, floating money feedback, the tile just bought
  // (2D glow + 3D shine), and the camera shake trigger for important
  // moments only (doubles, jail, bankruptcy, hotel).
  const [notification, setNotification] = useState<GameNotification | null>(null);
  const [moneyFloats, setMoneyFloats] = useState<{ key: number; player: number; amount: number }[]>([]);
  const [justBoughtTile, setJustBoughtTile] = useState<number | null>(null);
  const [shakeKey, setShakeKey] = useState(0);
  // RichUp-pattern captions (presentation only, every word derived
  // from live state): the director's current step, the buy sequence,
  // and the tile a token just landed on.
  const [directorCaption, setDirectorCaption] = useState<{ text: string; key: string } | null>(null);
  const [buyCaption, setBuyCaption] = useState<{ step: 'available' | 'purchasing' | 'purchased'; text: string; key: string } | null>(null);
  const [landingTile, setLandingTile] = useState<{ tile: number; key: number } | null>(null);
  const [stats, setStats] = useState<WinStats>(EMPTY_STATS);
  const gameStartRef = useRef(Date.now());
  const luckiestRef = useRef(0);
  const housesBuiltRef = useRef(0);
  const hotelsBuiltRef = useRef(0);
  const winStatsRef = useRef(false);
  const prevHousesRef = useRef<number[] | null>(null);
  const prevOwnersRef = useRef<(0 | 1 | null)[] | null>(null);
  const prevMoneyRef = useRef<[number, number] | null>(null);
  const prevPositionsRef = useRef<[number, number] | null>(null);
  const burstKeyRef = useRef(0);
  const moneyFlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const buildFlashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevJailRef = useRef<[boolean, boolean] | null>(null);
  const prevDisplayRef = useRef<[number, number] | null>(null);
  const seenPassGoRef = useRef<Set<string>>(new Set());
  const passGoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const walletPulseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const travelTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Turn Director bookkeeping (presentation only, never gameplay):
  // a staged reveal waiting for the token to arrive + camera pause,
  // the notification dismiss timer, and seen-log keys for notifications.
  const pendingRevealRef = useRef<StagedReveal | null>(null);
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notificationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const justBoughtTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seenNotifyLogRef = useRef<Set<string>>(new Set());
  const prevDiceKeyRef = useRef<string | null>(null);
  const buyCaptionKeyRef = useRef<string | null>(null);
  const buyCaptionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasWalkingRef = useRef(false);
  const lastMoverRef = useRef(0);

  useEffect(() => {
    setProgress(loadLocalProgress());
    setSoloToken(loadToken(SOLO_TOKEN_KEY, 'heart'));
    setDuoTokens(loadDuoTokens());
    setStats(loadStats());
    const m = loadMuted();
    setMuted(m);
    setMutedInitial(m);
    // WebGL pre-check: without it, the 3D view never mounts and the
    // classic 2D board is shown instead.
    try {
      const canvas = document.createElement('canvas');
      if (!canvas.getContext('webgl') && !canvas.getContext('experimental-webgl')) {
        setView3D(false);
      }
    } catch {
      setView3D(false);
    }
  }, []);

  // Ambient garden sound starts only after the first gesture, never
  // on page load; every button tap gets a soft tap sound.
  useEffect(() => {
    const start = () => {
      ensureAudio();
      startAmbient();
    };
    const tap = (e: MouseEvent) => {
      const btn = (e.target as HTMLElement | null)?.closest?.('button');
      if (btn) {
        sfx.tap();
        // Tiny tap bounce: a 300ms press feel on top of the CSS lift.
        btn.classList.add('btn-tap');
        setTimeout(() => btn.classList.remove('btn-tap'), 300);
      }
    };
    window.addEventListener('pointerdown', start, { once: true });
    window.addEventListener('click', tap);
    return () => {
      window.removeEventListener('pointerdown', start);
      window.removeEventListener('click', tap);
    };
  }, []);

  // Persist victory statistics (page-level only, never gameplay).
  useEffect(() => {
    try {
      localStorage.setItem(STATS_KEY, JSON.stringify(stats));
    } catch {
      /* persistence is a nicety */
    }
  }, [stats]);

  // --- Turn Director helpers (presentation only) ---
  const pushNotification = (n: Omit<GameNotification, 'key'>) => {
    setNotification({ ...n, key: Date.now() });
    if (notificationTimeoutRef.current) clearTimeout(notificationTimeoutRef.current);
    notificationTimeoutRef.current = setTimeout(() => setNotification(null), 2400);
  };

  const applyMoneyPart = (part: StagedMoney) => {
    if (part.sound === 'rent') sfx.rent();
    else if (part.sound === 'coin') sfx.coin();
    if (part.line) setMoneyLine(part.line);
    if (part.flight) {
      setMoneyFlight(part.flight);
      if (moneyFlightTimeoutRef.current) clearTimeout(moneyFlightTimeoutRef.current);
      moneyFlightTimeoutRef.current = setTimeout(() => setMoneyFlight(null), 1100);
    }
    if (part.pulsePlayer !== null) {
      setWalletPulse({ player: part.pulsePlayer, key: Date.now() });
      if (walletPulseTimeoutRef.current) clearTimeout(walletPulseTimeoutRef.current);
      walletPulseTimeoutRef.current = setTimeout(() => setWalletPulse(null), 1400);
    }
    if (part.floats.length > 0 && !reducedMotion()) {
      const stamped = part.floats.map((f, i) => ({ ...f, key: Date.now() + i }));
      setMoneyFloats((prev) => [...prev, ...stamped]);
      setTimeout(() => {
        setMoneyFloats((prev) => prev.filter((f) => !stamped.some((s) => s.key === f.key)));
      }, 1500);
    }
  };

  const applyRevealPart = (part: Omit<StagedReveal, 'game'>) => {
    if (part.card) {
      shownCardKeysRef.current.add(part.card.key);
      setCardModal({ deck: part.card.deck, text: part.card.text });
    }
    if (part.deed !== undefined) setDeedIndex(part.deed);
    if (part.money) applyMoneyPart(part.money);
  };

  /** Stage a reveal behind the token's walk + camera pause, or
   * reveal it now when nothing is walking. Never blocks input. */
  const stageReveal = (g: GameState, part: Omit<StagedReveal, 'game'>, walking: boolean) => {
    if (!walking || reducedMotion()) {
      applyRevealPart(part);
      return;
    }
    const prev = pendingRevealRef.current;
    pendingRevealRef.current = { game: g, ...(prev && prev.game === g ? prev : {}), ...part };
  };

  // Flush staged reveals once the token has arrived and the camera
  // has had its pause (walk -> pause -> reveal). A staged reveal
  // superseded by a newer game state is dropped, not queued.
  useEffect(() => {
    if (!game) return;
    const pending = pendingRevealRef.current;
    if (!pending) return;
    if (pending.game !== game) {
      pendingRevealRef.current = null;
      return;
    }
    const settled =
      displayPos[0] === game.players[0].position && displayPos[1] === game.players[1].position;
    if (!settled || revealTimerRef.current) return;
    revealTimerRef.current = setTimeout(() => {
      revealTimerRef.current = null;
      const p = pendingRevealRef.current;
      pendingRevealRef.current = null;
      if (!p) return;
      const { game: _g, ...part } = p;
      applyRevealPart(part);
    }, DIRECTOR_TIMING.cameraPauseMs);
    return () => {
      if (revealTimerRef.current) {
        clearTimeout(revealTimerRef.current);
        revealTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayPos, game, mode]);

  // Watch the game state for presentation events only: buys, builds,
  // hotels, money moving, airport landings. The generator's numbers
  // are never altered here — bursts, flights and sounds just mirror
  // what already happened.
  useEffect(() => {
    if (!game) return;
    // Jail door sounds on transitions only (presentation mirrors the
    // generator's inJail flags — no rule is invented here).
    const prevJail = prevJailRef.current;
    const nowJail: [boolean, boolean] = [game.players[0].inJail, game.players[1].inJail];
    if (prevJail) {
      nowJail.forEach((jailed, i) => {
        if (jailed && !prevJail[i]) {
          sfx.lock();
          setShakeKey((k) => k + 1);
        }
        if (!jailed && prevJail[i]) sfx.unlock();
      });
    }
    prevJailRef.current = nowJail;
    // Pass-Go popup the first time each "passes Start" log line appears.
    game.log.forEach((line) => {
      const m = line.match(/^(.*) passes Start and collects \$(\d+)\.$/);
      if (!m) return;
      const key = `${game.turnCount}|${line}`;
      if (seenPassGoRef.current.has(key)) return;
      seenPassGoRef.current.add(key);
      const playerIdx = game.players.findIndex((p) => p.name === m[1]);
      sfx.coin();
      setPassGo({ key: Date.now(), player: playerIdx >= 0 ? playerIdx : 0, amount: Number(m[2]) });
      if (passGoTimeoutRef.current) clearTimeout(passGoTimeoutRef.current);
      passGoTimeoutRef.current = setTimeout(() => setPassGo(null), 2600);
    });
    // Momentary glass notifications for rent and passes, read from
    // the generator's own log lines — never invented, never relabelled.
    game.log.forEach((line) => {
      const key = `${game.turnCount}|${line}`;
      if (seenNotifyLogRef.current.has(key)) return;
      seenNotifyLogRef.current.add(key);
      const rent = line.match(/^(.+) pays \$(\d+) \((?:double )?rent for (.+)\)\.$/);
      if (rent) {
        pushNotification({
          icon: '🏠',
          title: 'Paid Rent',
          detail: `-$${rent[2]}`,
          sub: shortName(rent[3]),
        });
        return;
      }
      const pass = line.match(/^(.+) passes on (.+)\.$/);
      if (pass) {
        pushNotification({
          icon: '🤝',
          title: `${pass[1]} passed`,
          detail: '',
          sub: shortName(pass[2]),
        });
      }
    });
    const prevHouses = prevHousesRef.current;
    const prevOwners = prevOwnersRef.current;
    const prevMoney = prevMoneyRef.current;
    const prevPositions = prevPositionsRef.current;
    if (prevHouses) {
      game.property.forEach((pr, idx) => {
        if (pr.houses > prevHouses[idx]) {
          if (pr.houses === 5) {
            hotelsBuiltRef.current += 1;
            sfx.hotel();
            setShakeKey((k) => k + 1);
            pushNotification({ icon: '🏨', title: 'Hotel built', detail: '', sub: shortName(BOARD[idx].name) });
            setBurst({ key: ++burstKeyRef.current, kind: 'hotel', tile: idx, player: pr.owner ?? 0 });
          } else {
            housesBuiltRef.current += 1;
            sfx.build();
            pushNotification({ icon: '🧱', title: 'House built', detail: '', sub: shortName(BOARD[idx].name) });
            setBurst({ key: ++burstKeyRef.current, kind: 'build', tile: idx, player: pr.owner ?? 0 });
          }
          setBuildFlash({ tile: idx, at: Date.now() });
          if (buildFlashTimeoutRef.current) clearTimeout(buildFlashTimeoutRef.current);
          buildFlashTimeoutRef.current = setTimeout(() => setBuildFlash(null), 2200);
        }
      });
    }
    if (prevOwners) {
      game.property.forEach((pr, idx) => {
        if (pr.owner !== null && prevOwners[idx] === null) {
          sfx.buy();
          pushNotification({
            icon: '🏡',
            title: `${game.players[pr.owner].name} bought`,
            detail: shortName(BOARD[idx].name),
            sub: BOARD[idx].price !== undefined ? `-$${BOARD[idx].price}` : '',
          });
          setJustBoughtTile(idx);
          if (justBoughtTimeoutRef.current) clearTimeout(justBoughtTimeoutRef.current);
          justBoughtTimeoutRef.current = setTimeout(() => setJustBoughtTile(null), 1000);
          // Buy-sequence captions, steps 2–3: Purchasing… (~0.5s)
          // then the confirmation. The tile glow, owner badge, and
          // money float are the remaining steps of the same sequence.
          const buyKey = `buy-${game.turnCount}-${idx}`;
          buyCaptionKeyRef.current = buyKey;
          setBuyCaption({ step: 'purchasing', text: 'Purchasing…', key: buyKey });
          if (buyCaptionTimeoutRef.current) clearTimeout(buyCaptionTimeoutRef.current);
          buyCaptionTimeoutRef.current = setTimeout(() => {
            const buyerIsBot = mode === 'solo' && pr.owner === 1;
            setBuyCaption({
              step: 'purchased',
              text: buyerIsBot ? 'Purchased!' : `${shortName(BOARD[idx].name)} is now yours`,
              key: buyKey,
            });
            buyCaptionTimeoutRef.current = setTimeout(() => {
              setBuyCaption((prev) => (prev && prev.key === buyKey ? null : prev));
            }, 1400);
          }, 500);
          setBurst({ key: ++burstKeyRef.current, kind: 'buy', tile: idx, player: pr.owner });
        }
      });
    }
    if (prevMoney) {
      const [m0, m1] = [game.players[0].money, game.players[1].money];
      const [o0, o1] = prevMoney;
      // The director stages money feedback behind the token's walk:
      // the numbers, flight, pulse, floats, and sound all land
      // together at the reveal beat, never the instant the state lands.
      const walkingNow =
        displayPos[0] !== game.players[0].position || displayPos[1] !== game.players[1].position;
      let part: StagedMoney | null = null;
      if (m0 < o0 && m1 > o1) {
        part = {
          line: `${game.players[0].name} pays $${m1 - o1} rent to ${game.players[1].name}`,
          flight: { key: Date.now(), from: tilePos(game.players[0].position), to: tilePos(game.players[1].position) },
          pulsePlayer: 1,
          floats: [
            { player: 0, amount: -(m1 - o1) },
            { player: 1, amount: m1 - o1 },
          ],
          sound: 'rent',
        };
      } else if (m1 < o1 && m0 > o0) {
        part = {
          line: `${game.players[1].name} pays $${m0 - o0} rent to ${game.players[0].name}`,
          flight: { key: Date.now(), from: tilePos(game.players[1].position), to: tilePos(game.players[0].position) },
          pulsePlayer: 0,
          floats: [
            { player: 1, amount: -(m0 - o0) },
            { player: 0, amount: m0 - o0 },
          ],
          sound: 'rent',
        };
      } else if (m0 < o0 || m1 < o1) {
        const loser = m0 < o0 ? 0 : 1;
        const amount = loser === 0 ? o0 - m0 : o1 - m1;
        part = {
          line: `${game.players[loser].name} pays $${amount} to the bank`,
          flight: { key: Date.now(), from: tilePos(game.players[loser].position), to: [0, 0] },
          pulsePlayer: null,
          floats: [{ player: loser, amount: -amount }],
          sound: 'coin',
        };
      } else if (m0 > o0 || m1 > o1) {
        const gainer = m0 > o0 ? 0 : 1;
        const amount = gainer === 0 ? m0 - o0 : m1 - o1;
        part = {
          line: `${game.players[gainer].name} collects $${amount}`,
          flight: { key: Date.now(), from: [0, 0], to: tilePos(game.players[gainer].position) },
          pulsePlayer: gainer,
          floats: [{ player: gainer, amount }],
          sound: 'coin',
        };
      }
      if (part) stageReveal(game, { money: part }, walkingNow);
    }
    if (prevPositions) {
      game.players.forEach((p, i) => {
        if (p.position !== prevPositions[i] && BOARD[p.position].kind === 'station') sfx.airport();
      });
    }
    if (game.lastDice) {
      const total = game.lastDice[0] + game.lastDice[1];
      if (total > luckiestRef.current) luckiestRef.current = total;
      // Doubles get their own celebration: a bright chime and a
      // small camera shake — ordinary rolls get neither.
      const diceKey = `${game.turnCount}|${game.lastDice[0]}-${game.lastDice[1]}`;
      if (game.rolledDoubles && prevDiceKeyRef.current !== diceKey) {
        prevDiceKeyRef.current = diceKey;
        sfx.doubles();
        setShakeKey((k) => k + 1);
      }
    }
    prevHousesRef.current = game.property.map((pr) => pr.houses);
    prevOwnersRef.current = game.property.map((pr) => pr.owner);
    prevMoneyRef.current = [game.players[0].money, game.players[1].money];
    prevPositionsRef.current = [game.players[0].position, game.players[1].position];
  }, [game]);

  // Card flip sound when a Chance / Chest card opens.
  useEffect(() => {
    if (cardModal) sfx.card();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardModal]);

  // Bot dice rattle while Cosy Bot is about to roll. The condition is
  // computed inline here because botTumbling is declared later in
  // this component and a deps array evaluates during render.
  useEffect(() => {
    const botAboutToRoll =
      game !== null && mode === 'solo' && game.turn === 1 && game.phase === 'roll' && game.winner === null;
    if (botAboutToRoll) sfx.dice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game, mode]);

  // Victory statistics + jingle/sting, once per game.
  useEffect(() => {
    if (!game || game.winner === null || winStatsRef.current) return;
    winStatsRef.current = true;
    // Bankruptcy is an important moment: the camera feels it.
    setShakeKey((k) => k + 1);
    const w = game.winner;
    if (mode === 'duo' || w === 0) sfx.win();
    else sfx.lose();
    setStats((prev) => ({
      ...prev,
      longestMs: Math.max(prev.longestMs, Date.now() - gameStartRef.current),
      luckiest: Math.max(prev.luckiest, luckiestRef.current),
      propertiesAtWin: BOARD.filter((sq) => game.property[sq.index].owner === w).length,
      moneyAtWin: netWorth(game, w),
      housesBuilt: housesBuiltRef.current,
      hotelsBuilt: hotelsBuiltRef.current,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.winner]);

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
    // Fresh presentation counters for the new match.
    gameStartRef.current = Date.now();
    luckiestRef.current = 0;
    housesBuiltRef.current = 0;
    hotelsBuiltRef.current = 0;
    winStatsRef.current = false;
    prevHousesRef.current = null;
    prevOwnersRef.current = null;
    prevMoneyRef.current = null;
    prevPositionsRef.current = null;
    prevJailRef.current = null;
    prevDisplayRef.current = null;
    setBurst(null);
    setMoneyFlight(null);
    setBuildFlash(null);
    setPassGo(null);
    setMoneyLine(null);
    setWalletPulse(null);
    setTravelHighlight(null);
    setStepPuff(null);
    // Fresh director state for the new match.
    pendingRevealRef.current = null;
    seenNotifyLogRef.current.clear();
    prevDiceKeyRef.current = null;
    setNotification(null);
    setMoneyFloats([]);
    setJustBoughtTile(null);
    setDirectorCaption(null);
    setBuyCaption(null);
    buyCaptionKeyRef.current = null;
    setLandingTile(null);
    wasWalkingRef.current = false;
    setStats((prev) => ({ ...prev, games: prev.games + 1 }));
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

  // Step tokens toward their target, one square per tick (director
  // walking beat: 170ms per square, so a typical roll walks ~2s).
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
    }, DIRECTOR_TIMING.stepMs);
    return () => clearInterval(id);
  }, []);

  // Travel highlights: each time an animated token steps onto a new
  // square, light that tile up briefly, puff a little dust, and play
  // a soft footstep — synced to the existing 170ms stepping. Skipped
  // entirely for reduced-motion (and always mute-gated by the engine).
  useEffect(() => {
    const prev = prevDisplayRef.current;
    prevDisplayRef.current = displayPos;
    if (!prev || !game || game.turnCount === 0 || reducedMotion()) return;
    const moved = displayPos.findIndex((sq, i) => sq !== prev[i]);
    if (moved < 0) return;
    const tile = displayPos[moved];
    setTravelHighlight(tile);
    setStepPuff({ key: Date.now() + moved, tile });
    sfx.step();
    if (travelTimeoutRef.current) clearTimeout(travelTimeoutRef.current);
    travelTimeoutRef.current = setTimeout(() => setTravelHighlight(null), 220);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayPos]);

  // Director captions, steps 2–3: moving, then arrival. Arrival is
  // the landing beat: destination tile glows (3D shine + 2D glow),
  // the token's settle bounce and step dust already fired, and a
  // soft land sound plays. Only the final arrival gets the beat —
  // never every step.
  useEffect(() => {
    if (!game || mode === null || game.turnCount === 0) return;
    const settled =
      displayPos[0] === game.players[0].position && displayPos[1] === game.players[1].position;
    if (!settled) {
      wasWalkingRef.current = true;
      const mover = displayPos[0] !== game.players[0].position ? 0 : 1;
      lastMoverRef.current = mover;
      setDirectorCaption({
        text: `Moving to ${shortName(BOARD[game.players[mover].position].name)}…`,
        key: `move-${game.turnCount}-${mover}`,
      });
      return;
    }
    if (wasWalkingRef.current) {
      wasWalkingRef.current = false;
      const mover = lastMoverRef.current;
      const city = shortName(BOARD[game.players[mover].position].name);
      const actor = playerLabel(mode, mover as PlayerIndex);
      const arrivalKey = `land-${game.turnCount}-${mover}`;
      setDirectorCaption({ text: `${actor} landed on ${city}…`, key: arrivalKey });
      if (!reducedMotion()) sfx.land();
      const tile = game.players[mover].position;
      const glowKey = Date.now();
      setLandingTile({ tile, key: glowKey });
      setTimeout(() => {
        setLandingTile((prev) => (prev && prev.key === glowKey ? null : prev));
        setDirectorCaption((prev) => (prev && prev.key === arrivalKey ? null : prev));
      }, 1600);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayPos, game, mode]);

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

  // Director captions, step 1: the roll itself, named as it happens.
  useEffect(() => {
    if (rollAnim) setDirectorCaption({ text: 'Rolling Dice…', key: 'roll' });
    else if (botTumbling) setDirectorCaption({ text: 'Cosy Bot is rolling…', key: 'botroll' });
    else
      setDirectorCaption((prev) =>
        prev && (prev.key === 'roll' || prev.key === 'botroll') ? null : prev,
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rollAnim, botTumbling]);

  // Show a drawn Chance / Neighbour Chest card as a real card the first
  // time its log line appears (get-out cards are not discarded, so their
  // deck is read from the square the drawer is standing on). The card
  // is staged behind the token's walk + camera pause by the director.
  useEffect(() => {
    if (!game) return;
    const cardLines = game.log.filter((l) => l.startsWith('Card: '));
    const lastLine = cardLines[cardLines.length - 1];
    if (!lastLine) return;
    const text = lastLine.slice('Card: '.length);
    const key = `${game.turnCount}|${text}`;
    if (shownCardKeysRef.current.has(key)) return;
    const discarded = [...game.chanceDiscard, ...game.chestDiscard].find((c) => c.text === text);
    const drawer = (1 - game.turn) as 0 | 1;
    const drawerSquare = BOARD[game.players[drawer].position];
    const intent = {
      deck: (discarded ? discarded.deck : drawerSquare.kind === 'chest' ? 'chest' : 'chance') as 'chance' | 'chest',
      text,
      key,
    };
    const walking =
      displayPos[0] !== game.players[0].position || displayPos[1] !== game.players[1].position;
    stageReveal(game, { card: intent }, walking);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game]);

  // Auto-open the deed card when a property is offered for sale; closing
  // it does not reopen it until the next offer. Staged behind the
  // walk + camera pause like the card reveal.
  useEffect(() => {
    if (!game) return;
    const pending = game.pendingBuy;
    if (pending !== null && prevPendingBuyRef.current !== pending) {
      const walking =
        displayPos[0] !== game.players[0].position || displayPos[1] !== game.players[1].position;
      stageReveal(game, { deed: pending }, walking);
    }
    prevPendingBuyRef.current = pending;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game]);

  // Buy-sequence captions, step 1: the offer itself, from the real
  // pending square. Steps 2–3 (Purchasing… / Purchased!) are set by
  // the owner-change branch when the buy actually lands.
  useEffect(() => {
    if (!game) return;
    if (game.phase === 'buy' && game.pendingBuy !== null) {
      const key = `${game.turnCount}|${game.pendingBuy}`;
      if (buyCaptionKeyRef.current !== key) {
        buyCaptionKeyRef.current = key;
        setBuyCaption({
          step: 'available',
          text: `${shortName(BOARD[game.pendingBuy].name)} Available`,
          key,
        });
      }
    } else if (buyCaption?.step === 'available' && buyCaptionKeyRef.current === buyCaption.key) {
      buyCaptionKeyRef.current = null;
      setBuyCaption(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game]);

  const reducedMotion = () =>
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /** Roll with a dice tumble and a settle beat; the dice are fixed
   * first, animation only. Director: tumble 1.2s, then the final
   * faces hold for a 0.5s settle before the outcome is applied. */
  const animateRoll = (apply: (dice: [number, number]) => void) => {
    if (rollAnim) return;
    sfx.dice();
    const dice = rollDicePair(Math.random);
    if (reducedMotion()) {
      apply(dice);
      return;
    }
    let n = 0;
    const totalTicks = DIRECTOR_TIMING.rollTumbleMs / 100;
    setRollAnim({ faces: [1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)] });
    if (rollIntervalRef.current) clearInterval(rollIntervalRef.current);
    rollIntervalRef.current = setInterval(() => {
      n += 1;
      if (n >= totalTicks) {
        if (rollIntervalRef.current) clearInterval(rollIntervalRef.current);
        rollIntervalRef.current = null;
        setRollAnim({ faces: dice });
        setTimeout(() => {
          setRollAnim(null);
          apply(dice);
        }, DIRECTOR_TIMING.settleMs);
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
        <MonopolyButtonStyles />
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
  // Bot personality: the bot's 900ms pause is already inside the
  // brief's 800–1200ms thinking window, so the work here is making
  // that pause visible — and naming what it is deciding about, from
  // the real pending square, never an invented intent.
  const botStatus =
    game.phase === 'roll'
      ? 'Cosy Bot is rolling…'
      : game.phase === 'buy'
        ? `Cosy Bot is thinking about ${pendingSquare ? shortName(pendingSquare.name) : 'a property'}…`
        : game.phase === 'jail'
          ? 'Cosy Bot is thinking…'
          : 'Cosy Bot is thinking…';
  const stickyStatus =
    winner !== null
      ? `${playerLabel(mode, winner)} wins!`
      : isBotTurn
        ? botStatus
        : `${playerLabel(mode, game.turn)} · On ${current ? BOARD[current.position].name : ''}`;

  // Cinematic camera mode, derived from game state only (presentation).
  const walking =
    game !== null &&
    (displayPos[0] !== game.players[0].position || displayPos[1] !== game.players[1].position);
  const cameraMode: CameraMode =
    winner !== null
      ? 'victory'
      : rollAnim !== null || botTumbling
        ? 'dice'
        : walking
          ? 'walk'
          : game !== null && game.phase === 'buy' && game.pendingBuy !== null
            ? 'buy'
            : buildFlash !== null
              ? 'build'
              : game !== null && game.phase === 'jail'
                ? 'jail'
                : 'idle';
  const focusTile: number | null =
    game !== null && game.phase === 'buy' && game.pendingBuy !== null
      ? game.pendingBuy
      : (buildFlash?.tile ?? (game !== null && game.phase === 'jail' ? 10 : null));

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-16">
      <MonopolyButtonStyles />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <Link href="/" className="btn !px-3 !py-2 text-sm">
          <ArrowLeft size={16} aria-hidden /> Games
        </Link>
        <span className="chip">{mode === 'solo' ? 'Solo vs Cosy Bot' : 'Two players'}</span>
        <button
          type="button"
          className="btn !px-3 !py-2 text-sm"
          onClick={() => setView3D((v) => !v)}
          aria-label={view3D ? 'Switch to the classic 2D board' : 'Switch to the 3D board'}
        >
          {view3D ? '2D board' : '3D board'}
        </button>
        <button
          type="button"
          className="btn !px-3 !py-2 text-sm"
          onClick={() => {
            const next = !muted;
            setMuted(next);
            saveMuted(next);
            if (next) stopAmbient();
            else {
              ensureAudio();
              startAmbient();
            }
          }}
          aria-label={muted ? 'Unmute game sounds' : 'Mute game sounds'}
        >
          {muted ? '🔇 Sound off' : '🔊 Sound on'}
        </button>
      </div>
      <h1 className="mt-4 text-3xl font-bold">Monopoly</h1>
      <p className="mt-1 text-[var(--ink-dim)]">
        Roll, buy, collect rent, build — last player with money wins.
        {myProgress.stars['1'] ? ' You have won this board before.' : ''}
      </p>

      {/* Turn banner — in duo mode this is the pass-and-play handoff.
          The banner pulses for the director's 1s next-turn beat
          whenever the turn passes to the other player. */}
      <section
        key={game.turn}
        className="card mt-4 p-4 text-center turn-banner-pulse"
        style={{ borderColor: PLAYER_COLOURS[game.turn] }}
      >
        <p className="flex items-center justify-center gap-2 text-lg font-bold" style={{ color: PLAYER_COLOURS[game.turn] }}>
          <TokenMark token={gameTokens[winner ?? game.turn]} colour={PLAYER_COLOURS[winner ?? game.turn]} size={26} />
          {winner !== null
            ? `${playerLabel(mode, winner)} wins!`
            : isBotTurn
              ? (
                <>
                  Turn Complete — Cosy Bot is thinking
                  <ThinkingDots />
                </>
              )
              : game.phase === 'roll'
                ? mode === 'duo'
                  ? `${playerLabel(mode, game.turn)} — Roll the Dice`
                  : 'YOUR TURN — Roll the Dice'
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

      {/* Momentary glass notification — slides in and out over the
          board; the event log below stays the permanent history. */}
      <AnimatePresence>
        {notification && (
          <motion.div
            key={notification.key}
            className="card mt-4 p-3 text-center"
            initial={reducedMotion() ? { opacity: 0 } : { y: -14, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={reducedMotion() ? { opacity: 0 } : { y: -10, opacity: 0, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          >
            <p className="font-bold">
              {notification.icon} {notification.title}
              {notification.detail ? ` · ${notification.detail}` : ''}
            </p>
            {notification.sub && (
              <p className="text-sm text-[var(--ink-dim)]">{notification.sub}</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pass-Go bonus popup — motion + sound, never a silent jump. */}
      {passGo && (
        <motion.div
          key={passGo.key}
          className="card mt-4 p-3 text-center"
          style={{ borderColor: '#facc15', background: 'linear-gradient(180deg, #fef3c7, #ffffff)' }}
          initial={{ y: -14, opacity: 0, scale: 0.96 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        >
          <p className="font-bold" style={{ color: '#92400e' }}>
            Pass Start! {playerLabel(mode, passGo.player as PlayerIndex)} collects ${passGo.amount}
          </p>
        </motion.div>
      )}

      {/* Director caption: one calm line narrating the turn's
          current step — rolling, moving, landing, or the buy
          sequence. Buy captions take precedence over travel ones. */}
      <AnimatePresence mode="wait">
        {(buyCaption || directorCaption) && (
          <motion.p
            key={buyCaption ? `buy-${buyCaption.key}` : `dir-${directorCaption?.key}`}
            className="mt-3 text-center text-sm font-semibold"
            initial={reducedMotion() ? { opacity: 0 } : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            {buyCaption ? buyCaption.text : directorCaption?.text}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Player money panels — the money-float layer sits over them. */}
      <div style={{ position: 'relative' }}>
      <section className="mt-4 grid grid-cols-2 gap-2">
        {game.players.map((p, i) => (
          <div
            key={p.name}
            className={walletPulse?.player === i ? 'card wallet-pulse p-3' : 'card p-3'}
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
            <p className="text-lg font-bold"><AnimatedMoney value={p.money} /></p>
            <p className="text-sm text-[var(--ink-dim)]">
              On {BOARD[p.position].name}
              {p.inJail ? ' · in Prison' : ''}
              {p.getOutCards > 0 ? ` · ${p.getOutCards} pass${p.getOutCards > 1 ? 'es' : ''}` : ''}
            </p>
            <p className="text-sm text-[var(--ink-dim)]">
              {game.property.filter((pr) => pr.owner === i).length} properties · net worth $
              {netWorth(game, i as PlayerIndex)}
            </p>
            <p className="text-sm text-[var(--ink-dim)]">
              {game.property.filter((pr) => pr.owner === i).reduce((n, pr) => n + (pr.houses < 5 ? pr.houses : 0), 0)} houses ·{' '}
              {game.property.filter((pr) => pr.owner === i && pr.houses === 5).length} hotels
            </p>
          </div>
        ))}
      </section>
      {!reducedMotion() &&
        moneyFloats.map((f) => (
          <MoneyFloat key={f.key} player={f.player} amount={f.amount} />
        ))}
      </div>

      {/* Latest money transfer, in plain words — every money event
          gets a visible line, never just a changed number. */}
      {moneyLine && (
        <p className="mt-3 text-center text-sm font-semibold" style={{ color: '#15803d' }}>
          {moneyLine}
        </p>
      )}

      {/* 3D board — the cherry-blossom garden scene. If it cannot run
          (no WebGL, or a scene error), the classic 2D board below is
          shown instead; gameplay is identical either way. */}
      {view3D && (
        <section className="mt-4" aria-label="3D game board">
          <Monopoly3D
            game={game}
            displayPos={displayPos}
            gameTokens={gameTokens}
            rolling={rollAnim !== null || botTumbling}
            faces={game.lastDice ?? [3, 4]}
            doubles={game.rolledDoubles}
            cameraMode={cameraMode}
            focusTile={focusTile}
            followSquare={displayPos[game.turn]}
            burst={burst}
            moneyFlight={moneyFlight}
            cardOpen={cardModal !== null}
            isBotTurn={isBotTurn}
            highlightTile={travelHighlight}
            jailClosed={game.players.some((p) => p.inJail)}
            dimmed={mode === 'solo' && winner === 1}
            stepPuff={stepPuff}
            shakeKey={shakeKey}
            shineTile={justBoughtTile}
            landingTile={landingTile}
            onTileClick={(idx) => setDeedIndex(idx)}
            onError={() => {
              setView3D(false);
              setMsg('3D view is not available here — showing the classic board.');
            }}
            reducedMotion={reducedMotion()}
          />
          <p className="mt-2 text-center text-sm text-[var(--ink-dim)]">
            The camera follows the game on its own — zooming to the dice, walking
            with your token, and orbiting the board on a win.
          </p>
        </section>
      )}

      {/* Board — dark 3D board: raised tiles, isometric city centre, 3D dice. */}
      {!view3D && (
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
                className="mono-tile"
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
                    justBoughtTile === square.index
                      ? '0 0 0 3px #ffd166, 0 5px 0 #120a24, 0 8px 12px rgba(0,0,0,0.45)'
                      : landingTile?.tile === square.index
                        ? '0 0 0 3px #ff8fb3, 0 5px 0 #120a24, 0 8px 12px rgba(0,0,0,0.45)'
                        : '0 5px 0 #120a24, 0 8px 12px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.28)',
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
                    className="owner-drop block truncate text-[9px] font-bold"
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
      </section>)}

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
          <motion.div
            className="card w-full max-w-sm p-5 text-center"
            style={{
              transformPerspective: 900,
              background: cardModal.deck === 'chance'
                ? 'linear-gradient(180deg, #3b1d4a, #241640)'
                : 'linear-gradient(180deg, #3a2a1a, #241a10)',
              borderTop: `6px solid ${cardModal.deck === 'chance' ? '#ff6b9d' : '#d9a05b'}`,
            }}
            initial={{ rotateY: -75, y: 44, opacity: 0 }}
            animate={{ rotateY: 0, y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-bold tracking-wide" style={{ color: cardModal.deck === 'chance' ? '#ff6b9d' : '#d9a05b' }}>
              {cardModal.deck === 'chance' ? 'CHANCE' : 'NEIGHBOUR CHEST'}
            </p>
            <p className="mt-3 text-lg font-semibold leading-snug">{cardModal.text}</p>
            <button type="button" className="btn btn-primary mt-4" onClick={() => setCardModal(null)}>
              Continue
            </button>
          </motion.div>
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

      {/* Event feed — one persistent, compact timeline built from
          the generator's own log, with an icon per event. This is
          the only log shown; the momentary notifications above are
          just its loudest moments. */}
      <section className="card mt-4 p-4">
        <p className="font-semibold">Event feed</p>
        <ul className="mt-1 space-y-1 text-sm text-[var(--ink-dim)]">
          {[...game.log].slice(-8).reverse().map((line, i) => (
            <li key={`${game.turnCount}-${i}`} className="flex items-start gap-2">
              <span aria-hidden>{feedIcon(line)}</span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </section>

      {winner !== null && (
        <section
          className="card mt-4 p-5 text-center"
          style={
            mode === 'solo' && winner === 1
              ? { background: 'linear-gradient(180deg, #1e1b3a, #0f0a24)', borderColor: '#312e81' }
              : undefined
          }
        >
          {(() => {
            const w = winner as PlayerIndex;
            const loser = (1 - w) as PlayerIndex;
            const loserLabel = playerLabel(mode, loser);
            const winnerLabel = playerLabel(mode, w);
            const turnCapped = game.log.some((l) => l.startsWith('Turn cap reached'));
            const reason = turnCapped
              ? `Turn limit reached — ${winnerLabel} led on value.`
              : game.players[loser].bankrupt
                ? `${loserLabel} ran out of money.`
                : `${loserLabel} was beaten on the board.`;
            const isDefeat = mode === 'solo' && winner === 1;
            return (
              <>
                <p className="font-display text-2xl font-bold">
                  {isDefeat ? 'The board goes quiet…' : `${winnerLabel} wins the board walk!`}
                </p>
                <p className="mt-1 text-sm text-[var(--ink-dim)]">
                  {isDefeat
                    ? 'Cosy Bot takes this one. No harm done — the board is ready again.'
                    : mode === 'solo'
                      ? 'You bankrupted the bot — lovely strolling.'
                      : 'A well-walked game. Play again whenever you like.'}
                </p>
                <p className="mt-2 text-sm font-semibold">
                  {isDefeat ? `Defeat — ${reason}` : `Reason: ${reason}`}
                </p>
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  <button type="button" className="btn btn-primary" onClick={restart}>
                    Play again
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => { setMode(null); setGame(null); setPendingMode(null); }}
                  >
                    Change mode
                  </button>
                  <Link href="/" className="btn">Home</Link>
                </div>
              </>
            );
          })()}
          {/* Victory statistics — best-effort, per-device, from this
              match plus past matches on this device. */}
          <dl className="mx-auto mt-4 grid max-w-md grid-cols-2 gap-2 text-left text-sm">
            <div><dt className="text-[var(--ink-dim)]">Games played</dt><dd className="font-bold">{Math.max(stats.games, 1)}</dd></div>
            <div><dt className="text-[var(--ink-dim)]">Longest match</dt><dd className="font-bold">{formatDuration(Math.max(stats.longestMs, Date.now() - gameStartRef.current))}</dd></div>
            <div><dt className="text-[var(--ink-dim)]">Luckiest roll</dt><dd className="font-bold">{Math.max(stats.luckiest, luckiestRef.current) || '—'}</dd></div>
            <div><dt className="text-[var(--ink-dim)]">Properties at win</dt><dd className="font-bold">{BOARD.filter((sq) => game.property[sq.index].owner === winner).length}</dd></div>
            <div><dt className="text-[var(--ink-dim)]">Money at win</dt><dd className="font-bold">${netWorth(game, winner)}</dd></div>
            <div><dt className="text-[var(--ink-dim)]">Houses built</dt><dd className="font-bold">{Math.max(stats.housesBuilt, housesBuiltRef.current)}</dd></div>
            <div><dt className="text-[var(--ink-dim)]">Hotels built</dt><dd className="font-bold">{Math.max(stats.hotelsBuilt, hotelsBuiltRef.current)}</dd></div>
          </dl>
        </section>
      )}
      <StickyActionBar status={stickyStatus} actions={stickyActions} />
    </main>
  );
}
