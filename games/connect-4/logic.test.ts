import { describe, expect, it } from 'vitest';
import { drop, dropRow, emptyBoard, isFull, winnerOf } from './logic';

describe('connect-4 logic', () => {
  it('drops to the lowest empty row', () => {
    expect(dropRow(emptyBoard(), 3)).toBe(5);
    const b = drop(drop(emptyBoard(), 3, 'a')!, 3, 'b')!;
    expect(b[5][3]).toBe('a');
    expect(b[4][3]).toBe('b');
  });

  it('rejects a full column', () => {
    let b = emptyBoard();
    for (let i = 0; i < 6; i++) b = drop(b, 0, i % 2 === 0 ? 'a' : 'b')!;
    expect(drop(b, 0, 'a')).toBe(null);
    expect(dropRow(b, 0)).toBe(-1);
  });

  it('detects horizontal, vertical and diagonal fours', () => {
    let b = emptyBoard();
    for (let c = 0; c < 4; c++) b = drop(b, c, 'a')!;
    expect(winnerOf(b)).toBe('a');

    b = emptyBoard();
    for (let i = 0; i < 4; i++) b = drop(b, 2, 'b')!;
    expect(winnerOf(b)).toBe('b');

    b = emptyBoard();
    // diagonal ↗ : fill support columns first
    b = drop(b, 0, 'a')!;
    b = drop(b, 1, 'b')!; b = drop(b, 1, 'a')!;
    b = drop(b, 2, 'b')!; b = drop(b, 2, 'b')!; b = drop(b, 2, 'a')!;
    b = drop(b, 3, 'b')!; b = drop(b, 3, 'b')!; b = drop(b, 3, 'b')!; b = drop(b, 3, 'a')!;
    expect(winnerOf(b)).toBe('a');
  });

  it('detects a full board', () => {
    expect(isFull(emptyBoard())).toBe(false);
  });
});
