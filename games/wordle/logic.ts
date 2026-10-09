/* Wordle-style evaluation — pure, unit-testable.
 * Answers come from the shared offline bank (read-only import).
 */

import { WORDS_5 } from '../../lib/content/words';

export type LetterMark = 'correct' | 'present' | 'absent';

export const MAX_TRIES = 6;
export const WORD_LEN = 5;

/** Two-pass evaluation so duplicate letters are scored correctly. */
export function evaluateGuess(answer: string, guess: string): LetterMark[] {
  const a = answer.toUpperCase().split('');
  const g = guess.toUpperCase().split('');
  const marks: LetterMark[] = new Array<LetterMark>(WORD_LEN).fill('absent');
  const remaining = new Map<string, number>();
  for (let i = 0; i < WORD_LEN; i++) {
    if (g[i] === a[i]) {
      marks[i] = 'correct';
    } else {
      remaining.set(a[i], (remaining.get(a[i]) ?? 0) + 1);
    }
  }
  for (let i = 0; i < WORD_LEN; i++) {
    if (marks[i] === 'correct') continue;
    const n = remaining.get(g[i]) ?? 0;
    if (n > 0) {
      marks[i] = 'present';
      remaining.set(g[i], n - 1);
    }
  }
  return marks;
}

export function pickAnswer(rng: () => number = Math.random): string {
  return WORDS_5[Math.floor(rng() * WORDS_5.length)];
}

export function isFiveLetters(s: string): boolean {
  return /^[a-zA-Z]{5}$/.test(s);
}

/** Best mark wins for keyboard shading: correct > present > absent. */
export function mergeMark(prev: LetterMark | undefined, next: LetterMark): LetterMark {
  const rank: Record<LetterMark, number> = { absent: 0, present: 1, correct: 2 };
  if (!prev) return next;
  return rank[next] > rank[prev] ? next : prev;
}
