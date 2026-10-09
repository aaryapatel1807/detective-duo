import { describe, expect, it, beforeEach } from 'vitest';
import {
  RANKS,
  XP_AWARDS,
  awardXP,
  getXP,
  progressToNext,
  rankFor,
  XP_KEY,
} from '../xp';

// Minimal localStorage stub for node env.
const store = new Map<string, string>();
beforeEach(() => {
  store.clear();
  (globalThis as any).window = {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    },
  };
});

describe('rank ladder', () => {
  it('starts at Rookie', () => {
    expect(rankFor(0).name).toBe('Rookie');
    expect(rankFor(99).name).toBe('Rookie');
  });

  it('hits every threshold exactly', () => {
    const expected = [
      [0, 'Rookie'],
      [100, 'Observer'],
      [250, 'Sleuth'],
      [500, 'Investigator'],
      [1000, 'Detective'],
      [2000, 'Chief Inspector'],
      [99999, 'Chief Inspector'],
    ] as const;
    for (const [xp, name] of expected) {
      expect(rankFor(xp).name).toBe(name);
    }
  });

  it('has strictly increasing thresholds', () => {
    for (let i = 1; i < RANKS.length; i++) {
      expect(RANKS[i].min).toBeGreaterThan(RANKS[i - 1].min);
    }
  });
});

describe('progressToNext', () => {
  it('computes into/span/pct within a rank', () => {
    const p = progressToNext(62); // Rookie 0..100
    expect(p.rank.name).toBe('Rookie');
    expect(p.next?.name).toBe('Observer');
    expect(p.into).toBe(62);
    expect(p.span).toBe(100);
    expect(p.pct).toBeCloseTo(0.62);
  });

  it('caps at max rank', () => {
    const p = progressToNext(5000);
    expect(p.next).toBeNull();
    expect(p.pct).toBe(1);
  });
});

describe('awardXP', () => {
  it('persists and accumulates', () => {
    expect(getXP()).toBe(0);
    expect(awardXP(XP_AWARDS.duoWin)).toBe(100);
    expect(getXP()).toBe(100);
    expect(awardXP(50)).toBe(150);
  });

  it('never drops below zero', () => {
    awardXP(30);
    expect(awardXP(-1000)).toBe(0);
    expect(getXP()).toBe(0);
  });

  it('reads back what was stored', () => {
    store.set(XP_KEY, '250');
    expect(getXP()).toBe(250);
    expect(rankFor(getXP()).name).toBe('Sleuth');
  });
});
