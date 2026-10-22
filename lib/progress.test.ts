import { describe, expect, it } from 'vitest';
import { computeStars, emptyProgress } from './progress';

describe('progress', () => {
  it('awards stars by hints and mistakes', () => {
    expect(computeStars(0, 0)).toBe(3);
    expect(computeStars(0, 1)).toBe(3);
    expect(computeStars(0, 2)).toBe(2);
    expect(computeStars(2, 0)).toBe(2);
    expect(computeStars(1, 3)).toBe(2);
    expect(computeStars(3, 0)).toBe(2); // 0 mistakes still earns 2 (the rule is an OR)
    expect(computeStars(0, 4)).toBe(2); // 0 hints still earns 2
    expect(computeStars(4, 4)).toBe(1); // past both limits
    expect(computeStars(5, 5)).toBe(1);
  });

  it('starts every game at level 1 with no stars', () => {
    const p = emptyProgress();
    expect(p.currentLevel).toBe(1);
    expect(p.stars).toEqual({});
  });
});
