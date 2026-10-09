import { describe, expect, it } from 'vitest';
import { emptyBoard, isDraw, place, winnerOf } from './logic';

describe('tic-tac-toe logic', () => {
  it('detects rows, columns and diagonals', () => {
    expect(winnerOf(['a', 'a', 'a', null, null, null, null, null, null])).toBe('a');
    expect(winnerOf(['b', null, null, 'b', null, null, 'b', null, null])).toBe('b');
    expect(winnerOf(['a', null, null, null, 'a', null, null, null, 'a'])).toBe('a');
    expect(winnerOf(['b', null, null, null, 'b', null, null, null, 'b'])).toBe('b');
    expect(winnerOf([null, null, 'a', null, 'a', null, 'a', null, null])).toBe('a');
  });

  it('returns null with no winner', () => {
    expect(winnerOf(emptyBoard())).toBe(null);
    expect(winnerOf(['a', 'b', null, null, null, null, null, null, null])).toBe(null);
  });

  it('detects draws', () => {
    const draw = ['a', 'b', 'a', 'a', 'b', 'b', 'b', 'a', 'a'] as const;
    expect(isDraw([...draw])).toBe(true);
    expect(isDraw(emptyBoard())).toBe(false);
  });

  it('places immutably and rejects taken cells', () => {
    const b = emptyBoard();
    const n = place(b, 4, 'a');
    expect(n?.[4]).toBe('a');
    expect(b[4]).toBe(null);
    expect(place(n!, 4, 'b')).toBe(null);
  });
});
