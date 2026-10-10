import { describe, expect, it } from 'vitest';
import {
  CASES,
  cluesFor,
  validateCaseFile,
  type CaseFile,
} from '../cases';

describe('case schema validation', () => {
  it('every bank case is valid', () => {
    for (const c of CASES) {
      expect(validateCaseFile(c), `case ${c.id}`).toEqual([]);
    }
  });

  it('bank has at least 2 cases', () => {
    expect(CASES.length).toBeGreaterThanOrEqual(2);
  });

  it('culprit is always one of the suspects', () => {
    for (const c of CASES) {
      expect(c.suspects.map((s) => s.name)).toContain(c.culprit);
    }
  });

  it('clue ids are unique per case', () => {
    for (const c of CASES) {
      const ids = c.clues.map((cl) => cl.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});

describe('validateCaseFile catches bad cases', () => {
  const good: CaseFile = CASES[0];

  it('rejects unknown culprit', () => {
    expect(validateCaseFile({ ...good, culprit: 'Nobody' })).toContain(
      'culprit "Nobody" is not a suspect',
    );
  });

  it('rejects missing asymmetric clues', () => {
    const noSplit = {
      ...good,
      clues: good.clues.map((cl) => ({ ...cl, split: 'both' as const })),
    };
    expect(validateCaseFile(noSplit)).toContain(
      'needs at least one a-only and one b-only clue for asymmetric dealing',
    );
  });

  it('rejects bad split values', () => {
    const bad = {
      ...good,
      clues: [{ id: 'x', text: 'y', split: 'everyone' } as any],
    };
    expect(validateCaseFile(bad).some((e) => e.includes('bad split'))).toBe(true);
  });
});

describe('cluesFor', () => {
  it('deals asymmetric clues plus shared ones', () => {
    const c = CASES[0];
    const a = cluesFor(c, 'a');
    const b = cluesFor(c, 'b');
    expect(a.every((cl) => cl.split === 'a' || cl.split === 'both')).toBe(true);
    expect(b.every((cl) => cl.split === 'b' || cl.split === 'both')).toBe(true);
    expect(a.some((cl) => cl.split === 'a')).toBe(true);
    expect(b.some((cl) => cl.split === 'b')).toBe(true);
    // union of both sides covers everything
    const union = new Set([...a, ...b].map((cl) => cl.id));
    expect(union.size).toBe(c.clues.length);
  });
});
