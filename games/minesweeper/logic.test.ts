import { describe, expect, it } from 'vitest';
import {
  countFlags,
  createBoard,
  isWin,
  openCell,
  openedCount,
  toggleMark,
  totalMines,
} from './logic';

function seqRng() {
  let i = 0;
  return () => {
    i += 1;
    return (i * 0.6180339887) % 1;
  };
}

describe('minesweeper', () => {
  it('places the right number of mines and keeps the first click safe', () => {
    const board = createBoard(9, 9, 10, 40, seqRng());
    expect(totalMines(board)).toBe(10);
    expect(board[40].mine).toBe(false);
    // neighbours of 40 are also safe
    const r = Math.floor(40 / 9);
    const c = 40 % 9;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < 9 && nc >= 0 && nc < 9) {
          expect(board[nr * 9 + nc].mine).toBe(false);
        }
      }
    }
  });

  it('computes adjacency counts correctly', () => {
    // 3x3 board, rng 0.99 => no shuffle => the single mine lands on candidate 0.
    const board = createBoard(3, 3, 1, 8, () => 0.99);
    expect(totalMines(board)).toBe(1);
    expect(board[0].mine).toBe(true);
    expect(board[4].adj).toBe(1); // centre touches the mine
    expect(board[8].adj).toBe(0); // far corner is clear
  });

  it('flood-fills open cells through zero-adjacency areas', () => {
    // empty 4x4 board (0 mines): one open reveals everything
    const board = createBoard(4, 4, 0, 5, seqRng());
    const next = openCell(board, 4, 4, 5);
    expect(openedCount(next)).toBe(16);
    expect(isWin(next)).toBe(true);
  });

  it('does not open flagged cells', () => {
    const board = createBoard(4, 4, 0, 0, seqRng());
    const flagged = toggleMark(board, 7);
    expect(flagged[7].mark).toBe('flag');
    expect(countFlags(flagged)).toBe(1);
    const next = openCell(flagged, 4, 4, 7);
    expect(next[7].open).toBe(false);
  });

  it('cycles marks: none -> flag -> question -> none', () => {
    const board = createBoard(4, 4, 0, 0, seqRng());
    const a = toggleMark(board, 3);
    const b = toggleMark(a, 3);
    const c = toggleMark(b, 3);
    expect(a[3].mark).toBe('flag');
    expect(b[3].mark).toBe('question');
    expect(c[3].mark).toBe('none');
  });

  it('isWin is false while safe cells remain closed', () => {
    const board = createBoard(4, 4, 1, 0, seqRng());
    expect(isWin(board)).toBe(false);
  });
});
