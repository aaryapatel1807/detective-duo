import { describe, expect, it } from 'vitest';
import { rngFromSeed } from './rng';
import {
  botMove,
  emptyCells,
  isDraw,
  mistakeChance,
  optimalMove,
  placeMark,
  winner,
  winningLine,
  WIN_LINES,
  type Board,
  type Mark,
} from './ticTacToe';

/** A board with exactly the given marks placed, everything else empty. */
function boardWith(marks: Record<number, Mark>): Board {
  const board: Board = Array(9).fill(null);
  for (const [index, mark] of Object.entries(marks)) board[Number(index)] = mark;
  return board;
}

/** An rng that never triggers a bot mistake (mistakeChance is always < 1). */
const steadyRng = () => 0.999;

describe('ticTacToe', () => {
  it('detects a win on all 8 lines for both marks', () => {
    for (const line of WIN_LINES) {
      for (const mark of ['X', 'O'] as const) {
        const board = boardWith({ [line[0]]: mark, [line[1]]: mark, [line[2]]: mark });
        expect(winner(board)).toBe(mark);
        expect(winningLine(board)).toEqual(line);
      }
    }
    expect(winner(boardWith({}))).toBe(null);
    expect(winningLine(boardWith({ 0: 'X', 1: 'X' }))).toBe(null);
  });

  it('detects a draw on a full board with no winner, and not before', () => {
    // X O X / X O O / O X X — every line mixed, board full.
    const drawn = boardWith({
      0: 'X', 1: 'O', 2: 'X',
      3: 'X', 4: 'O', 5: 'O',
      6: 'O', 7: 'X', 8: 'X',
    });
    expect(winner(drawn)).toBe(null);
    expect(isDraw(drawn)).toBe(true);
    expect(emptyCells(drawn)).toEqual([]);
    // Same board minus one mark: full-board condition fails, so no draw.
    const notFull = [...drawn];
    notFull[8] = null;
    expect(isDraw(notFull)).toBe(false);
    // A full board with a winner is a win, not a draw.
    const won = boardWith({
      0: 'X', 1: 'O', 2: 'X',
      3: 'O', 4: 'X', 5: 'O',
      6: 'O', 7: 'X', 8: 'X',
    });
    expect(winner(won)).toBe('X');
    expect(isDraw(won)).toBe(false);
  });

  it('the bot takes a win when one is available', () => {
    // O O _ / X X _ / _ _ _ — O wins at 2 (X also threatens 5, but the
    // win comes first).
    const board = boardWith({ 0: 'O', 1: 'O', 3: 'X', 4: 'X' });
    expect(optimalMove(board, 'O')).toBe(2);
    expect(botMove(board, 'O', 1, steadyRng)).toBe(2);
    expect(botMove(board, 'O', 70, steadyRng)).toBe(2);
  });

  it('the bot blocks an opponent win when it has no win of its own', () => {
    // X X _ / O _ _ / _ _ O — X wins at 2, O has no winning move.
    const board = boardWith({ 0: 'X', 1: 'X', 3: 'O', 8: 'O' });
    expect(optimalMove(board, 'O')).toBe(2);
    expect(botMove(board, 'O', 1, steadyRng)).toBe(2);
  });

  it('the bot is not perfect at level 1, but is at Expert', () => {
    // O O _ / X _ _ / _ _ X — 2 is the only winning move, so it is
    // the unique optimal move for O.
    const board = boardWith({ 0: 'O', 1: 'O', 3: 'X', 8: 'X' });
    expect(optimalMove(board, 'O')).toBe(2);
    expect(mistakeChance(1)).toBeGreaterThan(0);
    expect(mistakeChance(70)).toBe(0);
    const lowLevelMoves = new Set<number>();
    for (let i = 0; i < 200; i++) {
      lowLevelMoves.add(botMove(board, 'O', 1, rngFromSeed(`low-${i}`)));
    }
    // Over many seeded games the level-1 bot sometimes deviates from
    // its only winning move — it can be beaten.
    expect([...lowLevelMoves].some((m) => m !== 2)).toBe(true);
    const expertMoves = new Set<number>();
    for (let i = 0; i < 50; i++) {
      expertMoves.add(botMove(board, 'O', 70, rngFromSeed(`expert-${i}`)));
    }
    expect([...expertMoves]).toEqual([2]);
  });

  it('rejects an illegal move on an occupied cell and leaves the board untouched', () => {
    const board = boardWith({ 4: 'X' });
    expect(placeMark(board, 4, 'O')).toBe(null);
    expect(board).toEqual(boardWith({ 4: 'X' }));
    expect(placeMark(board, -1, 'O')).toBe(null);
    expect(placeMark(board, 9, 'O')).toBe(null);
    const next = placeMark(board, 0, 'O');
    expect(next).toEqual(boardWith({ 0: 'O', 4: 'X' }));
    // The original board is untouched — moves are immutable.
    expect(board).toEqual(boardWith({ 4: 'X' }));
  });
});
