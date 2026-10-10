/* Pure rules for Ghost. No React, no I/O — unit-testable.
 *
 * Detectives alternate adding a letter to a shared fragment.
 * - Completing a valid word (4+ letters) loses the round instantly.
 * - On your turn you may CHALLENGE instead of playing: if the fragment can
 *   still become a word, the challenge fails and YOU lose the round;
 *   otherwise the previous player (the bluffer) loses the round.
 */

export const GHOST_MIN_WORD = 4;
export const GHOST_ROUNDS_TO_LOSE = 2; // first to lose 2 rounds loses the match

export function normalizeBank(bank: string[]): string[] {
  return bank.map((w) => w.toUpperCase());
}

/** True when the fragment is a complete valid word (4+ letters). */
export function isCompleteWord(fragment: string, bank: string[]): boolean {
  const f = fragment.toUpperCase();
  return f.length >= GHOST_MIN_WORD && normalizeBank(bank).includes(f);
}

/** True when some bank word (4+ letters) starts with the fragment. */
export function isViablePrefix(fragment: string, bank: string[]): boolean {
  const f = fragment.toUpperCase();
  if (!f) return true;
  return normalizeBank(bank).some(
    (w) => w.length >= GHOST_MIN_WORD && w.startsWith(f),
  );
}

export type PlayOutcome = 'continue' | 'mover-loses-round';

/**
 * Adjudicate appending `letter` to `fragment`.
 * Returns the new fragment and whether the mover loses the round.
 */
export function playLetter(
  fragment: string,
  letter: string,
  bank: string[],
): { fragment: string; outcome: PlayOutcome } {
  const next = (fragment + letter).toUpperCase();
  if (isCompleteWord(next, bank)) return { fragment: next, outcome: 'mover-loses-round' };
  return { fragment: next, outcome: 'continue' };
}

export type ChallengeOutcome = 'challenger-loses' | 'mover-loses';

/**
 * Adjudicate a challenge against the current fragment (made by the previous
 * mover). If a word can still be formed, the challenge fails.
 */
export function adjudicateChallenge(fragment: string, bank: string[]): ChallengeOutcome {
  if (isCompleteWord(fragment, bank)) return 'mover-loses'; // shouldn't happen, but the mover completed it
  return isViablePrefix(fragment, bank) ? 'challenger-loses' : 'mover-loses';
}

/** Match loser: first player to reach GHOST_ROUNDS_TO_LOSE round losses. */
export function matchLoser(
  roundLosses: Record<string, number>,
  playerIds: string[],
): string | null {
  for (const pid of playerIds) {
    if ((roundLosses[pid] ?? 0) >= GHOST_ROUNDS_TO_LOSE) return pid;
  }
  return null;
}

/** Match winner = the player who is NOT the loser. */
export function matchWinner(
  roundLosses: Record<string, number>,
  playerIds: string[],
): string | null {
  const loser = matchLoser(roundLosses, playerIds);
  if (!loser) return null;
  return playerIds.find((pid) => pid !== loser) ?? null;
}
