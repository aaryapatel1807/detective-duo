/* Pure rules for Word Duel (Wordle-style). No React, no I/O — unit-testable. */

export const WORD_DUEL_TRIES = 6;
export const WORD_DUEL_LENGTH = 5;

export type LetterMark = 'correct' | 'present' | 'absent';

/**
 * Wordle feedback for one guess against the secret.
 * Two-pass algorithm so duplicate letters score correctly.
 */
export function wordleFeedback(secret: string, guess: string): LetterMark[] {
  const s = secret.toUpperCase().split('');
  const g = guess.toUpperCase().split('');
  const marks: LetterMark[] = new Array(g.length).fill('absent');
  const remaining = new Map<string, number>();

  for (let i = 0; i < s.length; i++) {
    if (g[i] === s[i]) {
      marks[i] = 'correct';
    } else {
      remaining.set(s[i], (remaining.get(s[i]) ?? 0) + 1);
    }
  }
  for (let i = 0; i < g.length; i++) {
    if (marks[i] === 'correct') continue;
    const n = remaining.get(g[i]) ?? 0;
    if (n > 0) {
      marks[i] = 'present';
      remaining.set(g[i], n - 1);
    }
  }
  return marks;
}

/** True when a guess wins outright. */
export function isWinningGuess(secret: string, guess: string): boolean {
  return secret.toUpperCase() === guess.toUpperCase();
}

/** 1-based try count at which the player solved, or null if unsolved. */
export function solvedIn(
  target: string,
  guesses: string[],
): number | null {
  const idx = guesses.findIndex((g) => isWinningGuess(target, g));
  return idx === -1 ? null : idx + 1;
}

export interface DuelResult {
  winner: string | 'draw' | null;
}

/**
 * Decide the duel. Each player races to guess the OPPONENT's secret.
 * secrets[pid] = pid's own secret; guesses[pid] = pid's attempts.
 * - both solved: fewer tries wins, tie = draw
 * - one solved + other exhausted or also solved: solver wins (fewer tries if both)
 * - game not over while someone can still solve
 */
export function wordDuelWinner(
  secrets: Record<string, string>,
  guesses: Record<string, string[]>,
  playerIds: string[],
  tries = WORD_DUEL_TRIES,
): string | 'draw' | null {
  const [a, b] = playerIds;
  if (!b) {
    // solo vs the house
    const solved = solvedIn(secrets[a] ?? '', guesses[a] ?? []);
    if (solved !== null) return a;
    if ((guesses[a] ?? []).length >= tries) return 'draw';
    return null;
  }
  const targetOf = (pid: string) => (pid === a ? secrets[b] : secrets[a]);
  const sa = solvedIn(targetOf(a), guesses[a] ?? []);
  const sb = solvedIn(targetOf(b), guesses[b] ?? []);
  const exhaustedA = (guesses[a] ?? []).length >= tries;
  const exhaustedB = (guesses[b] ?? []).length >= tries;

  if (sa !== null && sb !== null) {
    if (sa === sb) return 'draw';
    return sa < sb ? a : b;
  }
  if (sa !== null && (exhaustedB || sb !== null)) return a;
  if (sb !== null && (exhaustedA || sa !== null)) return b;
  if (exhaustedA && exhaustedB) return 'draw';
  return null;
}

/** Append a guess immutably (max `tries` entries). */
export function addGuess(
  guesses: Record<string, string[]>,
  playerId: string,
  guess: string,
  tries = WORD_DUEL_TRIES,
): Record<string, string[]> {
  const mine = guesses[playerId] ?? [];
  if (mine.length >= tries) return guesses;
  return { ...guesses, [playerId]: [...mine, guess.toUpperCase()] };
}
