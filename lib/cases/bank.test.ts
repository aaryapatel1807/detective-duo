import { describe, expect, it } from 'vitest';
import { ALL_CASES, CASES_BY_TIER, caseForLevel, tierForLevel } from './bank';
import { validateCase } from './validator';

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
    // open-ended, so its 10 cases rotate: level 66 replays case 1).
    expect(caseForLevel(56 + CASES_BY_TIER.Expert.length).id).toBe(
      CASES_BY_TIER.Expert[0].id,
    );
  });
});
