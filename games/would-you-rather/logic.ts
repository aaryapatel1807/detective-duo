/* Pure rules for Would You Rather (co-op).
 * Both detectives vote secretly; votes reveal simultaneously. A matching
 * pair earns XP for both and records a co-op win.
 */

import { WOULD_YOU_RATHER } from '../../lib/content/dares';

export type WYRPair = [string, string];

export function shuffle<T>(arr: T[], rand: () => number = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function buildDeck(n: number, rand: () => number = Math.random): WYRPair[] {
  return shuffle([...WOULD_YOU_RATHER], rand).slice(0, n);
}

export function deckSize(): number {
  return WOULD_YOU_RATHER.length;
}

/** XP each detective earns when both pick the same option. */
export const MATCH_XP = 50;
/** XP each detective earns for a mismatched pair (participation). */
export const MISMATCH_XP = 10;

export function isMatch(votes: Record<string, number>): boolean {
  const vals = Object.values(votes);
  return vals.length === 2 && vals[0] === vals[1];
}
