/* Pure rules for Cipher Duel (Bulls & Cows, 4-digit codes). No React, no I/O. */

export const CIPHER_CODE_LENGTH = 4;

export interface BullsCows {
  bulls: number;
  cows: number;
}

/** 4 unique digits, e.g. "7391". */
export function isValidCode(code: string): boolean {
  if (!/^\d{4}$/.test(code)) return false;
  return new Set(code.split('')).size === 4;
}

/**
 * Bulls = right digit in the right place.
 * Cows = right digit in the wrong place.
 * (Codes always have unique digits, so no double-counting issues.)
 */
export function scoreBullsCows(secret: string, guess: string): BullsCows {
  let bulls = 0;
  let cows = 0;
  for (let i = 0; i < secret.length; i++) {
    if (guess[i] === secret[i]) bulls++;
    else if (secret.includes(guess[i])) cows++;
  }
  return { bulls, cows };
}

export interface CipherDuelGuess {
  guess: string;
  bulls: number;
  cows: number;
}

/** Append a scored guess immutably. */
export function addScoredGuess(
  guesses: Record<string, CipherDuelGuess[]>,
  playerId: string,
  secret: string,
  guess: string,
): Record<string, CipherDuelGuess[]> {
  const { bulls, cows } = scoreBullsCows(secret, guess);
  return {
    ...guesses,
    [playerId]: [...(guesses[playerId] ?? []), { guess, bulls, cows }],
  };
}

/** Winner = first player to guess the opponent's code exactly. */
export function cipherDuelWinner(
  codes: Record<string, string>,
  guesses: Record<string, CipherDuelGuess[]>,
  playerIds: string[],
): string | null {
  const [a, b] = playerIds;
  const targetOf = (pid: string) => (pid === a ? codes[b ?? ''] : codes[a]);
  for (const pid of playerIds) {
    const target = targetOf(pid);
    if (target && (guesses[pid] ?? []).some((g) => g.guess === target)) return pid;
  }
  return null;
}
