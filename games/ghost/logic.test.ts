import { describe, expect, it } from 'vitest';
import {
  adjudicateChallenge,
  isCompleteWord,
  isViablePrefix,
  matchLoser,
  matchWinner,
  playLetter,
} from './logic';

const BANK = ['CRIME', 'CRIMSON', 'GHOST', 'MOON'];

describe('ghost logic', () => {
  it('recognizes complete words (4+ letters)', () => {
    expect(isCompleteWord('CRIME', BANK)).toBe(true);
    expect(isCompleteWord('CRI', BANK)).toBe(false); // too short
    expect(isCompleteWord('CRIM', BANK)).toBe(false); // prefix, not a word
  });

  it('recognizes viable prefixes', () => {
    expect(isViablePrefix('CRI', BANK)).toBe(true);
    expect(isViablePrefix('XYZ', BANK)).toBe(false);
    expect(isViablePrefix('', BANK)).toBe(true);
  });

  it('completing a word loses the round immediately', () => {
    const r = playLetter('CRIM', 'E', BANK);
    expect(r.fragment).toBe('CRIME');
    expect(r.outcome).toBe('mover-loses-round');
  });

  it('safe letters continue the round', () => {
    const r = playLetter('CRI', 'M', BANK);
    expect(r.fragment).toBe('CRIM');
    expect(r.outcome).toBe('continue');
  });

  it('a failed challenge loses for the challenger', () => {
    // "CRIM" can still become CRIME/CRIMSON
    expect(adjudicateChallenge('CRIM', BANK)).toBe('challenger-loses');
  });

  it('a good challenge catches the bluffer', () => {
    expect(adjudicateChallenge('CRX', BANK)).toBe('mover-loses');
  });

  it('first to 2 round losses loses the match', () => {
    expect(matchLoser({ p1: 1, p2: 0 }, ['p1', 'p2'])).toBe(null);
    expect(matchLoser({ p1: 2, p2: 0 }, ['p1', 'p2'])).toBe('p1');
    expect(matchWinner({ p1: 2, p2: 0 }, ['p1', 'p2'])).toBe('p2');
  });
});
