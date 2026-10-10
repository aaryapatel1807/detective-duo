/* Crime Mystery case files — flagship bank.
 *
 * The 2 bank cases live in lib/content/cases.ts (read-only import).
 * 7 more are authored under ./cases/ (one file per case, for transport),
 * assembled here in escalating difficulty:
 *   easy   — cases 3-4 (5-6 clues, one clean chain, one red herring)
 *   medium — cases 5-6 (7-8 clues, alibis that need combining)
 *   hard   — cases 7-9 (10-12 clues, layered red herrings, tangled alibis)
 *
 * Fair-play rule (CONTRACT.md): the culprit must be uniquely deducible from
 * the UNION of all clues + suspects. Splits force the talking: every case
 * has >= 1 'a'-only and >= 1 'b'-only clue, and at least one red herring
 * that the clues themselves defuse.
 *
 * Art: suspect portraits and evidence polaroids are inlined as data URIs
 * (grayscale WebP) so the bank stays a single text payload.
 */

import {
  CASES as BANK_CASES,
  validateCaseFile,
  type CaseFile,
} from '../../lib/content/cases';
import CASE_3 from './cases/case-3';
import CASE_4 from './cases/case-4';
import CASE_5 from './cases/case-5';
import CASE_6 from './cases/case-6';
import CASE_7 from './cases/case-7';
import CASE_8 from './cases/case-8';
import CASE_9 from './cases/case-9';

export type { CaseFile };
export { validateCaseFile };

const NEW_CASES: CaseFile[] = [CASE_3, CASE_4, CASE_5, CASE_6, CASE_7, CASE_8, CASE_9];

/** All playable cases: the 2 bank starters + the 7 authored cases, in escalating order. */
export const ALL_CASES: CaseFile[] = [...BANK_CASES, ...NEW_CASES];

export function getMysteryCase(id: string): CaseFile | undefined {
  return ALL_CASES.find((c) => c.id === id);
}
