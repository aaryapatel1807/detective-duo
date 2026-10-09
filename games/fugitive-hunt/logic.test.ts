import { describe, expect, it } from 'vitest';
import {
  adjacent,
  bandFor,
  chebyshev,
  clueFor,
  directionArrow,
  hiderMovesAfter,
} from './logic';

describe('fugitive-hunt logic', () => {
  it('computes chebyshev distance on the 8x8 grid', () => {
    expect(chebyshev(0, 0)).toBe(0);
    expect(chebyshev(0, 9)).toBe(1); // (0,0) -> (1,1)
    expect(chebyshev(0, 63)).toBe(7); // corner to corner
    expect(chebyshev(10, 26)).toBe(2); // (2,1) -> (2,3)
  });

  it('maps distance to bands', () => {
    expect(bandFor(0)).toBe('Burning');
    expect(bandFor(2)).toBe('Burning');
    expect(bandFor(3)).toBe('Hot');
    expect(bandFor(4)).toBe('Hot');
    expect(bandFor(5)).toBe('Warm');
    expect(bandFor(6)).toBe('Warm');
    expect(bandFor(7)).toBe('Cold');
  });

  it('points the arrow from the guess toward the hider', () => {
    expect(directionArrow(0, 1)).toBe('→'); // east
    expect(directionArrow(1, 0)).toBe('←'); // west
    expect(directionArrow(0, 8)).toBe('↓'); // south (row +1)
    expect(directionArrow(8, 0)).toBe('↑'); // north
    expect(directionArrow(0, 9)).toBe('↘'); // south-east
    expect(directionArrow(5, 5)).toBe('◎'); // same node
  });

  it('lists in-bounds orthogonal neighbours', () => {
    expect(adjacent(0).sort((a, b) => a - b)).toEqual([1, 8]);
    expect(adjacent(63).sort((a, b) => a - b)).toEqual([55, 62]);
    expect(adjacent(27)).toHaveLength(4);
  });

  it('detects a found fugitive', () => {
    expect(clueFor(10, 10).found).toBe(true);
    const c = clueFor(0, 63);
    expect(c.found).toBe(false);
    expect(c.band).toBe('Cold');
  });

  it('moves the hider after turns 3, 6 and 9 only', () => {
    expect(hiderMovesAfter(3)).toBe(true);
    expect(hiderMovesAfter(6)).toBe(true);
    expect(hiderMovesAfter(9)).toBe(true);
    expect(hiderMovesAfter(4)).toBe(false);
    expect(hiderMovesAfter(10)).toBe(false);
  });
});
