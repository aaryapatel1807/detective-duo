import { describe, expect, it } from 'vitest';
import { botPaceLabel, botProgressAt, botRaceDurationMs } from './versusBots';

describe('versus bots', () => {
  it('gets faster as levels climb, with a floor', () => {
    const easy = botRaceDurationMs(1, 's');
    const mid = botRaceDurationMs(20, 's');
    const hard = botRaceDurationMs(45, 's');
    const expert = botRaceDurationMs(200, 's');
    expect(easy).toBeGreaterThan(mid);
    expect(mid).toBeGreaterThan(hard);
    expect(hard).toBeGreaterThanOrEqual(expert);
    expect(expert).toBeGreaterThanOrEqual(30000);
  });

  it('is deterministic for the same seed, jittered across seeds', () => {
    expect(botRaceDurationMs(10, 'a')).toBe(botRaceDurationMs(10, 'a'));
    expect(botRaceDurationMs(10, 'a')).not.toBe(botRaceDurationMs(10, 'b'));
  });

  it('clamps progress to 0..1', () => {
    expect(botProgressAt(-5, 1000)).toBe(0);
    expect(botProgressAt(500, 1000)).toBe(0.5);
    expect(botProgressAt(5000, 1000)).toBe(1);
    expect(botProgressAt(10, 0)).toBe(1);
  });

  it('labels paces by tier', () => {
    expect(botPaceLabel(5)).toBe('A gentle bot');
    expect(botPaceLabel(20)).toBe('A steady bot');
    expect(botPaceLabel(45)).toBe('A quick bot');
    expect(botPaceLabel(80)).toBe('A very quick bot');
  });
});
