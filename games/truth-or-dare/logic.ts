/* Pure rules for Truth or Dare (co-op).
 * A shuffled deck of truth/dare cards; players alternate drawing. Marking a
 * card done earns both detectives XP and records a co-op win.
 */

import { DARES, TRUTHS } from '../../lib/content/dares';

export interface ToDCard {
  type: 'truth' | 'dare';
  text: string;
}

export const DECK_SIZE = 12;

export function shuffle<T>(arr: T[], rand: () => number = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Build a mixed deck of truth + dare cards. */
export function buildDeck(n = DECK_SIZE, rand: () => number = Math.random): ToDCard[] {
  const cards: ToDCard[] = [
    ...TRUTHS.map((text) => ({ type: 'truth' as const, text })),
    ...DARES.map((text) => ({ type: 'dare' as const, text })),
  ];
  return shuffle(cards, rand).slice(0, n);
}

/** XP each detective earns for completing a card. */
export const CARD_XP = 40;
