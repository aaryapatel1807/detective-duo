import { describe, expect, it } from 'vitest';
import { DRAW_WORDS, randomWord } from './words';
import {
  DRAWER_SCORE,
  DRAW_SECONDS,
  guesserScore,
  isCorrectGuess,
  normalizeGuess,
  secondsLeft,
} from './logic';

describe('draw-guess logic', () => {
  it('ships 40 noir words', () => {
    expect(DRAW_WORDS).toHaveLength(40);
    expect(new Set(DRAW_WORDS).size).toBe(40);
    expect(randomWord(() => 0)).toBe(DRAW_WORDS[0]);
  });

  it('normalizes guesses', () => {
    expect(normalizeGuess('  Getaway   CAR ')).toBe('getaway car');
    expect(normalizeGuess('FEDORA')).toBe('fedora');
  });

  it('matches guesses case- and space-insensitively', () => {
    expect(isCorrectGuess('getaway  car', 'Getaway Car')).toBe(true);
    expect(isCorrectGuess('fedora', 'trenchcoat')).toBe(false);
    expect(isCorrectGuess('', '')).toBe(false);
  });

  it('scores the guesser with a time bonus', () => {
    expect(guesserScore(60)).toBe(220);
    expect(guesserScore(0)).toBe(100);
    expect(DRAWER_SCORE).toBe(50);
  });

  it('computes the countdown', () => {
    expect(secondsLeft(1000, 1000 + 15_000, DRAW_SECONDS)).toBe(45);
    expect(secondsLeft(1000, 1000 + 90_000, DRAW_SECONDS)).toBe(0);
  });
});
