import { describe, expect, it } from 'vitest';
import {
  applyLetterGuess,
  isRoundOver,
  isWordComplete,
  letterInWord,
  matchWinner,
  roundWinner,
  HANGMAN_MAX_STRIKES,
} from './logic';

describe('hangman-duel logic', () => {
  it('detects letters in the word (case-insensitive)', () => {
    expect(letterInWord('CRIME', 'c')).toBe(true);
    expect(letterInWord('CRIME', 'Z')).toBe(false);
  });

  it('completes the word only when all letters are guessed', () => {
    expect(isWordComplete('MOON', ['M', 'O', 'N'])).toBe(true);
    expect(isWordComplete('MOON', ['M', 'O'])).toBe(false);
  });

  it('wrong guesses add a strike, correct guesses do not', () => {
    const r1 = applyLetterGuess('CRIME', [], {}, 'p1', 'Z');
    expect(r1.correct).toBe(false);
    expect(r1.strikes).toEqual({ p1: 1 });

    const r2 = applyLetterGuess('CRIME', r1.guessed, r1.strikes, 'p1', 'C');
    expect(r2.correct).toBe(true);
    expect(r2.strikes).toEqual({ p1: 1 });
  });

  it('duplicate guesses are ignored', () => {
    const r = applyLetterGuess('CRIME', ['Z'], { p1: 1 }, 'p1', 'z');
    expect(r.guessed).toEqual(['Z']);
    expect(r.strikes).toEqual({ p1: 1 });
  });

  it('fewer strikes wins the round; ties draw', () => {
    expect(roundWinner({ p1: 2, p2: 5 }, ['p1', 'p2'])).toBe('p1');
    expect(roundWinner({ p1: 3, p2: 3 }, ['p1', 'p2'])).toBe('draw');
  });

  it('fewer total strikes wins the match', () => {
    expect(matchWinner({ p1: 7, p2: 9 }, ['p1', 'p2'])).toBe('p1');
    expect(matchWinner({ p1: 4, p2: 4 }, ['p1', 'p2'])).toBe('draw');
  });

  it('round ends on a completed word or the strike limit', () => {
    expect(isRoundOver('MOON', ['M', 'O', 'N'], {}, ['p1', 'p2'])).toBe(true);
    expect(
      isRoundOver('MOON', ['M'], { p1: HANGMAN_MAX_STRIKES }, ['p1', 'p2']),
    ).toBe(true);
    expect(isRoundOver('MOON', ['M'], { p1: 2 }, ['p1', 'p2'])).toBe(false);
  });
});
