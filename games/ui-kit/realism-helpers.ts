/* Realism-kit pure helpers (no JSX — safe to import in vitest). */

export type CardSuit = 'spades' | 'hearts' | 'diamonds' | 'clubs';

const SUIT_GLYPH: Record<CardSuit, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
};

export function suitGlyph(suit: CardSuit): string {
  return SUIT_GLYPH[suit];
}

/** Red suits vs black suits, like a real deck. */
export function suitColor(suit: CardSuit): 'red' | 'black' {
  return suit === 'hearts' || suit === 'diamonds' ? 'red' : 'black';
}

/**
 * Pip cells for a standard die face, as indices into a 3x3 grid
 * (0..8, row-major).
 */
export function pipLayout(value: number): number[] {
  switch (value) {
    case 1:
      return [4];
    case 2:
      return [0, 8];
    case 3:
      return [0, 4, 8];
    case 4:
      return [0, 2, 6, 8];
    case 5:
      return [0, 2, 4, 6, 8];
    case 6:
      return [0, 2, 3, 5, 6, 8];
    default:
      return [];
  }
}
