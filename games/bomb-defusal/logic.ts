/* Bomb Defusal — pure rules. Seeded bomb generation, the Expert's manual
 * rules, and correctness checks. No React, fully unit-testable. */

export const BOMB_TIME_MS = 5 * 60 * 1000;
export const MAX_STRIKES = 3;

/* ---------- seeded RNG ---------- */

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

/* ---------- wires ---------- */

export const WIRE_COLORS = ['R', 'Y', 'B', 'W', 'K'] as const;
export type WireColor = (typeof WIRE_COLORS)[number];
export const WIRE_NAMES: Record<WireColor, string> = {
  R: 'red',
  Y: 'yellow',
  B: 'blue',
  W: 'white',
  K: 'black',
};

/**
 * Which wire to cut (0-based index). The Expert's manual lists these rules
 * top-to-bottom; the first matching rule applies.
 */
export function wireToCut(wires: WireColor[]): number {
  const count = (c: WireColor) => wires.filter((w) => w === c).length;
  const firstIndex = (c: WireColor) => wires.indexOf(c);
  if (count('R') === 0) return 1; // no red wires: cut the 2nd wire
  if (wires[wires.length - 1] === 'Y') return firstIndex('R'); // last is yellow: cut first red
  if (count('B') === 1) return 0; // exactly one blue: cut the 1st wire
  if (count('Y') > count('R')) return wires.length - 1; // more yellow than red: cut the last wire
  return 1; // otherwise: cut the 2nd wire
}

/* ---------- keypad ---------- */

/** The 8 symbols of the Expert's manual, in master order. */
export const KEYPAD_SYMBOLS = ['Ω', 'Ψ', 'Δ', '☰', '♆', '♠', '☼', '☽'];

/** Press the shown symbols in the order they appear in the manual's master list. */
export function keypadPressOrder(symbols: string[]): string[] {
  return [...symbols].sort(
    (a, b) => KEYPAD_SYMBOLS.indexOf(a) - KEYPAD_SYMBOLS.indexOf(b),
  );
}

/* ---------- simon says ---------- */

export const SIMON_COLORS = ['R', 'G', 'B', 'Y'] as const;
export type SimonColor = (typeof SIMON_COLORS)[number];
export const SIMON_NAMES: Record<SimonColor, string> = {
  R: 'red',
  G: 'green',
  B: 'blue',
  Y: 'yellow',
};

/**
 * The manual's response key, indexed by strike count. A strike changes the
 * key — the Expert must re-derive, the Technician must re-learn.
 */
export const SIMON_KEY: Record<number, Record<SimonColor, SimonColor>> = {
  0: { R: 'B', B: 'G', G: 'Y', Y: 'R' },
  1: { R: 'Y', B: 'R', G: 'B', Y: 'G' },
  2: { R: 'G', B: 'Y', G: 'R', Y: 'B' },
};

export function simonExpected(sequence: SimonColor[], strikes: number): SimonColor[] {
  const key = SIMON_KEY[Math.min(Math.max(strikes, 0), 2)];
  return sequence.map((c) => key[c]);
}

export const SIMON_ROUNDS = 3;
export const SIMON_ROUND_LENGTHS = [3, 4, 5];

/* ---------- password wheels ---------- */

export const PASSWORD_WORDS = ['CAT', 'DOG', 'PIG', 'BAT', 'FOX', 'HEN', 'COW', 'ANT'];
export const PASSWORD_WHEEL_SIZE = 6;

/** Can `word` be spelled with the current wheel letters? */
export function passwordSpellable(wheels: string[][], word: string): boolean {
  if (word.length !== wheels.length) return false;
  return word
    .split('')
    .every((ch, i) => (wheels[i] ?? []).includes(ch));
}

/** Manual words spellable with these wheels. */
export function validPasswords(
  wheels: string[][],
  list: string[] = PASSWORD_WORDS,
): string[] {
  return list.filter((w) => passwordSpellable(wheels, w));
}

/* ---------- bomb generation ---------- */

export interface BombConfig {
  wires: WireColor[];
  keypad: string[];
  /** one flash sequence per simon round */
  simon: SimonColor[][];
  password: { wheels: string[][]; answer: string };
}

function pickDistinct<T>(rng: () => number, pool: T[], n: number): T[] {
  const copy = [...pool];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

/** Deterministic bomb for a seed. Password wheels are built so exactly ONE
 *  manual word is spellable (the answer). */
export function generateBomb(seed: number): BombConfig {
  const rng = mulberry32(seed);

  const wires = Array.from(
    { length: 5 },
    () => WIRE_COLORS[Math.floor(rng() * WIRE_COLORS.length)],
  );

  const keypad = pickDistinct(rng, KEYPAD_SYMBOLS, 4);

  const simon = SIMON_ROUND_LENGTHS.map((len) =>
    Array.from(
      { length: len },
      () => SIMON_COLORS[Math.floor(rng() * SIMON_COLORS.length)],
    ),
  );

  const answer = PASSWORD_WORDS[Math.floor(rng() * PASSWORD_WORDS.length)];
  let wheels: string[][] = [];
  for (let attempt = 0; attempt < 100; attempt++) {
    wheels = answer.split('').map((ch) => {
      const letters = new Set<string>([ch]);
      while (letters.size < PASSWORD_WHEEL_SIZE) {
        letters.add(String.fromCharCode(65 + Math.floor(rng() * 26)));
      }
      return pickDistinct(rng, [...letters], PASSWORD_WHEEL_SIZE);
    });
    const valid = validPasswords(wheels);
    if (valid.length === 1 && valid[0] === answer) break;
  }

  return { wires, keypad, simon, password: { wheels, answer } };
}

/** Letters currently showing on the wheels. */
export function wheelLetters(wheels: string[][], idx: number[]): string[] {
  return wheels.map((w, i) => w[(idx[i] ?? 0) % w.length] ?? '');
}
