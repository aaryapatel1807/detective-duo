/* Mind Meld — pure rules: normalization, matching, round advancement. */

export const MIND_WIN_MATCHES = 5;

/** Canonical form for comparison: lowercase, collapsed whitespace. */
export function normalizeWord(w: string): string {
  return w.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** True when both players typed the same word (case-insensitive). */
export function wordsMatch(a: string, b: string): boolean {
  const na = normalizeWord(a);
  const nb = normalizeWord(b);
  return na.length > 0 && na === nb;
}

/** Theme after a miss: the next words must relate to BOTH previous words. */
export function buildCustomTheme(a: string, b: string): string {
  return `${normalizeWord(a).toUpperCase()} + ${normalizeWord(b).toUpperCase()}`;
}

/** Cycle through the authored themes in order. */
export function nextThemeIdx(current: number, total: number): number {
  return (current + 1) % total;
}

export interface RoundAdvance {
  round: number;
  matches: number;
  themeIdx: number;
  customTheme: string;
  prevA: string;
  prevB: string;
  won: boolean;
}

/**
 * Compute the next round's state from the current one plus the two revealed
 * words. Deterministic from shared state, so a double-fire from both tabs
 * is idempotent.
 */
export function advanceRound(
  round: number,
  matches: number,
  themeIdx: number,
  totalThemes: number,
  wordA: string,
  wordB: string,
): RoundAdvance {
  const match = wordsMatch(wordA, wordB);
  const nextMatches = matches + (match ? 1 : 0);
  const won = nextMatches >= MIND_WIN_MATCHES;
  return {
    round: round + 1,
    matches: nextMatches,
    themeIdx: match ? nextThemeIdx(themeIdx, totalThemes) : -1,
    customTheme: match ? '' : buildCustomTheme(wordA, wordB),
    prevA: normalizeWord(wordA),
    prevB: normalizeWord(wordB),
    won,
  };
}

/** Fresh shared state for a new meld. */
export function freshMeld(): {
  round: number;
  matches: number;
  themeIdx: number;
  customTheme: string;
  prevA: string;
  prevB: string;
  submissions: Record<string, string>;
  matchXp: Record<string, number>;
  won: boolean;
  awarded: Record<string, boolean>;
} {
  return {
    round: 1,
    matches: 0,
    themeIdx: 0,
    customTheme: '',
    prevA: '',
    prevB: '',
    submissions: {},
    matchXp: {},
    won: false,
    awarded: {},
  };
}
