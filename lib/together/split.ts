/**
 * Co-op Case Files: deterministic clue + suspect split.
 *
 * Each player sees a different subset of clues and a different subset
 * of suspect statements (alibi + secret). The union of both sides is
 * the full case. A split is only "solvable-together" if NEITHER side
 * alone leaves a unique survivor — otherwise one player could solve
 * without talking.
 *
 * Split algorithm: seeded shuffle, deal clues alternately, then repair
 * (move/swap clues) until neither side solves or no repair works. Some
 * cases cannot be split this way (e.g. one clue rules out everyone but
 * the culprit); those are reported unsplittable and the co-op picker
 * skips them in favour of splittable cases.
 */
import { hashSeed, mulberry32 } from '../generators/logicGrid';
import type { CaseFile } from '../cases/types';
import { survivingSuspects } from '../cases/validator';

export interface CaseSide {
  clueIds: string[];
  /** Suspects whose alibi + secret this side can read. */
  suspectIds: string[];
}

export interface CaseSplit {
  sideA: CaseSide;
  sideB: CaseSide;
  splittable: boolean;
  reason?: string;
}

/** Does this clue subset alone leave exactly the culprit standing? */
export function sideSolves(c: CaseFile, clueIds: string[]): boolean {
  const wanted = new Set(clueIds);
  const ruledOut = new Set<string>();
  for (const clue of c.clues) {
    if (!wanted.has(clue.id)) continue;
    for (const id of clue.rulesOut) ruledOut.add(id);
  }
  const survivors = c.suspects.filter((s) => !ruledOut.has(s.id)).map((s) => s.id);
  return survivors.length === 1 && survivors[0] === c.solution.culpritId;
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function splitCase(c: CaseFile, seed: string): CaseSplit {
  const rng = mulberry32(hashSeed(seed));
  const clueIds = shuffle(c.clues.map((cl) => cl.id), rng);
  const a: string[] = [];
  const b: string[] = [];
  clueIds.forEach((id, i) => (i % 2 === 0 ? a : b).push(id));

  // Repair: while a side solves alone, move a ruling-out clue across.
  // A move is accepted only if it leaves NEITHER side solving.
  for (let round = 0; round < 12; round++) {
    const aSolves = sideSolves(c, a);
    const bSolves = sideSolves(c, b);
    if (!aSolves && !bSolves) break;
    const from = aSolves ? a : b;
    const to = aSolves ? b : a;
    let fixed = false;
    for (let i = 0; i < from.length; i++) {
      const moved = from[i];
      const nextFrom = from.filter((id) => id !== moved);
      const nextTo = [...to, moved];
      const nextA = aSolves ? nextFrom : nextTo;
      const nextB = aSolves ? nextTo : nextFrom;
      if (!sideSolves(c, nextA) && !sideSolves(c, nextB) && nextA.length > 0 && nextB.length > 0) {
        from.splice(0, from.length, ...nextFrom);
        to.splice(0, to.length, ...nextTo);
        fixed = true;
        break;
      }
    }
    if (!fixed) {
      // Last resort: swap one clue each way and re-check.
      let swapped = false;
      outer: for (const x of [...a]) {
        for (const y of [...b]) {
          const nextA = a.filter((id) => id !== x).concat(y);
          const nextB = b.filter((id) => id !== y).concat(x);
          if (!sideSolves(c, nextA) && !sideSolves(c, nextB)) {
            a.splice(0, a.length, ...nextA);
            b.splice(0, b.length, ...nextB);
            swapped = true;
            break outer;
          }
        }
      }
      if (!swapped) {
        return {
          sideA: { clueIds: a, suspectIds: [] },
          sideB: { clueIds: b, suspectIds: [] },
          splittable: false,
          reason: 'no partition keeps both sides from solving alone',
        };
      }
    }
  }
  if (sideSolves(c, a) || sideSolves(c, b) || a.length === 0 || b.length === 0) {
    return {
      sideA: { clueIds: a, suspectIds: [] },
      sideB: { clueIds: b, suspectIds: [] },
      splittable: false,
      reason: 'no partition keeps both sides from solving alone',
    };
  }

  // Suspects: alternate deal; each side reads alibi+secret for its half.
  const suspectIds = shuffle(c.suspects.map((s) => s.id), rng);
  const sA: string[] = [];
  const sB: string[] = [];
  suspectIds.forEach((id, i) => (i % 2 === 0 ? sA : sB).push(id));

  return {
    sideA: { clueIds: a, suspectIds: sA },
    sideB: { clueIds: b, suspectIds: sB },
    splittable: true,
  };
}

/** Cases from a bank that CAN be split for co-op, in seed order. */
export function splittableCases(cases: CaseFile[], seed: string): CaseFile[] {
  const rng = mulberry32(hashSeed(seed));
  const shuffled = shuffle([...cases], rng);
  return shuffled.filter((c) => splitCase(c, seed).splittable);
}
