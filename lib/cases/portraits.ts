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

/**
 * Murder Mystery portraits (31 Oct): the same sixteen faces plus four
 * new ones (public/suspects/m01.jpg … m04.jpg, made for this section).
 * A SEPARATE pool and function, so the existing cases keep exactly the
 * faces they have today — only murder cases draw from the twenty.
 * Twenty faces ≥ the largest murder case (6 suspects), so no case
 * repeats a face within itself.
 */
export const MURDER_PORTRAIT_FILES: string[] = [
  ...Array.from({ length: 16 }, (_, i) => `/suspects/p${String(i + 1).padStart(2, '0')}.jpg`),
  ...Array.from({ length: 4 }, (_, i) => `/suspects/m${String(i + 1).padStart(2, '0')}.jpg`),
];

export function portraitForMurderSuspect(caseId: string, suspectIndex: number): string {
  return MURDER_PORTRAIT_FILES[
    (hashSeed(caseId) + suspectIndex) % MURDER_PORTRAIT_FILES.length
  ];
}
