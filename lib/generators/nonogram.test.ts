import { describe, expect, it } from 'vitest';
import {
  cluesFromGrid,
  countSolutions,
  generateLevelPuzzle,
  generatePuzzle,
  levelSeed,
  optionsForClue,
  sizeForLevel,
  tierName,
} from './nonogram';

describe('nonogram solver', () => {
  it('derives clues and counts exactly one solution for a known picture', () => {
    // Staircase picture: provably unique (see staircasePicture).
    const grid = [
      [true, true, true],
      [true, true, false],
      [true, false, false],
    ];
    const { rowClues, colClues } = cluesFromGrid(grid);
    expect(rowClues).toEqual([[3], [2], [1]]);
    expect(colClues).toEqual([[3], [2], [1]]);
    expect(countSolutions(rowClues, colClues, 3, 2)).toBe(1);
  });

  it('detects ambiguous clue sets (count capped at 2)', () => {
    // One filled cell per row and column on 2x2: the two diagonals.
    expect(countSolutions([[1], [1]], [[1], [1]], 2, 2)).toBe(2);
    // Empty clues on 2x2: only the all-blank grid fits.
    expect(countSolutions([[], []], [[], []], 2, 2)).toBe(1);
  });

  it('optionsForClue enumerates placements exactly', () => {
    expect(optionsForClue([], 5)).toEqual([0]);
    expect(optionsForClue([5], 5)).toEqual([0b11111]);
    expect(optionsForClue([1], 3).sort((a, b) => a - b)).toEqual([0b001, 0b010, 0b100]);
    expect(optionsForClue([1, 1], 4)).toEqual([0b0101, 0b1001, 0b1010]);
  });
});

describe('nonogram generator', () => {
  it('is deterministic: same seed, same puzzle', () => {
    const a = generatePuzzle('ng|tester|17', 17);
    const b = generatePuzzle('ng|tester|17', 17);
    expect(b).toEqual(a);
  });

  it('levelSeed is stable and salt-sensitive', () => {
    expect(levelSeed(3, 'a')).toBe(levelSeed(3, 'a'));
    expect(levelSeed(3, 'a')).not.toBe(levelSeed(3, 'b'));
    expect(levelSeed(3, 'a')).not.toBe(levelSeed(4, 'a'));
  });

  it('size grows 5x5 -> 20x20 and never shrinks', () => {
    expect(sizeForLevel(1)).toBe(5);
    expect(sizeForLevel(10)).toBe(9);
    expect(sizeForLevel(11)).toBe(10);
    expect(sizeForLevel(30)).toBe(14);
    expect(sizeForLevel(31)).toBe(15);
    expect(sizeForLevel(60)).toBe(17);
    expect(sizeForLevel(61)).toBe(18);
    expect(sizeForLevel(81)).toBe(20);
    expect(sizeForLevel(200)).toBe(20);
    let prev = 0;
    for (let l = 1; l <= 120; l++) {
      expect(sizeForLevel(l)).toBeGreaterThanOrEqual(prev);
      prev = sizeForLevel(l);
    }
    expect(tierName(1)).toBe('Easy');
    expect(tierName(30)).toBe('Medium');
    expect(tierName(60)).toBe('Hard');
    expect(tierName(61)).toBe('Expert');
  });

  it(
    'generates 200+ puzzles across sizes 5x5-20x20, each with exactly one solution',
    () => {
      // Levels chosen so every size from 5 to 20 is covered several times.
      const levels: number[] = [];
      const bySize = new Map<number, number[]>();
      for (let l = 1; l <= 120; l++) {
        const s = sizeForLevel(l);
        if (!bySize.has(s)) bySize.set(s, []);
        bySize.get(s)!.push(l);
      }
      const counts: Record<number, number> = {
        5: 20, 6: 20, 7: 20, 8: 20, 9: 20,
        10: 12, 11: 12, 12: 12, 13: 12, 14: 12,
        15: 8, 16: 8, 17: 8, 18: 6, 19: 6, 20: 6,
      };
      for (const [size, want] of Object.entries(counts)) {
        const pool = bySize.get(Number(size))!;
        for (let i = 0; i < want; i++) {
          levels.push(pool[i % pool.length]);
        }
      }
      expect(levels.length).toBeGreaterThanOrEqual(200);
      let checked = 0;
      for (let i = 0; i < levels.length; i++) {
        const p = generateLevelPuzzle(levels[i], `validator-${i % 7}`);
        expect(p.size).toBeGreaterThanOrEqual(5);
        expect(p.size).toBeLessThanOrEqual(20);
        // Clues match the grid, and the solver proves uniqueness.
        expect(cluesFromGrid(p.grid)).toEqual({
          rowClues: p.rowClues,
          colClues: p.colClues,
        });
        expect(
          countSolutions(p.rowClues, p.colClues, p.size, 2),
          `level ${levels[i]} size ${p.size} seed ${p.seed}`,
        ).toBe(1);
        checked++;
      }
      expect(checked).toBeGreaterThanOrEqual(200);
    },
    600_000,
  );
});
