import { describe, expect, it } from 'vitest';
import { ALL_CASES, CASES_BY_TIER, caseForLevel, MURDER_CASES, murderCaseForLevel, tierForLevel } from './bank';
import { validateCase, survivingSuspects } from './validator';
import { MURDER_PORTRAIT_FILES, portraitForMurderSuspect } from './portraits';

describe('case bank', () => {
  it('holds at least 60 cases', () => {
    expect(ALL_CASES.length).toBeGreaterThanOrEqual(60);
  });

  it('has unique ids across the whole bank', () => {
    const ids = ALL_CASES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('passes the validator for every stored case', () => {
    const failures: string[] = [];
    for (const c of ALL_CASES) {
      const r = validateCase(c);
      if (!r.valid) failures.push(`${c.id}: ${r.errors.join('; ')}`);
    }
    expect(failures).toEqual([]);
  });

  it('matches each case to its tier label', () => {
    for (const [tier, cases] of Object.entries(CASES_BY_TIER)) {
      for (const c of cases) expect(c.difficulty).toBe(tier);
    }
  });

  it('maps levels to tiers and rotates without early repeats', () => {
    expect(tierForLevel(1)).toBe('Easy');
    expect(tierForLevel(15)).toBe('Easy');
    expect(tierForLevel(16)).toBe('Medium');
    expect(tierForLevel(35)).toBe('Medium');
    expect(tierForLevel(36)).toBe('Hard');
    expect(tierForLevel(55)).toBe('Hard');
    expect(tierForLevel(56)).toBe('Expert');
    expect(caseForLevel(1).id).toBe(CASES_BY_TIER.Easy[0].id);
    expect(caseForLevel(16).id).toBe(CASES_BY_TIER.Medium[0].id);
    expect(caseForLevel(36).id).toBe(CASES_BY_TIER.Hard[0].id);
    expect(caseForLevel(56).id).toBe(CASES_BY_TIER.Expert[0].id);
    // First full Easy rotation has no repeats.
    const easyIds = Array.from({ length: 15 }, (_, i) => caseForLevel(i + 1).id);
    expect(new Set(easyIds).size).toBe(15);
    // Past the end of a tier it cycles back to the start (Expert is
    // open-ended, so its cases rotate: level 56 + count replays case 1).
    expect(caseForLevel(56 + CASES_BY_TIER.Expert.length).id).toBe(
      CASES_BY_TIER.Expert[0].id,
    );
  });

  it('new murder cases are reachable in the ladder', () => {
    // Hard has 20 levels (36-55) over 18 cases, so the three appended
    // Hard cases land on levels 51-53; Expert is open-ended, so its
    // three appended cases land on levels 66-68. (Appending to Easy or
    // Medium would strand cases past those tiers' fixed level ranges.)
    expect(caseForLevel(51).id).toBe('cf-hard-16');
    expect(caseForLevel(52).id).toBe('cf-hard-17');
    expect(caseForLevel(53).id).toBe('cf-hard-18');
    expect(caseForLevel(66).id).toBe('cf-exp-11');
    expect(caseForLevel(67).id).toBe('cf-exp-12');
    expect(caseForLevel(68).id).toBe('cf-exp-13');
    expect(ALL_CASES.length).toBe(66);
  });
});

describe('murder mystery section', () => {
  it('holds six original murder cases, all validator-passing', () => {
    expect(MURDER_CASES.length).toBe(6);
    const failures: string[] = [];
    for (const c of MURDER_CASES) {
      const r = validateCase(c);
      if (!r.valid) failures.push(`${c.id}: ${r.errors.join('; ')}`);
    }
    expect(failures).toEqual([]);
  });

  it('keeps murder ids unique across both banks', () => {
    const ids = [...ALL_CASES.map((c) => c.id), ...MURDER_CASES.map((c) => c.id)];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('maps murder levels 1-6 in bank order, then cycles', () => {
    const ids = MURDER_CASES.map((c) => c.id);
    expect(ids).toEqual(['mm-001', 'mm-002', 'mm-003', 'mm-004', 'mm-005', 'mm-006']);
    for (let level = 1; level <= 6; level++) {
      expect(murderCaseForLevel(level).id).toBe(ids[level - 1]);
    }
    expect(murderCaseForLevel(7).id).toBe('mm-001');
  });

  it('leaves exactly the culprit standing when every clue is pinned', () => {
    for (const c of MURDER_CASES) {
      expect(survivingSuspects(c)).toEqual([c.solution.culpritId]);
    }
  });

  it('never repeats a face within a murder case', () => {
    expect(MURDER_PORTRAIT_FILES.length).toBe(20);
    for (const c of MURDER_CASES) {
      const faces = c.suspects.map((_, i) => portraitForMurderSuspect(c.id, i));
      expect(new Set(faces).size).toBe(faces.length);
    }
  });
});
