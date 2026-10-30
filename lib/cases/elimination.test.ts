import { describe, expect, it } from 'vitest';
import { ALL_CASES } from './bank';
import { eliminationFor } from './elimination';
import { portraitForSuspect, SUSPECT_PORTRAIT_COUNT } from './portraits';

describe('case elimination', () => {
  const first = ALL_CASES[0];

  it('rules out exactly the suspects a pinned clue names', () => {
    const clue = first.clues[0];
    const elim = eliminationFor(first, [clue.id], []);
    expect(elim.ruledOut.map((r) => r.suspectId).sort()).toEqual([...clue.rulesOut].sort());
    for (const r of elim.ruledOut) {
      expect(r.by).toBe('clue');
      expect(r.clueId).toBe(clue.id);
      expect(r.clueText).toBe(clue.text);
    }
    expect(elim.standingIds).toEqual(
      first.suspects.filter((s) => !clue.rulesOut.includes(s.id)).map((s) => s.id),
    );
  });

  it('a pinned red herring rules out nobody', () => {
    const herring = first.redHerrings[0];
    const elim = eliminationFor(first, [herring.id], []);
    expect(elim.ruledOut).toEqual([]);
    expect(elim.standingIds).toEqual(first.suspects.map((s) => s.id));
  });

  it('a wrong accusation rules out its suspect', () => {
    const suspect = first.suspects[0];
    const elim = eliminationFor(first, [], [suspect.id]);
    expect(elim.ruledOut).toEqual([{ suspectId: suspect.id, by: 'accusation' }]);
    expect(elim.standingIds).not.toContain(suspect.id);
  });

  it('pinning every clue leaves exactly the culprit standing, in every case', () => {
    for (const c of ALL_CASES) {
      const elim = eliminationFor(
        c,
        c.clues.map((cl) => cl.id),
        [],
      );
      expect(elim.standingIds).toEqual([c.solution.culpritId]);
      expect(elim.ruledOut.some((r) => r.suspectId === c.solution.culpritId)).toBe(false);
    }
  });
});

describe('suspect portraits', () => {
  it('maps deterministically to a portrait file', () => {
    expect(portraitForSuspect('cf-hard-16', 0)).toBe(portraitForSuspect('cf-hard-16', 0));
    expect(portraitForSuspect('cf-hard-16', 0)).toMatch(/^\/suspects\/p\d{2}\.jpg$/);
  });

  it('never repeats a face within one case', () => {
    for (const c of ALL_CASES) {
      const faces = c.suspects.map((_, i) => portraitForSuspect(c.id, i));
      expect(new Set(faces).size).toBe(faces.length);
    }
  });

  it('uses every portrait across the bank', () => {
    const used = new Set<string>();
    for (const c of ALL_CASES) {
      c.suspects.forEach((_, i) => used.add(portraitForSuspect(c.id, i)));
    }
    expect(used.size).toBe(SUSPECT_PORTRAIT_COUNT);
  });
});
