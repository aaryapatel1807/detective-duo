import { describe, expect, it } from 'vitest';
import { buildDeck, CARD_XP, DECK_SIZE } from './logic';

describe('truth-or-dare logic', () => {
  it('builds a mixed deck of the requested size', () => {
    const deck = buildDeck(DECK_SIZE, () => 0.5);
    expect(deck).toHaveLength(DECK_SIZE);
    expect(deck.some((c) => c.type === 'truth')).toBe(true);
    expect(deck.some((c) => c.type === 'dare')).toBe(true);
  });

  it('is deterministic with a fixed random source', () => {
    const a = buildDeck(6, () => 0.1);
    const b = buildDeck(6, () => 0.1);
    expect(a).toEqual(b);
  });

  it('awards a fixed XP per completed card', () => {
    expect(CARD_XP).toBe(40);
  });
});
