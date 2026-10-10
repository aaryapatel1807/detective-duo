import { describe, expect, it } from 'vitest';
import { CRIME_CARDS, drawCrime } from './content';
import {
  isLastRound,
  isTimedOut,
  matchWinner,
  scoreForVerdict,
  timedRemaining,
  validAlibi,
} from './logic';

describe('alibi logic', () => {
  it('has 10 crime cards', () => {
    expect(CRIME_CARDS).toHaveLength(10);
    expect(CRIME_CARDS.every((c) => c.crime && c.time && c.place)).toBe(true);
  });

  it('draws crimes, avoiding repeats when possible', () => {
    const used = CRIME_CARDS.slice(0, 9).map((c) => c.id);
    expect(drawCrime(used).id).toBe(CRIME_CARDS[9].id);
  });

  it('validates alibi length', () => {
    expect(validAlibi('I was home alone reading the paper.')).toBe(true);
    expect(validAlibi('I was home.')).toBe(false);
  });

  it('computes timed-question clocks', () => {
    const deadline = 10_000;
    expect(timedRemaining(deadline, 4_000)).toBe(6_000);
    expect(timedRemaining(deadline, 12_000)).toBe(0);
    expect(isTimedOut(deadline, 10_000)).toBe(true);
    expect(isTimedOut(deadline, 9_999)).toBe(false);
  });

  it('scores verdicts and finds the winner', () => {
    const s1 = scoreForVerdict({}, 'int', 'crim', 'busted');
    expect(s1).toEqual({ int: 1 });
    const s2 = scoreForVerdict(s1, 'int', 'crim', 'clean');
    expect(s2).toEqual({ int: 1, crim: 1 });
    expect(matchWinner({ int: 2, crim: 1 })).toBe('int');
    expect(matchWinner({ int: 1, crim: 1 })).toBe(null);
    expect(isLastRound(3)).toBe(true);
  });
});
