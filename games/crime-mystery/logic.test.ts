/* Crime Mystery logic tests: splits, board, strings, votes, hints. */
import { describe, expect, it } from 'vitest';
import {
  assignSides,
  attemptsLeft,
  castVote,
  clampPos,
  defaultPins,
  exclusiveCounts,
  hintsAvailable,
  linkExists,
  MAX_ATTEMPTS,
  readProgress,
  sideOf,
  spendHint,
  tallyVotes,
  toggleLink,
  visibleClues,
  writeProgress,
} from './logic';
import { getMysteryCase } from './cases';

const vault = getMysteryCase('quiet-vault')!;

describe('sides', () => {
  it('starter is a, partner is b', () => {
    const sides = assignSides('p1', 'p2');
    expect(sides).toEqual({ p1: 'a', p2: 'b' });
    expect(sideOf(sides, 'p1')).toBe('a');
    expect(sideOf(sides, 'p2')).toBe('b');
  });

  it('solo practice defaults to a', () => {
    expect(assignSides('p1', null)).toEqual({ p1: 'a' });
    expect(sideOf(undefined, 'anyone')).toBe('a');
  });
});

describe('clue dealing', () => {
  it('each side sees own split + both, never the other side', () => {
    const a = visibleClues(vault, 'a', false).map((c) => c.id);
    const b = visibleClues(vault, 'b', false).map((c) => c.id);
    expect(a).toContain('qv-2'); // a-only
    expect(a).not.toContain('qv-3'); // b-only
    expect(b).toContain('qv-3');
    expect(b).not.toContain('qv-2');
    expect(a).toContain('qv-1'); // both
    expect(b).toContain('qv-1');
  });

  it('bonus clue is hidden until revealed, then visible to both', () => {
    expect(visibleClues(vault, 'a', false).some((c) => c.id === 'qv-x')).toBe(false);
    const a = visibleClues(vault, 'a', true);
    const b = visibleClues(vault, 'b', true);
    expect(a.some((c) => c.id === 'qv-x')).toBe(true);
    expect(b.some((c) => c.id === 'qv-x')).toBe(true);
  });

  it('exclusive counts match the a/b splits', () => {
    expect(exclusiveCounts(vault)).toEqual({ a: 2, b: 2 });
  });
});

describe('evidence board', () => {
  it('defaultPins is deterministic and inside the board', () => {
    const clues = visibleClues(vault, 'a', false);
    const p1 = defaultPins(clues);
    const p2 = defaultPins(clues);
    expect(p1).toEqual(p2);
    for (const pos of Object.values(p1)) {
      expect(pos.x).toBeGreaterThanOrEqual(0);
      expect(pos.x).toBeLessThanOrEqual(100);
      expect(pos.y).toBeGreaterThanOrEqual(0);
      expect(pos.y).toBeLessThanOrEqual(100);
    }
  });

  it('clampPos keeps pins on the board', () => {
    expect(clampPos({ x: -5, y: 120 })).toEqual({ x: 2, y: 90 });
    expect(clampPos({ x: 50, y: 50 })).toEqual({ x: 50, y: 50 });
  });
});

describe('red strings', () => {
  it('toggleLink adds then removes a link', () => {
    let links = toggleLink([], 'c1', 'c2');
    expect(links).toEqual([{ a: 'c1', b: 'c2' }]);
    expect(linkExists(links, 'c2', 'c1')).toBe(true); // order-independent
    links = toggleLink(links, 'c2', 'c1');
    expect(links).toEqual([]);
  });

  it('rejects self-links and duplicates', () => {
    expect(toggleLink([], 'c1', 'c1')).toEqual([]);
    const once = toggleLink([], 'c1', 'c2');
    expect(toggleLink(once, 'c1', 'c2')).toEqual([]);
  });
});

describe('voting', () => {
  it('waits until every voter has voted', () => {
    expect(tallyVotes({}, ['p1', 'p2'], 'X')).toBe('waiting');
    const one = castVote({}, 'p1', 'X');
    expect(tallyVotes(one, ['p1', 'p2'], 'X')).toBe('waiting');
  });

  it('solves only when BOTH name the culprit', () => {
    const bothRight = castVote(castVote({}, 'p1', 'Devang Shah'), 'p2', 'Devang Shah');
    expect(tallyVotes(bothRight, ['p1', 'p2'], 'Devang Shah')).toBe('solved');
    const oneWrong = castVote(castVote({}, 'p1', 'Devang Shah'), 'p2', 'Rhea Malhotra');
    expect(tallyVotes(oneWrong, ['p1', 'p2'], 'Devang Shah')).toBe('wrong');
  });

  it('solo practice: one correct vote solves', () => {
    const v = castVote({}, 'p1', 'Devang Shah');
    expect(tallyVotes(v, ['p1'], 'Devang Shah')).toBe('solved');
  });

  it('attempts: 1 retry then out', () => {
    expect(attemptsLeft(0)).toBe(MAX_ATTEMPTS);
    expect(attemptsLeft(1)).toBe(1);
    expect(attemptsLeft(2)).toBe(0);
  });
});

describe('hint tokens', () => {
  it('first spend reveals the bonus clue, then nudges, then empty', () => {
    const first = spendHint('quiet-vault', 0);
    expect(first.kind).toBe('bonus');
    if (first.kind === 'bonus') expect(first.clue.split).toBe('both');
    const second = spendHint('quiet-vault', 1);
    expect(second.kind).toBe('nudge');
    const third = spendHint('quiet-vault', 2);
    expect(third.kind).toBe('nudge');
    expect(spendHint('quiet-vault', 99).kind).toBe('empty');
    expect(spendHint('no-such-case', 0).kind).toBe('empty');
  });

  it('hintsAvailable clamps at zero', () => {
    expect(hintsAvailable(3, 1)).toBe(2);
    expect(hintsAvailable(1, 5)).toBe(0);
  });
});

describe('case log progress', () => {
  it('readProgress is safe without a browser', () => {
    expect(readProgress()).toEqual({});
    // write is a no-op outside the browser but returns the merged record
    expect(writeProgress('quiet-vault', 'solved')).toEqual({ 'quiet-vault': 'solved' });
  });
});
