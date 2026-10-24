import { describe, expect, it } from 'vitest';
import {
  generatePurple,
  purpleBotAccuracy,
  purpleParamsForLevel,
  purpleProgress,
  purpleScorePrompt,
} from './purple';

describe("don't press purple", () => {
  it('generates the right count and beat per tier, deterministically', () => {
    const a = generatePurple('s', 5);
    const b = generatePurple('s', 5);
    expect(a).toEqual(b);
    expect(a.prompts).toHaveLength(20);
    expect(a.beatMs).toBe(1400);
    expect(purpleParamsForLevel(45).count).toBe(40);
    expect(purpleParamsForLevel(80).beatMs).toBe(700);
    const violet = a.prompts.filter((p) => p === 'violet').length;
    expect(violet).toBeGreaterThan(0);
    expect(violet).toBeLessThan(a.prompts.length);
  });

  it('scores teal taps and punishes violet taps and missed teals', () => {
    expect(purpleScorePrompt('teal', true, 0, 0)).toEqual({ score: 1, mistakes: 0 });
    expect(purpleScorePrompt('teal', false, 2, 0)).toEqual({ score: 2, mistakes: 1 });
    expect(purpleScorePrompt('violet', true, 2, 0)).toEqual({ score: 2, mistakes: 1 });
    expect(purpleScorePrompt('violet', false, 2, 0)).toEqual({ score: 2, mistakes: 0 });
  });

  it('tracks progress and raises bot accuracy with level', () => {
    const g = generatePurple('s', 5);
    expect(purpleProgress(g, 10)).toBe(0.5);
    expect(purpleProgress(g, 99)).toBe(1);
    expect(purpleBotAccuracy(1)).toBeLessThan(purpleBotAccuracy(70));
  });
});
