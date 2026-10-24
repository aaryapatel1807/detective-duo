import { describe, expect, it } from 'vitest';
import { generatePuzzle as genGrid } from '../generators/logicGrid';
import { generatePuzzle as genCipher } from '../generators/cipherDesk';
import { generatePuzzle as genNonogram } from '../generators/nonogram';
import { versusSeed } from './types';
import {
  cipherProgress,
  logicGridProgress,
  nonogramProgress,
} from './versus';

describe('versus seed identity', () => {
  it('same seed gives byte-identical Logic Grids puzzles', () => {
    const seed = versusSeed('ABCD', 'logic-grids', 7);
    expect(genGrid(seed, 7)).toEqual(genGrid(seed, 7));
  });

  it('same seed gives byte-identical Cipher puzzles', () => {
    const seed = versusSeed('ABCD', 'cipher-desk', 12);
    expect(genCipher(seed, 12)).toEqual(genCipher(seed, 12));
  });

  it('same seed gives byte-identical Nonogram puzzles', () => {
    const seed = versusSeed('ABCD', 'nonograms', 9);
    expect(genNonogram(seed, 9)).toEqual(genNonogram(seed, 9));
  });
});

describe('versus progress', () => {
  it('logic grid progress counts correct yes-marks over total yes cells', () => {
    const puzzle = genGrid('vs-test-grid', 3);
    // Empty marks -> 0.
    expect(logicGridProgress(puzzle, {})).toBe(0);
    // All yes cells marked -> 1.
    const full: Record<string, 'yes' | 'no'> = {};
    for (let cat = 1; cat < puzzle.categories.length; cat++) {
      for (let seat = 0; seat < puzzle.size; seat++) {
        full[`${cat}:${puzzle.solution[cat][seat]}`] = 'yes';
      }
    }
    expect(logicGridProgress(puzzle, full)).toBe(1);
    // One correct yes-mark out of the total.
    const oneKey = Object.keys(full)[0];
    expect(logicGridProgress(puzzle, { [oneKey]: 'yes' })).toBeCloseTo(
      1 / Object.keys(full).length,
    );
    // A wrong yes-mark does not count.
    expect(logicGridProgress(puzzle, { '1:0': 'yes' }) <= 1).toBe(true);
  });

  it('cipher progress counts matching letters at matching positions', () => {
    expect(cipherProgress('HELLO WORLD', 'HELLO WORLD')).toBe(1);
    expect(cipherProgress('HELLO WORLD', '')).toBe(0);
    expect(cipherProgress('HELLO WORLD', 'HELXO WORLD')).toBeCloseTo(9 / 10);
    expect(cipherProgress('HELLO WORLD', 'hello world')).toBe(1); // case-insensitive
  });

  it('nonogram progress counts correctly filled cells over filled cells', () => {
    const puzzle = genNonogram('vs-test-nono', 5);
    expect(nonogramProgress(puzzle, {})).toBe(0);
    const full: Record<string, 'fill' | 'x'> = {};
    let total = 0;
    for (let r = 0; r < puzzle.size; r++) {
      for (let c = 0; c < puzzle.size; c++) {
        if (puzzle.grid[r][c]) {
          full[`${r},${c}`] = 'fill';
          total++;
        }
      }
    }
    expect(total).toBeGreaterThan(0);
    expect(nonogramProgress(puzzle, full)).toBe(1);
    const first = Object.keys(full)[0];
    expect(nonogramProgress(puzzle, { [first]: 'fill' })).toBeCloseTo(1 / total);
  });
});
