/* Pure rules for Cipher Breaker. No React, no I/O — unit-testable. */

/** Normalize a plaintext answer for comparison: uppercase, collapsed spaces. */
export function normalizeAnswer(text: string): string {
  return text.toUpperCase().replace(/[^A-Z ]/g, ' ').replace(/\s+/g, ' ').trim();
}

/** True when the player's answer decodes the cipher. */
export function checkAnswer(solution: string, answer: string): boolean {
  return normalizeAnswer(solution) === normalizeAnswer(answer);
}

export interface HintToken {
  from: string;
  text: string;
  at: number;
}

/** Build the hint token granted for a solved cipher. */
export function makeHintToken(keyword: string, at: number = Date.now()): HintToken {
  return { from: 'cipher-breaker', text: `Hint token: ${keyword}`, at };
}

/**
 * Append a token to the shared hint-token list (immutable).
 * Note: shared-state arrays are REPLACED on merge, so callers must pass the
 * current full list and write back the returned one.
 */
export function grantToken(tokens: HintToken[], keyword: string): HintToken[] {
  return [...tokens, makeHintToken(keyword)];
}

/** How many evidence tokens this game has granted. */
export function evidenceTokenCount(tokens: HintToken[] | undefined): number {
  return (tokens ?? []).filter((t) => t.from === 'cipher-breaker').length;
}
