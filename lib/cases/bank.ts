/**
 * Case Files bank + ladder mapping.
 *
 * Bank: lib/content/cases/*.json, one file per tier, loaded statically so
 * the page works offline and signed-out. Every case in the bank must pass
 * lib/cases/validator.ts (enforced by lib/cases/bank.test.ts and by
 * scripts/validate-cases.ts).
 *
 * LADDER (documented mapping — level N -> case):
 *   Levels 1-15    Easy    (4 suspects, 1-2 red herrings, 3-4 steps)
 *   Levels 16-35   Medium  (5-6 suspects, 2-3 red herrings, 4-5 steps)
 *   Levels 36-55   Hard    (6-7 suspects, 3 red herrings, 5-6 steps)
 *   Levels 56+     Expert  (8 suspects, 4 red herrings, 8+ steps)
 * Within a tier, cases rotate in bank order with no repeat until the
 * tier's cases are exhausted:
 *   case = tierCases[(level - tierStart) % tierCases.length]
 * So level 1 -> first Easy case, level 16 -> first Medium case, and a
 * player who finishes a tier and keeps going cycles back to its start
 * (levels are unbounded; the bank is finite, so rotation — not new
 * cases — is the documented behaviour past the end of a tier).
 */
import type { CaseDifficulty, CaseFile } from './types';
import easy from '../content/cases/easy.json';
import mediumA from '../content/cases/medium-a.json';
import mediumB from '../content/cases/medium-b.json';
import hardA from '../content/cases/hard-a.json';
import hardB from '../content/cases/hard-b.json';
import expert from '../content/cases/expert.json';
import murder from '../content/cases/murder.json';

export const GAME_ID = 'case-files';
export const MURDER_GAME_ID = 'murder-mystery';

const asCases = (json: unknown): CaseFile[] => json as CaseFile[];

export const CASES_BY_TIER: Record<CaseDifficulty, CaseFile[]> = {
  Easy: asCases(easy),
  Medium: [...asCases(mediumA), ...asCases(mediumB)],
  Hard: [...asCases(hardA), ...asCases(hardB)],
  Expert: asCases(expert),
};

export const ALL_CASES: CaseFile[] = [
  ...CASES_BY_TIER.Easy,
  ...CASES_BY_TIER.Medium,
  ...CASES_BY_TIER.Hard,
  ...CASES_BY_TIER.Expert,
];

/**
 * Murder Mystery section (31 Oct): its own ladder, separate from the
 * tier rotation above. Levels 1-6 map in bank order, then rotate —
 * the same "no repeat until exhausted, then cycle" behaviour as the
 * Expert tier. Progress is tracked under MURDER_GAME_ID, so the two
 * sections never share a level or a star.
 */
export const MURDER_CASES: CaseFile[] = asCases(murder);

export function murderCaseForLevel(level: number): CaseFile {
  const idx = ((level - 1) % MURDER_CASES.length + MURDER_CASES.length) % MURDER_CASES.length;
  return MURDER_CASES[idx];
}

export interface TierRange {
  tier: CaseDifficulty;
  start: number;
  /** Inclusive end, or null for the open-ended Expert tier. */
  end: number | null;
}

export const LADDER: TierRange[] = [
  { tier: 'Easy', start: 1, end: 15 },
  { tier: 'Medium', start: 16, end: 35 },
  { tier: 'Hard', start: 36, end: 55 },
  { tier: 'Expert', start: 56, end: null },
];

export function tierForLevel(level: number): CaseDifficulty {
  if (level <= 15) return 'Easy';
  if (level <= 35) return 'Medium';
  if (level <= 55) return 'Hard';
  return 'Expert';
}

export function tierStartForLevel(level: number): number {
  if (level <= 15) return 1;
  if (level <= 35) return 16;
  if (level <= 55) return 36;
  return 56;
}

/** Deterministic rotation: no repeat until the tier's cases are exhausted. */
export function caseForLevel(level: number): CaseFile {
  const tier = tierForLevel(level);
  const cases = CASES_BY_TIER[tier];
  const idx = (level - tierStartForLevel(level)) % cases.length;
  return cases[idx];
}

export function tierName(level: number): string {
  return tierForLevel(level);
}
