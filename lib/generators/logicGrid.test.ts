import { describe, expect, it } from 'vitest';
import {
  countSolutions,
  generateLevelPuzzle,
  generatePuzzle,
  levelSeed,
  tierForLevel,
} from './logicGrid';

describe('logic grid generator', () => {
  it('is deterministic: same seed, same puzzle', () => {
    const a = generatePuzzle('lg|tester|17', 17);
    const b = generatePuzzle('lg|tester|17', 17);
    expect(b).toEqual(a);
  });

  it('never repeats the previous level puzzle back to back', () => {
    for (let level = 1; level < 40; level++) {
      const a = generateLevelPuzzle(level, 'someone');
      const b = generateLevelPuzzle(level + 1, 'someone');
      expect(JSON.stringify(b.clues)).not.toBe(JSON.stringify(a.clues));
      expect(JSON.stringify(b.solution)).not.toBe(JSON.stringify(a.solution));
    }
  });

  it('follows the tier ladder sizes', () => {
    expect(tierForLevel(1).size).toBe(3);
    expect(tierForLevel(10).size).toBe(3);
    expect(tierForLevel(11).size).toBe(4);
    expect(tierForLevel(30).size).toBe(4);
    expect(tierForLevel(31).size).toBe(5);
    expect(tierForLevel(60).size).toBe(5);
    expect(tierForLevel(61).size).toBe(6);
    expect(tierForLevel(120).size).toBe(6);
    // Expert keeps tightening: the direct-clue cap shrinks every 10 levels.
    expect(tierForLevel(101).maxDirectShare).toBeLessThan(tierForLevel(61).maxDirectShare);
  });

  it('clue types unlock by tier', () => {
    for (let level = 1; level <= 10; level++) {
      const p = generateLevelPuzzle(level, 'types');
      expect(p.clues.every((c) => c.type === 'direct' || c.type === 'negative')).toBe(true);
    }
    const hard = generateLevelPuzzle(45, 'types');
    expect(hard.clues.some((c) => c.type === 'eitherOr' || c.type === 'relative')).toBe(true);
  });

  it(
    'generates 500 puzzles across levels 1-80, every one with exactly one solution',
    () => {
      for (let i = 0; i < 500; i++) {
        const level = 1 + (i % 80);
        const p = generateLevelPuzzle(level, `validator-${i % 5}`);
        const { count, solution } = countSolutions(p.size, p.categories, p.clues, 2);
        expect(count, `level ${level} seed ${p.seed}`).toBe(1);
        expect(solution).toEqual(p.solution);
      }
    },
    300_000,
  );

  it('levelSeed is stable and salt-sensitive', () => {
    expect(levelSeed(3, 'a')).toBe(levelSeed(3, 'a'));
    expect(levelSeed(3, 'a')).not.toBe(levelSeed(3, 'b'));
    expect(levelSeed(3, 'a')).not.toBe(levelSeed(4, 'a'));
  });
});
