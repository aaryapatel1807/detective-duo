/**
 * Safe Cracker generator + solver bot (Duo Corner).
 *
 * One secret code per round. A guess comes back marked with how many
 * digits are right and how many are in the right place (Mastermind
 * marking, duplicate-safe: each secret digit is counted at most once).
 * Fewest guesses wins the round.
 *
 * Difficulty: Easy = 4 digits, no repeats; Medium = 4 digits, repeats;
 * Hard = 5 digits, repeats; Expert = 6 digits from a smaller pool
 * (0-5) with repeats — still more digits, but the candidate set stays
 * small enough for the solver to run instantly on a phone.
 *
 * The bot is a solver: it keeps every code still consistent with all
 * feedback so far and guesses from that set. At low levels it blunders
 * on purpose (a random guess that ignores consistency), so it loses
 * more often. The same solver logic powers the versus progress bar:
 * progress = how much of the candidate set has been ruled out.
 */

import { rngFromSeed } from './rng';

export interface SafeParams {
  digits: number;
  pool: number; // digits 0..pool-1
  repeats: boolean;
}

export function paramsForLevel(level: number): SafeParams {
  if (level <= 10) return { digits: 4, pool: 10, repeats: false };
  if (level <= 30) return { digits: 4, pool: 10, repeats: true };
  if (level <= 60) return { digits: 5, pool: 10, repeats: true };
  return { digits: 6, pool: 6, repeats: true };
}

/** Blunder chance per tier: the low-level bot gets worse on purpose. */
export function blunderChance(level: number): number {
  if (level <= 10) return 0.3;
  if (level <= 30) return 0.12;
  return 0;
}

export function generateCode(seed: string, level: number): number[] {
  const p = paramsForLevel(level);
  const rng = rngFromSeed(seed);
  const code: number[] = [];
  while (code.length < p.digits) {
    const d = Math.floor(rng() * p.pool);
    if (!p.repeats && code.includes(d)) continue;
    code.push(d);
  }
  return code;
}

export interface Mark {
  rightPlace: number;
  rightDigit: number; // right digit, wrong place
}

/** Duplicate-safe Mastermind marking. */
export function markGuess(guess: number[], secret: number[]): Mark {
  let rightPlace = 0;
  const secretLeft: number[] = [];
  const guessLeft: number[] = [];
  for (let i = 0; i < secret.length; i++) {
    if (guess[i] === secret[i]) rightPlace++;
    else {
      secretLeft.push(secret[i]);
      guessLeft.push(guess[i]);
    }
  }
  let rightDigit = 0;
  const counts = new Map<number, number>();
  for (const d of secretLeft) counts.set(d, (counts.get(d) ?? 0) + 1);
  for (const d of guessLeft) {
    const left = counts.get(d) ?? 0;
    if (left > 0) {
      rightDigit++;
      counts.set(d, left - 1);
    }
  }
  return { rightPlace, rightDigit };
}

export function isCracked(guess: number[], secret: number[]): boolean {
  return guess.length === secret.length && guess.every((d, i) => d === secret[i]);
}

/** All codes consistent with the params (used as the solver's candidate set). */
export function allCandidates(p: SafeParams): number[][] {
  const out: number[][] = [];
  const cur: number[] = [];
  const walk = () => {
    if (cur.length === p.digits) {
      out.push([...cur]);
      return;
    }
    for (let d = 0; d < p.pool; d++) {
      if (!p.repeats && cur.includes(d)) continue;
      cur.push(d);
      walk();
      cur.pop();
    }
  };
  walk();
  return out;
}

export function filterCandidates(
  candidates: number[][],
  guess: number[],
  mark: Mark,
): number[][] {
  return candidates.filter((c) => {
    const m = markGuess(guess, c);
    return m.rightPlace === mark.rightPlace && m.rightDigit === mark.rightDigit;
  });
}

export interface GuessRecord {
  guess: number[];
  mark: Mark;
}

/** Candidates left after a history of guesses (progress-bar input). */
export function candidatesAfter(
  p: SafeParams,
  history: GuessRecord[],
): number[][] {
  let cands = allCandidates(p);
  for (const h of history) {
    cands = filterCandidates(cands, h.guess, h.mark);
    if (!cands.length) break;
  }
  return cands;
}

/**
 * Versus progress: 1 when cracked, otherwise the share of the candidate
 * set already ruled out (a real measure of narrowing down, not guesses).
 */
export function versusProgress(
  p: SafeParams,
  history: GuessRecord[],
  cracked: boolean,
): number {
  if (cracked) return 1;
  const total = allCandidates(p).length;
  const left = candidatesAfter(p, history).length;
  return Math.min(0.95, 1 - left / total);
}

/**
 * Bot guess. Picks a random still-consistent candidate; on a blunder it
 * ignores consistency and guesses any code. Seeded, so bot games replay.
 */
export function botGuess(
  p: SafeParams,
  candidates: number[][],
  level: number,
  rng: () => number,
): number[] {
  if (rng() < blunderChance(level)) {
    const code: number[] = [];
    while (code.length < p.digits) {
      const d = Math.floor(rng() * p.pool);
      if (!p.repeats && code.includes(d)) continue;
      code.push(d);
    }
    return code;
  }
  if (!candidates.length) return generateCode(`fallback-${rng()}`, level);
  return [...candidates[Math.floor(rng() * candidates.length)]];
}

/** First bot guess of a round: a spread-out opener, not a random stab. */
export function botOpener(p: SafeParams): number[] {
  const out: number[] = [];
  for (let i = 0; i < p.digits; i++) {
    const d = p.repeats ? (i * 2 + 1) % p.pool : i;
    out.push(d);
  }
  return out;
}
