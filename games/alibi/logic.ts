/* Alibi — pure rules. */

export const TOTAL_ROUNDS = 3;
export const TIMED_QUESTION_SECONDS = 45;
export const MIN_ALIBI_LENGTH = 20;

export function validAlibi(text: string): boolean {
  const t = text.trim();
  return t.length >= MIN_ALIBI_LENGTH && t.length <= 1200;
}

/** ms remaining on a timed question (clamped at 0). */
export function timedRemaining(deadline: number, now: number): number {
  return Math.max(0, deadline - now);
}

export function isTimedOut(deadline: number, now: number): boolean {
  return now >= deadline;
}

/** BUSTED → interrogator scores; CLEAN → criminal scores. */
export function scoreForVerdict(
  scores: Record<string, number>,
  interrogatorId: string,
  criminalId: string,
  verdict: 'busted' | 'clean',
): Record<string, number> {
  const winner = verdict === 'busted' ? interrogatorId : criminalId;
  return { ...scores, [winner]: (scores[winner] ?? 0) + 1 };
}

export function matchWinner(scores: Record<string, number>): string | null {
  const entries = Object.entries(scores);
  if (entries.length === 0) return null;
  const sorted = entries.sort((a, b) => b[1] - a[1]);
  if (sorted.length > 1 && sorted[0][1] === sorted[1][1]) return null;
  return sorted[0][0];
}

export function isLastRound(round: number): boolean {
  return round >= TOTAL_ROUNDS;
}
