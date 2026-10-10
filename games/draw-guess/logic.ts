/* Pure rules for Draw & Guess. */

export const DRAW_SECONDS = 60;
export const ROUNDS = 2; // each detective draws once

/** Normalize a guess for comparison: lowercase, trimmed, single spaces. */
export function normalizeGuess(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, ' ');
}

export function isCorrectGuess(guess: string, word: string): boolean {
  return normalizeGuess(guess) === normalizeGuess(word) && normalizeGuess(word).length > 0;
}

/** Guesser score: 100 base + 2 per second remaining. */
export function guesserScore(secondsLeft: number): number {
  return 100 + Math.max(0, Math.round(secondsLeft)) * 2;
}

/** Drawer score when the partner guesses correctly. */
export const DRAWER_SCORE = 50;

export function secondsLeft(startedAt: number, now: number, total = DRAW_SECONDS): number {
  return Math.max(0, total - Math.floor((now - startedAt) / 1000));
}
