/* Spot the Liar — pure rules. */

export const TOTAL_ROUNDS = 3;

export function validStatements(statements: string[]): boolean {
  return (
    statements.length === 3 &&
    statements.every((s) => s.trim().length >= 3 && s.trim().length <= 280)
  );
}

/** Alternate the liar each round: round 1 → playerA, round 2 → playerB, … */
export function liarForRound(round: number, playerA: string, playerB: string): string {
  return round % 2 === 1 ? playerA : playerB;
}

export function isLastRound(round: number): boolean {
  return round >= TOTAL_ROUNDS;
}

/** Score: correct call → interrogator scores; wrong call → liar scores. */
export function scoreForVerdict(
  scores: Record<string, number>,
  interrogatorId: string,
  liarId: string,
  correct: boolean,
): Record<string, number> {
  const winner = correct ? interrogatorId : liarId;
  return { ...scores, [winner]: (scores[winner] ?? 0) + 1 };
}

export function matchWinner(scores: Record<string, number>): string | null {
  const entries = Object.entries(scores);
  if (entries.length === 0) return null;
  const sorted = entries.sort((a, b) => b[1] - a[1]);
  if (sorted.length > 1 && sorted[0][1] === sorted[1][1]) return null; // tie
  return sorted[0][0];
}
