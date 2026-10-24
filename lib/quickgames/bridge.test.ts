import { describe, expect, it } from 'vitest';
import {
  bridgeBotDelayMs,
  bridgeFinished,
  bridgeNeighbors,
  bridgeProgress,
  generateBridge,
  isValidPlank,
  oneLetterOff,
  shortestLadder,
} from './bridge';

describe('the bridge', () => {
  it('counts letter differences', () => {
    expect(oneLetterOff('CAT', 'COT')).toBe(true);
    expect(oneLetterOff('CAT', 'DOG')).toBe(false);
    expect(oneLetterOff('CAT', 'CATS')).toBe(false);
  });

  it('finds the classic ladders', () => {
    expect(shortestLadder('CAT', 'DOG')).toEqual(['CAT', 'COT', 'DOT', 'DOG']);
    expect(shortestLadder('COLD', 'WARM')).toEqual(['COLD', 'CORD', 'WORD', 'WORM', 'WARM']);
    expect(shortestLadder('CAT', 'CAT')).toEqual(['CAT']);
  });

  it('generates a solvable bridge in the level band, deterministically', () => {
    const a = generateBridge('s1', 5);
    const b = generateBridge('s1', 5);
    expect(a).toEqual(b);
    expect(a.shortest).toBeGreaterThanOrEqual(2);
    expect(a.shortest).toBeLessThanOrEqual(3);
    expect(a.botPath[0]).toBe(a.start);
    expect(a.botPath[a.botPath.length - 1]).toBe(a.end);
    expect(a.botPath.length - 1).toBe(a.shortest);
    const hard = generateBridge('s2', 45);
    expect(hard.start.length).toBe(4);
    const expert = generateBridge('s3', 80);
    expect(expert.shortest).toBeGreaterThanOrEqual(5);
  });

  it('validates planks and tracks progress', () => {
    const g = generateBridge('s1', 5);
    expect(isValidPlank(g.start, 'ZZZ')).toBe(false);
    expect(isValidPlank(g.start, g.botPath[1]!)).toBe(true);
    expect(bridgeProgress(g, [])).toBe(0);
    expect(bridgeFinished(g, g.botPath)).toBe(true);
    expect(bridgeFinished(g, [g.start])).toBe(false);
  });

  it('speeds the bot up with level', () => {
    expect(bridgeBotDelayMs(1)).toBeGreaterThan(bridgeBotDelayMs(70));
  });

  it('has no duplicate neighbors', () => {
    const n = bridgeNeighbors('CAT');
    expect(new Set(n).size).toBe(n.length);
  });
});
