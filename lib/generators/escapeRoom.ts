/**
 * Escape Rooms generator.
 *
 * Pure functions: a seed string goes in, a room comes out. Follows the
 * Phase 1 convention (lib/generators/logicGrid.ts): FNV-1a hashSeed +
 * mulberry32, re-imported from there so the two generators share one PRNG.
 *
 * HARD RULE — every code is derivable from something visible in the room.
 * Every lock carries `sourceId` (plus `sources` when a code combines two
 * objects) and each id must be the id of an object in `room.objects`.
 * Numeric codes are >= 3 digits; pattern locks are built from the symbols
 * shown on the wall object. Nothing here asks the player to guess or to
 * brute-force: the lock's hint names its source, and the source object's
 * detail panel states (or lets the player work out) the code.
 *
 * Ladder (mirrors logic-grids tiers):
 *   Easy   L1-10   : key -> 3-digit code -> 3-symbol pattern -> door
 *   Medium L11-30  : key -> 4-digit code -> 4-symbol pattern -> painting
 *                    code (safe) -> door
 *   Hard   L31-60  : key -> combined code (note + clock) -> 5-symbol
 *                    pattern -> painting code -> second key -> door
 *   Expert L61+    : Hard's chain plus one extra lock per 10-level band
 *                    (capped at 2 extra), and a twist that rotates every
 *                    10 Expert levels: none / reversed pattern /
 *                    shifted code / reversed code. The twist is always
 *                    stated in the lock's hint, so it stays derivable.
 */
import { hashSeed, mulberry32 } from './logicGrid';

export type EscapeTierName = 'Easy' | 'Medium' | 'Hard' | 'Expert';

export interface EscapeTier {
  name: EscapeTierName;
  codeLength: number;
  patternLength: number;
  /** Extra locks beyond the Hard chain (Expert only). */
  extraLocks: number;
  twist: 'none' | 'reverse-pattern' | 'shift-code' | 'reverse-code';
}

export function escapeTierForLevel(level: number): EscapeTier {
  if (level <= 10) {
    return { name: 'Easy', codeLength: 3, patternLength: 3, extraLocks: 0, twist: 'none' };
  }
  if (level <= 30) {
    return { name: 'Medium', codeLength: 4, patternLength: 4, extraLocks: 0, twist: 'none' };
  }
  if (level <= 60) {
    return { name: 'Hard', codeLength: 4, patternLength: 5, extraLocks: 0, twist: 'none' };
  }
  const band = Math.floor((level - 61) / 10);
  const twists: EscapeTier['twist'][] = [
    'none',
    'reverse-pattern',
    'shift-code',
    'reverse-code',
  ];
  return {
    name: 'Expert',
    codeLength: 4,
    patternLength: 5 + Math.min(1, band),
    extraLocks: Math.min(2, band),
    twist: twists[band % twists.length],
  };
}

export interface RoomObject {
  id: string;
  name: string;
  /** Short label shown on the SVG room. */
  label: string;
  /** What the detail panel says when the player inspects it. */
  detail: string;
  /** Hides the key (or second key) when set. */
  hidesItem?: 'key' | 'key2';
}

export type LockKind = 'key' | 'code' | 'pattern' | 'door';

export interface RoomLock {
  id: string;
  kind: LockKind;
  label: string;
  /** Primary visible source object this lock derives from. */
  sourceId: string;
  /** All visible source objects (sourceId plus any combined source). */
  sources: string[];
  /** Plain-language derivation, also used as the gentle hint. */
  derivation: string;
  /** For code locks: the digits. Pattern locks: symbol names in order. */
  solution: string | string[];
  /** Item that must be in the inventory (key locks). */
  requiresItem?: 'key' | 'key2';
  /** Object this lock sits on (the clickable lock in the room UI). */
  onObjectId: string;
}

export interface EscapeRoom {
  seed: string;
  level: number;
  tier: EscapeTier;
  title: string;
  objects: RoomObject[];
  locks: RoomLock[];
  /** Symbol names shown on the wall, in display order. */
  wallSymbols: string[];
}

const SYMBOLS = ['Star', 'Moon', 'Leaf', 'Wave', 'Sun', 'Key', 'Heart', 'Diamond'];
const ROOM_NAMES = [
  'The Study',
  'The Library',
  'The Attic',
  'The Garden Shed',
  'The Kitchen',
  'The Old Shop',
];
const HIDE_SPOTS = [
  { id: 'vase', name: 'Vase', label: 'Vase' },
  { id: 'bookshelf', name: 'Bookshelf', label: 'Books' },
  { id: 'rug', name: 'Rug', label: 'Rug' },
  { id: 'drawer', name: 'Drawer', label: 'Drawer' },
];

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function digits(n: number, rng: () => number): string {
  let out = '';
  for (let i = 0; i < n; i++) out += String(Math.floor(rng() * 10));
  return out;
}

export function escapeLevelSeed(level: number, salt: string): string {
  return `er|${salt}|${level}`;
}

export function generateRoom(seed: string, level: number): EscapeRoom {
  const rng = mulberry32(hashSeed(seed));
  const tier = escapeTierForLevel(level);
  const title = pick(ROOM_NAMES, rng);
  const wallSymbols = shuffle(SYMBOLS, rng).slice(0, 6);
  const spots = shuffle(HIDE_SPOTS, rng);
  const keySpot = spots[0];
  const key2Spot = spots[1];

  const noteDigits = digits(tier.codeLength, rng);
  const clockHour = 1 + Math.floor(rng() * 12);
  const paintingCount = 2 + Math.floor(rng() * 7); // 2..8, shown in painting detail
  const paintingDigits = digits(3, rng);

  // Main code: Hard+ combines the note with the clock hour; Expert
  // twists are applied on top and always described in the derivation.
  let code = noteDigits;
  let codeDerivation =
    tier.name === 'Hard' || tier.name === 'Expert'
      ? `The note reads ${noteDigits} and the clock shows ${clockHour} o'clock. Put the note first, then the hour as the last digit: ${noteDigits}${clockHour}.`
      : `The note reads ${noteDigits}. That is the code, in that order.`;
  if (tier.name === 'Hard' || tier.name === 'Expert') {
    code = `${noteDigits}${clockHour}`;
  }
  if (tier.twist === 'shift-code') {
    const shifted = code
      .split('')
      .map((d) => String((Number(d) + 1) % 10))
      .join('');
    codeDerivation = `The note reads ${noteDigits} and the clock shows ${clockHour} o'clock, giving ${code} — but this room shifts every digit up by one, so enter ${shifted}.`;
    code = shifted;
  } else if (tier.twist === 'reverse-code') {
    const reversed = code.split('').reverse().join('');
    codeDerivation = `The note reads ${noteDigits} and the clock shows ${clockHour} o'clock, giving ${code} — but this room reads codes backwards, so enter ${reversed}.`;
    code = reversed;
  }

  let pattern = wallSymbols.slice(0, tier.patternLength);
  let patternDerivation = `Trace the symbols on the wall in the order they are painted, left to right: ${pattern.join(', ')}.`;
  if (tier.twist === 'reverse-pattern') {
    pattern = [...pattern].reverse();
    patternDerivation = `The wall paints them left to right, but this room traces them right to left: ${pattern.join(', ')}.`;
  }

  const objects: RoomObject[] = [
    {
      id: 'note',
      name: 'Note',
      label: 'Note',
      detail:
        tier.name === 'Easy' || tier.name === 'Medium'
          ? `A note in neat handwriting: "The safe code is ${noteDigits}."`
          : `A note in neat handwriting: "I wrote the first digits down: ${noteDigits}. The clock knows the rest."`,
    },
    {
      id: 'painting',
      name: 'Painting',
      label: 'Painting',
      detail: `A painting of ${paintingCount} apples in a bowl. Under it, in small print: "Count the apples, then read the little numbers: ${paintingDigits}." The safe code is ${paintingCount}${paintingDigits} — count first, then the printed numbers.`,
    },
    {
      id: 'clock',
      name: 'Clock',
      label: 'Clock',
      detail: `The clock has stopped at ${clockHour} o'clock. It is not broken — it is a clue.`,
    },
    {
      id: 'symbols',
      name: 'Wall symbols',
      label: 'Symbols',
      detail: `Symbols painted on the wall, left to right: ${wallSymbols.join(', ')}.`,
    },
    {
      id: 'chest',
      name: 'Chest',
      label: 'Chest',
      detail: 'A small chest with a keyhole. It opens with a key.',
    },
    {
      id: 'safe',
      name: 'Safe',
      label: 'Safe',
      detail: 'A safe with a number dial. It opens with a code.',
    },
    {
      id: 'panel',
      name: 'Wall panel',
      label: 'Panel',
      detail: 'A panel with symbol buttons. Trace the wall symbols on it.',
    },
    {
      id: 'cabinet',
      name: 'Cabinet',
      label: 'Cabinet',
      detail: 'A locked cabinet with a keyhole. It opens with a second key.',
    },
    {
      id: 'door',
      name: 'Door',
      label: 'Door',
      detail: 'The way out. It opens once every other lock in the room is open.',
    },
    ...spots.map((s) => ({
      id: s.id,
      name: s.name,
      label: s.label,
      detail:
        s.id === keySpot.id
          ? `You lift it — there is a small brass key underneath.`
          : s.id === key2Spot.id
            ? `You look behind it — there is a small silver key here.`
            : `Nothing hidden here, just ${s.name.toLowerCase()}.`,
      hidesItem: (s.id === keySpot.id ? 'key' : s.id === key2Spot.id ? 'key2' : undefined) as
        | 'key'
        | 'key2'
        | undefined,
    })),
  ];

  const locks: RoomLock[] = [
    {
      id: 'chest-key',
      kind: 'key',
      label: 'Chest lock',
      sourceId: keySpot.id,
      sources: [keySpot.id],
      derivation: `The key is hidden under the ${keySpot.name.toLowerCase()}. Inspect it, take the key, then open the chest.`,
      solution: 'key',
      requiresItem: 'key',
      onObjectId: 'chest',
    },
    {
      id: 'main-code',
      kind: 'code',
      label: 'Number code',
      sourceId: 'note',
      sources:
        tier.name === 'Easy' || tier.name === 'Medium' ? ['note'] : ['note', 'clock'],
      derivation: codeDerivation,
      solution: code,
      onObjectId: 'safe',
    },
    {
      id: 'pattern',
      kind: 'pattern',
      label: 'Pattern lock',
      sourceId: 'symbols',
      sources: ['symbols'],
      derivation: patternDerivation,
      solution: pattern,
      onObjectId: 'panel',
    },
  ];

  if (tier.name !== 'Easy') {
    locks.push({
      id: 'painting-code',
      kind: 'code',
      label: 'Painting safe code',
      sourceId: 'painting',
      sources: ['painting'],
      derivation: `Count the apples in the painting (${paintingCount}), then the little printed numbers (${paintingDigits}): ${paintingCount}${paintingDigits}.`,
      solution: `${paintingCount}${paintingDigits}`,
      onObjectId: 'safe',
    });
  }
  if (tier.name === 'Hard' || tier.name === 'Expert') {
    locks.push({
      id: 'cabinet-key',
      kind: 'key',
      label: 'Cabinet lock',
      sourceId: key2Spot.id,
      sources: [key2Spot.id],
      derivation: `A second, silver key hides behind the ${key2Spot.name.toLowerCase()}. Inspect it, take the key, then open the cabinet.`,
      solution: 'key2',
      requiresItem: 'key2',
      onObjectId: 'cabinet',
    });
  }
  if (tier.extraLocks >= 1) {
    const extraPattern = shuffle(wallSymbols, rng).slice(0, 4);
    locks.push({
      id: 'pattern-2',
      kind: 'pattern',
      label: 'Second pattern lock',
      sourceId: 'symbols',
      sources: ['symbols'],
      derivation: `A second panel, same wall. This one traces a different set, in this order: ${extraPattern.join(', ')}.`,
      solution: extraPattern,
      onObjectId: 'panel',
    });
  }
  if (tier.extraLocks >= 2) {
    const extraCode = digits(4, rng);
    locks.push({
      id: 'extra-code',
      kind: 'code',
      label: 'Extra number code',
      sourceId: 'note',
      sources: ['note'],
      derivation: `The back of the note adds one more code, written plainly: ${extraCode}.`,
      solution: extraCode,
      onObjectId: 'safe',
    });
  }
  locks.push({
    id: 'door',
    kind: 'door',
    label: 'Final door',
    sourceId: 'door',
    sources: ['door'],
    derivation: 'The door opens once every other lock in the room is open. No code of its own.',
    solution: '',
    onObjectId: 'door',
  });

  return { seed, level, tier, title, objects, locks, wallSymbols };
}

export function generateLevelRoom(level: number, salt: string): EscapeRoom {
  return generateRoom(escapeLevelSeed(level, salt), level);
}
