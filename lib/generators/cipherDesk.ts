/**
 * Cipher Desk generator.
 *
 * Pure functions: a seed string goes in, a puzzle comes out. The same
 * seed always produces the same puzzle (FNV-1a + mulberry32, same
 * pattern as lib/generators/logicGrid.ts).
 *
 * Ladder: Caesar -> Atbash -> Rail fence -> Vigenère (short key) ->
 * monoalphabetic substitution (with frequency hints) -> layered
 * ciphers (two stacked) at Expert, with a twist every 10 Expert
 * levels (none -> reversed message -> an extra third layer).
 */
import { CIPHER_SENTENCES } from '../content/cipher-sentences';

// ---------------------------------------------------------------- PRNG ----

export function hashSeed(seed: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seedNum: number): () => number {
  let a = seedNum >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

// -------------------------------------------------------------- ciphers ----

const A = 'A'.charCodeAt(0);

function shiftChar(ch: string, shift: number): string {
  const code = ch.charCodeAt(0);
  if (code >= 65 && code <= 90) {
    return String.fromCharCode(A + ((((code - A + shift) % 26) + 26) % 26));
  }
  if (code >= 97 && code <= 122) {
    const a = 'a'.charCodeAt(0);
    return String.fromCharCode(a + ((((code - a + shift) % 26) + 26) % 26));
  }
  return ch;
}

const mapChars = (text: string, fn: (ch: string, i: number) => string): string =>
  text.split('').map(fn).join('');

export function encodeCaesar(text: string, shift: number): string {
  return mapChars(text, (ch) => shiftChar(ch, shift));
}
export function decodeCaesar(text: string, shift: number): string {
  return encodeCaesar(text, -shift);
}

export function encodeAtbash(text: string): string {
  return mapChars(text, (ch) => {
    const code = ch.charCodeAt(0);
    if (code >= 65 && code <= 90) return String.fromCharCode(A + (25 - (code - A)));
    if (code >= 97 && code <= 122) {
      const a = 'a'.charCodeAt(0);
      return String.fromCharCode(a + (25 - (code - a)));
    }
    return ch;
  });
}
export const decodeAtbash = encodeAtbash;

export function encodeRailFence(text: string, rails: number): string {
  if (rails <= 1) return text;
  const rows: string[] = Array.from({ length: rails }, () => '');
  let row = 0;
  let dir = 1;
  for (const ch of text) {
    rows[row] += ch;
    if (rails > 1) {
      row += dir;
      if (row === rails - 1) dir = -1;
      else if (row === 0) dir = 1;
    }
  }
  return rows.join('');
}

export function decodeRailFence(text: string, rails: number): string {
  if (rails <= 1) return text;
  // Walk the zigzag once to learn which output position each input
  // character lands in, then invert the permutation.
  const pattern: number[] = [];
  let row = 0;
  let dir = 1;
  for (let i = 0; i < text.length; i++) {
    pattern.push(row);
    if (rails > 1) {
      row += dir;
      if (row === rails - 1) dir = -1;
      else if (row === 0) dir = 1;
    }
  }
  const counts = new Array(rails).fill(0);
  const start: number[] = [];
  let acc = 0;
  for (let r = 0; r < rails; r++) {
    start.push(acc);
    acc += pattern.filter((p) => p === r).length;
  }
  void counts;
  const out = new Array(text.length);
  const cursor = [...start];
  for (let i = 0; i < text.length; i++) {
    const r = pattern[i];
    out[i] = text[cursor[r]];
    cursor[r]++;
  }
  return out.join('');
}

export function encodeVigenere(text: string, key: string): string {
  const k = key.toUpperCase().replace(/[^A-Z]/g, '');
  if (!k) return text;
  let ki = 0;
  return mapChars(text, (ch) => {
    if (!/[A-Za-z]/.test(ch)) return ch;
    const shift = k.charCodeAt(ki++ % k.length) - A;
    return shiftChar(ch, shift);
  });
}
export function decodeVigenere(text: string, key: string): string {
  const k = key.toUpperCase().replace(/[^A-Z]/g, '');
  if (!k) return text;
  let ki = 0;
  return mapChars(text, (ch) => {
    if (!/[A-Za-z]/.test(ch)) return ch;
    const shift = k.charCodeAt(ki++ % k.length) - A;
    return shiftChar(ch, -shift);
  });
}

/** key: a 26-letter permutation of A-Z (cipher alphabet for A..Z). */
export function encodeSubstitution(text: string, key: string): string {
  const upper = key.toUpperCase();
  return mapChars(text, (ch) => {
    const code = ch.charCodeAt(0);
    if (code >= 65 && code <= 90) return upper[code - A];
    if (code >= 97 && code <= 122) return upper[code - 'a'.charCodeAt(0)].toLowerCase();
    return ch;
  });
}
export function decodeSubstitution(text: string, key: string): string {
  const upper = key.toUpperCase();
  const inv = new Array(26);
  for (let i = 0; i < 26; i++) inv[upper.charCodeAt(i) - A] = String.fromCharCode(A + i);
  return mapChars(text, (ch) => {
    const code = ch.charCodeAt(0);
    if (code >= 65 && code <= 90) return inv[code - A];
    if (code >= 97 && code <= 122) {
      return inv[code - 'a'.charCodeAt(0)].toLowerCase();
    }
    return ch;
  });
}

// --------------------------------------------------------------- steps ----

export type CipherStep =
  | { kind: 'caesar'; shift: number }
  | { kind: 'atbash' }
  | { kind: 'railfence'; rails: number }
  | { kind: 'vigenere'; key: string }
  | { kind: 'substitution'; key: string };

export function stepLabel(step: CipherStep): string {
  switch (step.kind) {
    case 'caesar':
      return 'Caesar cipher';
    case 'atbash':
      return 'Atbash cipher';
    case 'railfence':
      return `Rail fence (${step.rails} rails)`;
    case 'vigenere':
      return `Vigenère cipher (key length ${step.key.length})`;
    case 'substitution':
      return 'Substitution cipher';
  }
}

export function encodeStep(text: string, step: CipherStep): string {
  switch (step.kind) {
    case 'caesar':
      return encodeCaesar(text, step.shift);
    case 'atbash':
      return encodeAtbash(text);
    case 'railfence':
      return encodeRailFence(text, step.rails);
    case 'vigenere':
      return encodeVigenere(text, step.key);
    case 'substitution':
      return encodeSubstitution(text, step.key);
  }
}

export function decodeStep(text: string, step: CipherStep): string {
  switch (step.kind) {
    case 'caesar':
      return decodeCaesar(text, step.shift);
    case 'atbash':
      return decodeAtbash(text);
    case 'railfence':
      return decodeRailFence(text, step.rails);
    case 'vigenere':
      return decodeVigenere(text, step.key);
    case 'substitution':
      return decodeSubstitution(text, step.key);
  }
}

export type CipherTwist = 'none' | 'reversed' | 'extra-layer';

export function encodePuzzle(
  plaintext: string,
  steps: CipherStep[],
  twist: CipherTwist,
): string {
  let text = twist === 'reversed' ? plaintext.split('').reverse().join('') : plaintext;
  for (const step of steps) text = encodeStep(text, step);
  return text;
}

export function decodePuzzle(
  ciphertext: string,
  steps: CipherStep[],
  twist: CipherTwist,
): string {
  let text = ciphertext;
  for (let i = steps.length - 1; i >= 0; i--) text = decodeStep(text, steps[i]);
  return twist === 'reversed' ? text.split('').reverse().join('') : text;
}

// --------------------------------------------------------------- tiers ----

export type CipherTier = 'Easy' | 'Medium' | 'Hard' | 'Expert';

export function tierName(level: number): CipherTier {
  if (level <= 10) return 'Easy';
  if (level <= 30) return 'Medium';
  if (level <= 60) return 'Hard';
  return 'Expert';
}

export interface CipherParams {
  tier: CipherTier;
  minLen: number;
  maxLen: number;
  /** Vigenère key-length range for this tier (when Vigenère is used). */
  keyLen: [number, number];
  railRange: [number, number];
  layers: number;
  twist: CipherTwist;
}

export function tierForLevel(level: number): CipherParams {
  if (level <= 10) {
    return { tier: 'Easy', minLen: 28, maxLen: 80, keyLen: [3, 3], railRange: [2, 2], layers: 1, twist: 'none' };
  }
  if (level <= 30) {
    return { tier: 'Medium', minLen: 55, maxLen: 135, keyLen: [3, 4], railRange: [2, 3], layers: 1, twist: 'none' };
  }
  if (level <= 60) {
    return { tier: 'Hard', minLen: 85, maxLen: 200, keyLen: [4, 6], railRange: [3, 4], layers: 1, twist: 'none' };
  }
  const band = Math.floor((level - 61) / 10);
  const twists: CipherTwist[] = ['none', 'reversed', 'extra-layer'];
  return {
    tier: 'Expert',
    minLen: 130,
    maxLen: 400,
    keyLen: [5, Math.min(8, 5 + Math.floor(band / 2))],
    railRange: [2, 5],
    layers: 2,
    twist: twists[band % 3],
  };
}

// -------------------------------------------------------------- puzzle ----

export interface CipherPuzzle {
  seed: string;
  level: number;
  tier: CipherTier;
  theme: string;
  plaintext: string;
  ciphertext: string;
  steps: CipherStep[];
  twist: CipherTwist;
  /** Human clue line shown in the UI (never reveals a key or shift). */
  clue: string;
  /** Top ciphertext letters by frequency (substitution puzzles only). */
  frequencyHints: { letter: string; count: number }[];
  /** Length of the Vigenère key in play, if any (shown as a clue). */
  vigenereKeyLength: number | null;
}

const VIGENERE_WORDS = [
  'TEA', 'CAT', 'KEY', 'LAMP', 'ROSE', 'MINT', 'BOOK', 'STAR', 'MOON', 'CAKE',
  'CLUE', 'MAPS', 'INK', 'SNOW', 'LEAF', 'BREAD', 'HONEY', 'PEARL', 'CLOVER',
  'LANTERN', 'JASMINE', 'POCKET', 'LETTER', 'GARDEN', 'HARBOUR', 'BAKERY',
];

function randomVigenereKey(len: number, rng: () => number): string {
  const words = shuffle(VIGENERE_WORDS, rng);
  let key = '';
  for (const w of words) {
    key += w;
    if (key.length >= len) break;
  }
  if (key.length < len) {
    const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    while (key.length < len) key += alpha[Math.floor(rng() * 26)];
  }
  return key.slice(0, len);
}

function randomSubstitutionKey(rng: () => number): string {
  return shuffle('ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''), rng).join('');
}

function randomStep(
  kinds: CipherStep['kind'][],
  params: CipherParams,
  rng: () => number,
): CipherStep {
  const kind = pick(kinds, rng);
  switch (kind) {
    case 'caesar':
      return { kind, shift: 1 + Math.floor(rng() * 25) };
    case 'atbash':
      return { kind };
    case 'railfence': {
      const [lo, hi] = params.railRange;
      return { kind, rails: lo + Math.floor(rng() * (hi - lo + 1)) };
    }
    case 'vigenere': {
      const [lo, hi] = params.keyLen;
      return { kind, key: randomVigenereKey(lo + Math.floor(rng() * (hi - lo + 1)), rng) };
    }
    case 'substitution':
      return { kind, key: randomSubstitutionKey(rng) };
  }
}

function frequencyHints(ciphertext: string): { letter: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const ch of ciphertext) {
    if (/[A-Z]/.test(ch)) counts.set(ch, (counts.get(ch) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([letter, count]) => ({ letter, count }))
    .sort((a, b) => b.count - a.count || a.letter.localeCompare(b.letter))
    .slice(0, 3);
}

function pickSentence(params: CipherParams, rng: () => number): { theme: string; text: string } {
  const bucket = CIPHER_SENTENCES.filter(
    (s) => s.text.length >= params.minLen && s.text.length <= params.maxLen,
  );
  const pool = bucket.length ? bucket : CIPHER_SENTENCES;
  return pick(pool, rng);
}

export function levelSeed(level: number, salt: string): string {
  return `cd|${salt}|${level}`;
}

export function generatePuzzle(seed: string, level: number): CipherPuzzle {
  const rng = mulberry32(hashSeed(seed));
  // Warm-up: neighbouring seeds share a long prefix, so discard the
  // first draws to decorrelate puzzles from one level to the next.
  for (let i = 0; i < 8; i++) rng();
  const params = tierForLevel(level);
  const sentence = pickSentence(params, rng);

  let steps: CipherStep[];
  if (params.tier === 'Easy') {
    steps = [randomStep(['caesar', 'atbash'], params, rng)];
  } else if (params.tier === 'Medium') {
    steps = [randomStep(['caesar', 'atbash', 'railfence', 'vigenere'], params, rng)];
  } else if (params.tier === 'Hard') {
    steps = [randomStep(['caesar', 'atbash', 'railfence', 'vigenere', 'substitution'], params, rng)];
  } else {
    const kinds = shuffle(
      ['caesar', 'atbash', 'railfence', 'vigenere', 'substitution'] as CipherStep['kind'][],
      rng,
    );
    const layerCount = params.twist === 'extra-layer' ? 3 : 2;
    steps = kinds.slice(0, layerCount).map((kind) => randomStep([kind], params, rng));
  }

  const ciphertext = encodePuzzle(sentence.text, steps, params.twist);
  const hasSub = steps.some((s) => s.kind === 'substitution');
  const vig = steps.find((s) => s.kind === 'vigenere');
  const clueParts = steps.map(stepLabel);
  let clue = clueParts.join(' then ');
  if (params.twist === 'reversed') clue += ' — and the message was written backwards first';
  if (params.twist === 'extra-layer') clue += ' — three ciphers stacked';

  return {
    seed,
    level,
    tier: params.tier,
    theme: sentence.theme,
    plaintext: sentence.text,
    ciphertext,
    steps,
    twist: params.twist,
    clue,
    frequencyHints: hasSub ? frequencyHints(ciphertext) : [],
    vigenereKeyLength: vig && vig.kind === 'vigenere' ? vig.key.length : null,
  };
}

export function generateLevelPuzzle(level: number, salt: string): CipherPuzzle {
  return generatePuzzle(levelSeed(level, salt), level);
}
