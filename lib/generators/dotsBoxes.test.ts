import { describe, expect, it } from 'vitest';
import {
  chainSizes,
  chooseBotMove,
  claimEdge,
  emptyBoard,
  isFull,
  legalEdges,
  paramsForLevel,
  score,
} from './dotsBoxes';
import { rngFromSeed } from './rng';

describe('dotsBoxes params', () => {
  it('grows the grid with level and sharpens the bot', () => {
    expect(paramsForLevel(1)).toEqual({ size: 3, botSkill: 'easy' });
    expect(paramsForLevel(10).size).toBe(4);
    expect(paramsForLevel(30).size).toBe(5);
    expect(paramsForLevel(60).size).toBe(7);
    expect(paramsForLevel(100).size).toBe(8);
    expect(paramsForLevel(100).botSkill).toBe('sharp');
  });
});

describe('dotsBoxes moves', () => {
  it('claims an edge, completes a box, and refuses repeats', () => {
    let b = emptyBoard(2);
    // Box (0,0): top, left, bottom drawn; right edge completes it.
    b = claimEdge(b, 0, { kind: 'h', r: 0, c: 0 }).board;
    b = claimEdge(b, 0, { kind: 'v', r: 0, c: 0 }).board;
    b = claimEdge(b, 0, { kind: 'h', r: 1, c: 0 }).board;
    const res = claimEdge(b, 0, { kind: 'v', r: 0, c: 1 });
    expect(res.valid).toBe(true);
    expect(res.completed).toEqual([[0, 0]]);
    expect(res.board.owner[0][0]).toBe(0);
    expect(claimEdge(res.board, 1, { kind: 'v', r: 0, c: 1 }).valid).toBe(false);
  });

  it('counts a chain of two 3-sided boxes', () => {
    let b = emptyBoard(2);
    const edges = [
      { kind: 'h', r: 0, c: 0 },
      { kind: 'v', r: 0, c: 0 },
      { kind: 'h', r: 1, c: 0 },
      { kind: 'h', r: 0, c: 1 },
      { kind: 'h', r: 1, c: 1 },
      { kind: 'v', r: 0, c: 2 },
    ] as const;
    for (const e of edges) b = claimEdge(b, 0, e).board;
    expect(chainSizes(b)).toEqual([2]);
  });

  it('bot takes a free box instead of playing elsewhere', () => {
    let b = emptyBoard(2);
    for (const e of [
      { kind: 'h', r: 0, c: 0 },
      { kind: 'v', r: 0, c: 0 },
      { kind: 'h', r: 1, c: 0 },
    ] as const) {
      b = claimEdge(b, 0, e).board;
    }
    const move = chooseBotMove(b, 1, 'sharp', rngFromSeed('free-box'));
    expect(move).toEqual({ kind: 'v', r: 0, c: 1 });
  });
});

describe('dotsBoxes bot games', () => {
  function playGame(size: number, seed: string): { board: ReturnType<typeof emptyBoard>; moves: number } {
    let b = emptyBoard(size);
    let turn: 0 | 1 = 0;
    const rng = rngFromSeed(seed);
    let moves = 0;
    while (!isFull(b) && moves < size * size * 4) {
      const skill = turn === 0 ? 'sharp' : 'fair';
      const move = chooseBotMove(b, turn, skill, rng);
      expect(move).not.toBeNull();
      const legal = legalEdges(b).some(
        (e) => e.kind === move!.kind && e.r === move!.r && e.c === move!.c,
      );
      expect(legal).toBe(true);
      const res = claimEdge(b, turn, move!);
      expect(res.valid).toBe(true);
      b = res.board;
      moves++;
      if (res.completed.length === 0) turn = turn === 0 ? 1 : 0;
    }
    return { board: b, moves };
  }

  it('bot-vs-bot games always finish with every box claimed', () => {
    for (const [size, seed] of [
      [3, 'g3'],
      [4, 'g4'],
      [5, 'g5'],
    ] as const) {
      const { board } = playGame(size, seed);
      expect(isFull(board)).toBe(true);
      const [a, c] = score(board);
      expect(a + c).toBe(size * size);
    }
  });

  it('is deterministic for the same seed', () => {
    const a = playGame(4, 'det');
    const b = playGame(4, 'det');
    expect(JSON.stringify(a.board)).toBe(JSON.stringify(b.board));
    expect(a.moves).toBe(b.moves);
  });
});
