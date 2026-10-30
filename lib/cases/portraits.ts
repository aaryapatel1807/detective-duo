/**
 * AI-generated imaginary suspect portraits.
 *
 * Sixteen fictional faces (public/suspects/p01.jpg … p16.jpg), sliced
 * from four generated 2x2 portrait grids. They are imaginary people —
 * no real person, no celebrity. A case's suspects get consecutive
 * faces from a per-case offset, so no two suspects in one case ever
 * share a face, while different cases rotate through the set.
 * The mapping is deterministic: the same case always shows the same
 * faces on the same suspects.
 */

export const SUSPECT_PORTRAIT_COUNT = 16;

/** FNV-1a hash, stable across runs. */
function hashSeed(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export function portraitIndexForSuspect(caseId: string, suspectIndex: number): number {
  return (hashSeed(caseId) + suspectIndex) % SUSPECT_PORTRAIT_COUNT;
}

export function portraitForSuspect(caseId: string, suspectIndex: number): string {
  const n = portraitIndexForSuspect(caseId, suspectIndex) + 1;
  return `/suspects/p${String(n).padStart(2, '0')}.jpg`;
}
