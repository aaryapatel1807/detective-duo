import { describe, expect, it } from 'vitest';
import { buildDeck, deckSize, isMatch, MATCH_XP, MISMATCH_XP } from './logic';

describe('would-you-rather logic', () => {
  it('builds a shuffled deck from the bank', () => {
    const deck = buildDeck(deckSize(), () => 0.3);
    expect(deck).toHaveLength(deckSize());
    expect(deckSize()).toBeGreaterThanOrEqual(10);
  });

  it('detects matching and mismatched vote pairs', () => {
    expect(isMatch({ a: 0, b: 0 })).toBe(true);
    expect(isMatch({ a: 1, b: 1 })).toBe(true);
    expect(isMatch({ a: 0, b: 1 })).toBe(false);
    expect(isMatch({ a: 0 })).toBe(false); // only one vote in
    expect(isMatch({})).toBe(false);
  });

  it('pays more for a match than a mismatch', () => {
    expect(MATCH_XP).toBeGreaterThan(MISMATCH_XP);
  });
});
