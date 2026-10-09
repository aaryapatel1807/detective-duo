/* Daily puzzle core — date-seeded 5×5 word search. Pure, unit-testable. */

export const SIZE = 5;
export const WORDS_PER_DAY = 5;

/** Noir-flavoured bank; every word fits a 5×5 grid. */
const BANK: string[] = [
  'CLUE',
  'NOIR',
  'CASE',
  'ALIBI',
  'FOG',
  'VAULT',
  'CHASE',
  'HEIST',
  'BADGE',
  'SMOKE',
  'THIEF',
  'PRINT',
  'GUN',
  'LAMP',
  'WHARF',
  'GRAVE',
  'MOTEL',
  'SLEET',
  'BRIBE',
  'STAKE',
];

export function wordBank(): string[] {
  return BANK.slice();
}

/** Local YYYY-MM-DD. */
export function dateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Deterministic PRNG. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface PlacedWord {
  word: string;
  /** row-major cell indices spelling the word in order */
  cells: number[];
}

export interface DailyPuzzle {
  date: string;
  size: number;
  letters: string[];
  words: PlacedWord[];
}

const DIRS: [number, number][] = [
  [0, 1],
  [0, -1],
  [1, 0],
  [-1, 0],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

/** Cells along the straight line from a to b (inclusive), or null if not straight. */
export function cellsOnLine(size: number, a: number, b: number): number[] | null {
  const ar = Math.floor(a / size);
  const ac = a % size;
  const br = Math.floor(b / size);
  const bc = b % size;
  const dr = Math.sign(br - ar);
  const dc = Math.sign(bc - ac);
  const straight = ar === br || ac === bc || Math.abs(br - ar) === Math.abs(bc - ac);
  if (!straight || (dr === 0 && dc === 0)) return null;
  const cells: number[] = [];
  let r = ar;
  let c = ac;
  for (;;) {
    cells.push(r * size + c);
    if (r === br && c === bc) break;
    r += dr;
    c += dc;
  }
  return cells;
}

function tryPlace(
  grid: (string | null)[],
  word: string,
  rng: () => number,
): { cells: number[] } | null {
  for (let attempt = 0; attempt < 300; attempt++) {
    const [dr, dc] = DIRS[Math.floor(rng() * DIRS.length)];
    const r0 = Math.floor(rng() * SIZE);
    const c0 = Math.floor(rng() * SIZE);
    const r1 = r0 + dr * (word.length - 1);
    const c1 = c0 + dc * (word.length - 1);
    if (r1 < 0 || r1 >= SIZE || c1 < 0 || c1 >= SIZE) continue;
    const cells: number[] = [];
    let ok = true;
    for (let k = 0; k < word.length; k++) {
      const idx = (r0 + dr * k) * SIZE + (c0 + dc * k);
      const existing = grid[idx];
      if (existing !== null && existing !== word[k]) {
        ok = false;
        break;
      }
      cells.push(idx);
    }
    if (ok) return { cells };
  }
  return null;
}

/** Generate the puzzle for a date string (YYYY-MM-DD). Deterministic. */
export function generateDaily(dateStr: string): DailyPuzzle {
  const rng = mulberry32(hashStr(`dd-daily:${dateStr}`));
  const pool = BANK.slice();
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const grid: (string | null)[] = new Array(SIZE * SIZE).fill(null);
  const words: PlacedWord[] = [];
  for (const word of pool) {
    if (words.length >= WORDS_PER_DAY) break;
    const placed = tryPlace(grid, word, rng);
    if (!placed) continue;
    placed.cells.forEach((idx, k) => {
      grid[idx] = word[k];
    });
    words.push({ word, cells: placed.cells });
  }
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const letters = grid.map((ch) =>
    ch === null ? alphabet[Math.floor(rng() * alphabet.length)] : ch,
  );
  return { date: dateStr, size: SIZE, letters, words };
}

/** Milliseconds until local midnight. */
export function msUntilMidnight(now: Date = new Date()): number {
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return Math.max(0, midnight.getTime() - now.getTime());
}

export function formatCountdown(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(sec)}`;
}
