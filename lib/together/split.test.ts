import { describe, expect, it } from 'vitest';
import { ALL_CASES } from '../cases/bank';
import { sideSolves, splitCase, splittableCases } from './split';

describe('co-op case split', () => {
  it('partitions are non-overlapping and their union is the full clue set', () => {
    for (const c of ALL_CASES.slice(0, 12)) {
      const split = splitCase(c, `test|${c.id}`);
      const a = new Set(split.sideA.clueIds);
      const b = new Set(split.sideB.clueIds);
      for (const id of a) expect(b.has(id)).toBe(false);
      expect(new Set([...a, ...b])).toEqual(new Set(c.clues.map((cl) => cl.id)));
      // Suspect statements split the same way.
      const sa = new Set(split.sideA.suspectIds);
      const sb = new Set(split.sideB.suspectIds);
      for (const id of sa) expect(sb.has(id)).toBe(false);
      expect(new Set([...sa, ...sb])).toEqual(new Set(c.suspects.map((s) => s.id)));
    }
  });

  it('for splittable cases neither side alone solves', () => {
    let checked = 0;
    for (const c of ALL_CASES) {
      const split = splitCase(c, `test|${c.id}`);
      if (!split.splittable) continue;
      expect(sideSolves(c, split.sideA.clueIds)).toBe(false);
      expect(sideSolves(c, split.sideB.clueIds)).toBe(false);
      // But together they do solve (union = full set, case is valid).
      expect(sideSolves(c, [...split.sideA.clueIds, ...split.sideB.clueIds])).toBe(true);
      checked++;
    }
    expect(checked).toBeGreaterThan(0);
  });

  it('most bank cases are splittable (co-op picker never runs dry)', () => {
    const good = splittableCases(ALL_CASES, 'coop-pick');
    // Report the real ratio in the failure message if this ever regresses.
    expect(good.length).toBeGreaterThanOrEqual(Math.floor(ALL_CASES.length * 0.5));
  });

  it('split is deterministic for a given seed', () => {
    const c = ALL_CASES[0];
    expect(splitCase(c, 'seed-1')).toEqual(splitCase(c, 'seed-1'));
  });
});
