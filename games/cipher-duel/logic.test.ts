import { describe, expect, it } from 'vitest';
import {
  addScoredGuess,
  cipherDuelWinner,
  isValidCode,
  scoreBullsCows,
} from './logic';

describe('cipher-duel logic', () => {
  it('validates 4-unique-digit codes', () => {
    expect(isValidCode('7391')).toBe(true);
    expect(isValidCode('7731')).toBe(false); // repeated digit
    expect(isValidCode('739')).toBe(false);
    expect(isValidCode('abcd')).toBe(false);
  });

  it('scores bulls and cows', () => {
    expect(scoreBullsCows('7391', '7391')).toEqual({ bulls: 4, cows: 0 });
    expect(scoreBullsCows('7391', '1973')).toEqual({ bulls: 0, cows: 4 });
    expect(scoreBullsCows('7391', '7428')).toEqual({ bulls: 1, cows: 1 });
    expect(scoreBullsCows('7391', '0000')).toEqual({ bulls: 0, cows: 0 });
  });

  it('appends scored guesses', () => {
    const g = addScoredGuess({}, 'p1', '7391', '7428');
    expect(g.p1).toEqual([{ guess: '7428', bulls: 1, cows: 1 }]);
  });

  it('first exact guess wins', () => {
    const codes = { p1: '7391', p2: '2468' };
    const guesses = {
      p1: [{ guess: '2468', bulls: 4, cows: 0 }],
      p2: [{ guess: '0000', bulls: 0, cows: 0 }],
    };
    expect(cipherDuelWinner(codes, guesses, ['p1', 'p2'])).toBe('p1');
    expect(cipherDuelWinner(codes, {}, ['p1', 'p2'])).toBe(null);
  });
});
