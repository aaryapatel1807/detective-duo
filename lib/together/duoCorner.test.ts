import { describe, expect, it } from 'vitest';
import {
  dotsNextTurn,
  dotsResult,
  knowMePhase,
  liarPhase,
  sketchDrawerUid,
  tallyAfter,
} from './duoCorner';
import { claimEdge, emptyBoard } from '../generators/dotsBoxes';

describe('duoCorner helpers', () => {
  it('dots turn passes unless a box was closed', () => {
    expect(dotsNextTurn(1, 'a', ['a', 'b'])).toBe('a');
    expect(dotsNextTurn(0, 'a', ['a', 'b'])).toBe('b');
    expect(dotsNextTurn(0, 'b', ['a', 'b'])).toBe('a');
  });

  it('dots result is unfinished, tied, or won', () => {
    const b = emptyBoard(2);
    expect(dotsResult(b, ['a', 'b']).finished).toBe(false);
    // Fill 2x2: alternate claims, owners split 2-2 for a tie.
    let board = b;
    const moves = [
      { kind: 'h', r: 0, c: 0 },
      { kind: 'h', r: 0, c: 1 },
      { kind: 'v', r: 0, c: 0 },
      { kind: 'v', r: 0, c: 2 },
      { kind: 'h', r: 1, c: 0 },
      { kind: 'h', r: 1, c: 1 },
      { kind: 'v', r: 1, c: 0 },
      { kind: 'v', r: 1, c: 2 },
      { kind: 'h', r: 2, c: 0 },
      { kind: 'h', r: 2, c: 1 },
      { kind: 'v', r: 0, c: 1 },
      { kind: 'v', r: 1, c: 1 },
    ] as const;
    let turn: 0 | 1 = 0;
    for (const e of moves) {
      const res = claimEdge(board, turn, e);
      board = res.board;
      if (res.completed.length === 0) turn = turn === 0 ? 1 : 0;
    }
    const r = dotsResult(board, ['a', 'b']);
    expect(r.finished).toBe(true);
    // The last two middle edges close all four boxes for player 0.
    expect(r.tie).toBe(false);
    expect(r.winnerUid).toBe('a');
  });

  it('know-me phases gate on both players, async-safe', () => {
    expect(knowMePhase({}, {}, ['a', 'b'], 6)).toBe('answering');
    const answers = { a: { q1: 'x', q2: 'x', q3: 'x', q4: 'x', q5: 'x', q6: 'x' } };
    expect(knowMePhase(answers, {}, ['a', 'b'], 6)).toBe('answering');
    const both = {
      a: { q1: 'x', q2: 'x', q3: 'x', q4: 'x', q5: 'x', q6: 'x' },
      b: { q1: 'y', q2: 'y', q3: 'y', q4: 'y', q5: 'y', q6: 'y' },
    };
    expect(knowMePhase(both, {}, ['a', 'b'], 6)).toBe('guessing');
    expect(knowMePhase(both, both, ['a', 'b'], 6)).toBe('reveal');
  });

  it('liar phases follow writing, asking, picking, revealed', () => {
    const base = { writerUid: 'a', statements: [], lieIndex: null as number | null, questions: [], guessIndex: null as number | null };
    expect(liarPhase(base)).toBe('writing');
    expect(liarPhase({ ...base, statements: ['1', '2', '3'], lieIndex: 1 })).toBe('asking');
    expect(
      liarPhase({
        ...base,
        statements: ['1', '2', '3'],
        lieIndex: 1,
        questions: [
          { text: 'q1', answer: 'yes' },
          { text: 'q2', answer: 'no' },
          { text: 'q3', answer: 'yes' },
        ],
      }),
    ).toBe('picking');
    expect(
      liarPhase({ ...base, statements: ['1', '2', '3'], lieIndex: 1, guessIndex: 2 }),
    ).toBe('revealed');
  });

  it('sketch drawer alternates by round', () => {
    expect(sketchDrawerUid(0, 'a', 'b')).toBe('a');
    expect(sketchDrawerUid(1, 'a', 'b')).toBe('b');
    expect(sketchDrawerUid(2, 'a', 'b')).toBe('a');
  });

  it('tally counts round wins per player, and ignores a null winner', () => {
    expect(tallyAfter(undefined, 'a')).toEqual({ a: 1 });
    expect(tallyAfter({ a: 1 }, 'b')).toEqual({ a: 1, b: 1 });
    expect(tallyAfter({ a: 2 }, 'a')).toEqual({ a: 3 });
    expect(tallyAfter({ a: 2 }, null)).toEqual({ a: 2 });
  });
});
