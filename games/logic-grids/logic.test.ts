import { describe, expect, it } from 'vitest';
import { ALL_GRIDS, getGrid } from './content';
import {
  allFinished,
  cycleMark,
  emptyMarks,
  formatMs,
  isSolved,
  parseSolution,
  raceWinner,
} from './logic';

describe('logic-grids logic', () => {
  it('has 5 grids (2 shared + 3 local)', () => {
    expect(ALL_GRIDS).toHaveLength(5);
    expect(getGrid('lg-1')).toBeTruthy();
    expect(getGrid('lgl-1')).toBeTruthy();
  });

  it('parses every solution into valid coordinates', () => {
    for (const g of ALL_GRIDS) {
      const pairs = parseSolution(g);
      expect(pairs.length).toBe(g.rows.length);
      for (const p of pairs) {
        expect(p.row).toBeGreaterThanOrEqual(0);
        expect(p.col).toBeGreaterThanOrEqual(0);
      }
      // each row and col used exactly once
      expect(new Set(pairs.map((p) => p.row)).size).toBe(g.rows.length);
      expect(new Set(pairs.map((p) => p.col)).size).toBe(g.rows.length);
    }
  });

  it('cycles marks empty -> yes -> no -> empty', () => {
    expect(cycleMark('empty')).toBe('yes');
    expect(cycleMark('yes')).toBe('no');
    expect(cycleMark('no')).toBe('empty');
  });

  it('detects solved and unsolved boards', () => {
    const grid = getGrid('lgl-1')!;
    const marks = emptyMarks(grid);
    expect(isSolved(marks, grid)).toBe(false);
    for (const { row, col } of parseSolution(grid)) marks[row][col] = 'yes';
    expect(isSolved(marks, grid)).toBe(true);
    marks[0][0] = marks[0][0] === 'yes' ? 'no' : 'yes'; // corrupt one cell
    const corrupted = marks.map((r) => [...r]);
    expect(isSolved(corrupted, grid)).toBe(false);
  });

  it('computes race winners and coop completion', () => {
    expect(raceWinner({})).toBe(null);
    expect(raceWinner({ a: 9000, b: 5000 })).toBe('b');
    expect(allFinished({ a: 1, b: 2 }, ['a', 'b'])).toBe(true);
    expect(allFinished({ a: 1 }, ['a', 'b'])).toBe(false);
  });

  it('formats times', () => {
    expect(formatMs(65_000)).toBe('1:05');
    expect(formatMs(9_000)).toBe('0:09');
  });
});
