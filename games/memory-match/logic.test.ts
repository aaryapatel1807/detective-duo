import { describe, expect, it } from 'vitest';
import { allMatched, createDeck, ICONS, matchPair, mulberry32 } from './logic';

describe('memory match', () => {
  it('creates 12 shuffled pairs (24 cards)', () => {
    const deck = createDeck(ICONS, mulberry32(42));
    expect(deck).toHaveLength(24);
    const counts = new Map<string, number>();
    deck.forEach((c) => counts.set(c.icon, (counts.get(c.icon) ?? 0) + 1));
    expect(counts.size).toBe(12);
    for (const n of counts.values()) expect(n).toBe(2);
  });

  it('is deterministic with a seeded rng', () => {
    const a = createDeck(ICONS, mulberry32(7));
    const b = createDeck(ICONS, mulberry32(7));
    expect(a.map((c) => c.icon)).toEqual(b.map((c) => c.icon));
  });

  it('matchPair locks a matching pair and ignores mismatches', () => {
    const deck = createDeck(['A', 'B'], mulberry32(1));
    const ai = deck.map((c, i) => (c.icon === 'A' ? i : -1)).filter((i) => i >= 0);
    const bi = deck.map((c, i) => (c.icon === 'B' ? i : -1)).filter((i) => i >= 0);
    const matched = matchPair(deck, ai[0], ai[1]);
    expect(matched[ai[0]].matched).toBe(true);
    expect(matched[ai[1]].matched).toBe(true);
    // original untouched
    expect(deck[ai[0]].matched).toBe(false);
    const miss = matchPair(deck, ai[0], bi[0]);
    expect(miss[ai[0]].matched).toBe(false);
    expect(miss).not.toBe(deck);
  });

  it('allMatched detects a cleared board', () => {
    const deck = createDeck(['A'], mulberry32(1));
    expect(allMatched(deck)).toBe(false);
    const done = matchPair(deck, 0, 1);
    expect(allMatched(done)).toBe(true);
    expect(allMatched([])).toBe(false);
  });
});
