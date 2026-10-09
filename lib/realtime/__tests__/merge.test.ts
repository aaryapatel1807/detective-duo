import { describe, expect, it } from 'vitest';
import { deepMerge } from '../merge';
import { addTap, tapWinner, TAP_TARGET } from '../../../games/sample-tap/logic';

describe('deepMerge', () => {
  it('merges nested objects', () => {
    const base = { games: { a: { x: 1, y: 2 } } };
    const out = deepMerge(base, { games: { a: { y: 3 } } });
    expect(out).toEqual({ games: { a: { x: 1, y: 3 } } });
  });

  it('replaces arrays and primitives', () => {
    expect(deepMerge({ l: [1, 2] }, { l: [3] })).toEqual({ l: [3] });
    expect(deepMerge({ n: 1 }, { n: 2 })).toEqual({ n: 2 });
  });

  it('does not mutate inputs', () => {
    const base = { a: { x: 1 } };
    deepMerge(base, { a: { y: 2 } });
    expect(base).toEqual({ a: { x: 1 } });
  });
});

describe('tap duel logic', () => {
  it('no winner before target', () => {
    expect(tapWinner({ p1: TAP_TARGET - 1, p2: 5 })).toBeNull();
  });

  it('first to target wins', () => {
    expect(tapWinner({ p1: TAP_TARGET, p2: 3 })).toBe('p1');
  });

  it('addTap is immutable and increments', () => {
    const before = { p1: 2 };
    const after = addTap(before, 'p1');
    expect(after).toEqual({ p1: 3 });
    expect(before).toEqual({ p1: 2 });
    expect(addTap({}, 'p2')).toEqual({ p2: 1 });
  });
});
