/* Crime Mystery pure rules — unit-testable, no React, no network.
 *
 * Covers: case lookup, asymmetric clue dealing, board pin layout, red-string
 * links, secret voting + tally, hint-token spending, and case-log progress.
 */

import { cluesFor, type CaseFile, type Clue } from '../../lib/content/cases';
import { ALL_CASES, getMysteryCase } from './cases';
import { HINT_EXTRAS } from './qa';
import type {
  CaseResult,
  PinPos,
  Side,
  StringLink,
} from './types';

export { ALL_CASES, getMysteryCase };
export const PROGRESS_KEY = 'dd-mystery-progress';
export const MAX_ATTEMPTS = 2;

/* ---------------- sides ---------------- */

/** The player who opens the case is side 'a' (host); the partner is 'b'. */
export function assignSides(starterId: string, partnerId: string | null): Record<string, Side> {
  const sides: Record<string, Side> = { [starterId]: 'a' };
  if (partnerId && partnerId !== starterId) sides[partnerId] = 'b';
  return sides;
}

export function sideOf(sides: Record<string, Side> | undefined, playerId: string): Side {
  return sides?.[playerId] ?? 'a';
}

/* ---------------- clue dealing ---------------- */

/** Clues one side may see: own split + 'both', plus the bonus clue once revealed. */
export function visibleClues(
  c: CaseFile,
  side: Side,
  bonusRevealed: boolean,
): Clue[] {
  const base = cluesFor(c, side);
  if (bonusRevealed) {
    const bonus = HINT_EXTRAS[c.id]?.bonus;
    if (bonus && !base.some((cl) => cl.id === bonus.id)) return [...base, bonus];
  }
  return base;
}

/** How many exclusive clues each side holds (asymmetry check). */
export function exclusiveCounts(c: CaseFile): { a: number; b: number } {
  return {
    a: c.clues.filter((cl) => cl.split === 'a').length,
    b: c.clues.filter((cl) => cl.split === 'b').length,
  };
}

/* ---------------- evidence board ---------------- */

/** Deterministic scatter of clue pins across the board (0..100 coords). */
export function defaultPins(clues: Clue[]): Record<string, PinPos> {
  const pins: Record<string, PinPos> = {};
  const cols = Math.ceil(Math.sqrt(clues.length));
  clues.forEach((cl, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    // jitter from the clue id so layouts differ per case but stay stable
    let h = 0;
    for (const ch of cl.id) h = (h * 31 + ch.charCodeAt(0)) % 997;
    const jx = (h % 11) - 5;
    const jy = ((h >> 3) % 9) - 4;
    pins[cl.id] = {
      x: Math.min(88, Math.max(6, 12 + col * (76 / Math.max(1, cols - 1 || 1)) + jx)),
      y: Math.min(82, Math.max(10, 14 + row * 26 + jy)),
    };
  });
  return pins;
}

export function clampPos(p: PinPos): PinPos {
  return {
    x: Math.min(94, Math.max(2, p.x)),
    y: Math.min(90, Math.max(4, p.y)),
  };
}

function linkKey(a: string, b: string): string {
  return [a, b].sort().join('::');
}

/** Toggle a red string between two pins. No self-links, no duplicates. */
export function toggleLink(links: StringLink[], a: string, b: string): StringLink[] {
  if (a === b) return links;
  const key = linkKey(a, b);
  const exists = links.some((l) => linkKey(l.a, l.b) === key);
  if (exists) return links.filter((l) => linkKey(l.a, l.b) !== key);
  return [...links, { a, b }];
}

export function linkExists(links: StringLink[], a: string, b: string): boolean {
  const key = linkKey(a, b);
  return links.some((l) => linkKey(l.a, l.b) === key);
}

/* ---------------- voting ---------------- */

export function castVote(
  votes: Record<string, string>,
  playerId: string,
  suspect: string,
): Record<string, string> {
  return { ...votes, [playerId]: suspect };
}

export type VoteTally = 'waiting' | 'solved' | 'wrong';

/**
 * Both players must vote. Solved only when BOTH name the culprit.
 * Solo practice (one voter): a single correct vote solves.
 */
export function tallyVotes(
  votes: Record<string, string>,
  voterIds: string[],
  culprit: string,
): VoteTally {
  if (!voterIds.every((id) => votes[id])) return 'waiting';
  const allCorrect = voterIds.every((id) => votes[id] === culprit);
  return allCorrect ? 'solved' : 'wrong';
}

export function attemptsLeft(attempts: number): number {
  return Math.max(0, MAX_ATTEMPTS - attempts);
}

/* ---------------- hint tokens ---------------- */

export type HintYield =
  | { kind: 'bonus'; clue: Clue }
  | { kind: 'nudge'; text: string }
  | { kind: 'empty' };

/** First spend reveals the bonus clue; later spends reveal nudges in order. */
export function spendHint(caseId: string, hintsUsed: number): HintYield {
  const extras = HINT_EXTRAS[caseId];
  if (!extras) return { kind: 'empty' };
  if (hintsUsed === 0) return { kind: 'bonus', clue: extras.bonus };
  const nudge = extras.nudges[hintsUsed - 1];
  return nudge ? { kind: 'nudge', text: nudge } : { kind: 'empty' };
}

/** Spendable tokens = granted minus used. */
export function hintsAvailable(granted: number, used: number): number {
  return Math.max(0, granted - used);
}

/* ---------------- case log (localStorage) ---------------- */

function readRaw(): Record<string, CaseResult> {
  try {
    if (typeof window === 'undefined') return {};
    const raw = window.localStorage.getItem(PROGRESS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: Record<string, CaseResult> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (v === 'solved' || v === 'failed') out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

export function readProgress(): Record<string, CaseResult> {
  return readRaw();
}

export function writeProgress(caseId: string, result: CaseResult): Record<string, CaseResult> {
  const next = { ...readRaw(), [caseId]: result };
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(next));
    }
  } catch {}
  return next;
}
