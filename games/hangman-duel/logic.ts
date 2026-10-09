/* Pure rules for Hangman Duel. No React, no I/O — unit-testable. */

export const HANGMAN_ROUNDS = 3;
export const HANGMAN_MAX_STRIKES = 6;

/** Round word lengths, in order: round 1 → 5 letters, round 2 → 4, round 3 → 6. */
export const ROUND_LENGTHS: (4 | 5 | 6)[] = [5, 4, 6];

export function letterInWord(word: string, letter: string): boolean {
  return word.toUpperCase().includes(letter.toUpperCase());
}

/** True when every letter of the word has been guessed. */
export function isWordComplete(word: string, guessed: string[]): boolean {
  const g = new Set(guessed.map((l) => l.toUpperCase()));
  return word
    .toUpperCase()
    .split('')
    .every((ch) => g.has(ch));
}

export interface LetterGuessResult {
  guessed: string[];
  strikes: Record<string, number>;
  correct: boolean;
}

/**
 * Apply one letter guess. Duplicate guesses are ignored (no strike).
 * Wrong guesses add one strike to the guessing player.
 */
export function applyLetterGuess(
  word: string,
  guessed: string[],
  strikes: Record<string, number>,
  playerId: string,
  letter: string,
): LetterGuessResult {
  const L = letter.toUpperCase();
  if (guessed.map((g) => g.toUpperCase()).includes(L)) {
    return { guessed, strikes, correct: letterInWord(word, L) };
  }
  const correct = letterInWord(word, L);
  const nextGuessed = [...guessed, L];
  const nextStrikes = correct
    ? strikes
    : { ...strikes, [playerId]: (strikes[playerId] ?? 0) + 1 };
  return { guessed: nextGuessed, strikes: nextStrikes, correct };
}

/**
 * Who won a round: fewest strikes wins; equal strikes = 'draw'.
 * playerIds[0] defaults as the winner when the second id is missing (solo).
 */
export function roundWinner(
  strikes: Record<string, number>,
  playerIds: string[],
): string | 'draw' {
  const [a, b] = playerIds;
  if (!b) return a;
  const sa = strikes[a] ?? 0;
  const sb = strikes[b] ?? 0;
  if (sa === sb) return 'draw';
  return sa < sb ? a : b;
}

/** Match winner after all rounds: fewest total strikes wins; tie = 'draw'. */
export function matchWinner(
  totalStrikes: Record<string, number>,
  playerIds: string[],
): string | 'draw' {
  return roundWinner(totalStrikes, playerIds);
}

/** True when a round must end: word solved, or someone hit the strike limit. */
export function isRoundOver(
  word: string,
  guessed: string[],
  roundStrikes: Record<string, number>,
  playerIds: string[],
): boolean {
  if (isWordComplete(word, guessed)) return true;
  return playerIds.some((pid) => (roundStrikes[pid] ?? 0) >= HANGMAN_MAX_STRIKES);
}
