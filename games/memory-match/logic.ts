/* Memory match core — pure deck logic, unit-testable. */

export interface Card {
  id: number;
  icon: string;
  matched: boolean;
}

/** Noir evidence icons: 12 pairs for the 6×4 board. */
export const ICONS = ['🕵️', '🔦', '🔑', '📷', '🗝️', '🎩', '🌃', '📰', '🔍', '💼', '📞', '🕰️'];

/** Deterministic PRNG so decks are reproducible in tests. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Build a shuffled deck of pairs. */
export function createDeck(icons: string[] = ICONS, rng: () => number = Math.random): Card[] {
  const deck: Card[] = [];
  icons.forEach((icon, i) => {
    deck.push({ id: i * 2, icon, matched: false });
    deck.push({ id: i * 2 + 1, icon, matched: false });
  });
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export function allMatched(deck: Card[]): boolean {
  return deck.length > 0 && deck.every((c) => c.matched);
}

/** Mark the two cards matched if their icons agree. Returns a new deck. */
export function matchPair(deck: Card[], a: number, b: number): Card[] {
  if (a === b || deck[a].icon !== deck[b].icon) return deck.slice();
  return deck.map((c, i) => (i === a || i === b ? { ...c, matched: true } : c));
}
