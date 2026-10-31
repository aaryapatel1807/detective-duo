import { describe, expect, it } from 'vitest';
import { rngFromSeed } from '../generators/rng';
import {
  applySlap,
  generateUnoSlap,
  isSlapMatch,
  reshuffleUnoSlapDeck,
  restartedUnoSlapDeck,
  spokenNumber,
  unoSlapBotDelayMs,
  unoSlapBotErrorRate,
  unoSlapDeckExhausted,
  unoSlapProgress,
  unoSlapTargetForLevel,
} from './unoSlap';

describe('uno slap', () => {
  it('deals a 40-card deck (four suits of 1-10), deterministically', () => {
    const a = generateUnoSlap('s', 5);
    const b = generateUnoSlap('s', 5);
    expect(a).toEqual(b);
    expect(a.deck).toHaveLength(40);
    for (let v = 1; v <= 10; v++) {
      expect(a.deck.filter((c) => c === v)).toHaveLength(4);
    }
    expect(a.target).toBe(5);
    expect(unoSlapTargetForLevel(80)).toBe(15);
  });

  it('cycles the spoken number 1..10', () => {
    expect([0, 1, 9, 10, 11].map(spokenNumber)).toEqual([1, 2, 10, 1, 2]);
  });

  it('matches only on equal value, and scores slaps fairly', () => {
    expect(isSlapMatch(3, 3)).toBe(true);
    expect(isSlapMatch(3, 4)).toBe(false);
    expect(applySlap(true, { score: 0, mistakes: 0 })).toEqual({ score: 1, mistakes: 0 });
    expect(applySlap(false, { score: 0, mistakes: 0 })).toEqual({ score: 0, mistakes: 1 });
    expect(applySlap(false, { score: 2, mistakes: 1 })).toEqual({ score: 1, mistakes: 2 });
    expect(unoSlapProgress(generateUnoSlap('s', 5), 5)).toBe(1);
  });

  it('reshuffles keep the same 40 cards but in a new order', () => {
    const { deck } = generateUnoSlap('s', 5);
    const reshuffled = reshuffleUnoSlapDeck(deck, rngFromSeed('reshuffle-test'));
    expect(reshuffled).toHaveLength(40);
    expect([...reshuffled].sort((a, b) => a - b)).toEqual(
      [...deck].sort((a, b) => a - b),
    );
    expect(reshuffled).not.toEqual(deck);
  });

  it('restarted rounds deal a different order, and exhaustion is detected', () => {
    const { deck } = generateUnoSlap('s', 5);
    const restarted = restartedUnoSlapDeck('s', 5, 1);
    expect(restarted).toHaveLength(40);
    expect([...restarted].sort((a, b) => a - b)).toEqual(
      [...deck].sort((a, b) => a - b),
    );
    expect(restarted).not.toEqual(deck);
    expect(restartedUnoSlapDeck('s', 5, 2)).not.toEqual(restarted);
    expect(unoSlapDeckExhausted(40, 40)).toBe(true);
    expect(unoSlapDeckExhausted(39, 40)).toBe(false);
  });

  it('makes the bot faster and sharper with level', () => {
    expect(unoSlapBotDelayMs(1)).toBeGreaterThan(unoSlapBotDelayMs(70));
    expect(unoSlapBotErrorRate(1)).toBeGreaterThan(unoSlapBotErrorRate(70));
  });
});
