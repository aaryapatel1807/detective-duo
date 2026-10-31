/**
 * Uno Slap (Phase 6 quick game): lay cards down while counting one to
 * ten out loud. The instant a card's value matches the number spoken,
 * slap the pile — fastest hand takes it, a wrong slap costs you.
 *
 * Player-driven (no auto-advance): "Lay a card" shows the next card
 * and the next spoken number; "Slap!" claims a match. A wrong slap
 * loses a point. First to the target wins.
 */
import { rngFromSeed, shuffle } from '../generators/rng';

export interface UnoSlapGame {
  /** Deck of card values (1-10), shuffled. */
  deck: number[];
  target: number;
}

export function unoSlapTargetForLevel(level: number): number {
  if (level <= 10) return 5;
  if (level <= 30) return 8;
  if (level <= 60) return 12;
  return 15;
}

export function generateUnoSlap(seed: string, level: number): UnoSlapGame {
  const rng = rngFromSeed(`unoslap|${seed}|${level}`);
  const deck: number[] = [];
  for (let suit = 0; suit < 4; suit++) {
    for (let v = 1; v <= 10; v++) deck.push(v);
  }
  return { deck: shuffle(deck, rng), target: unoSlapTargetForLevel(level) };
}

/**
 * Shuffle a pile of card values into a new order, keeping exactly the
 * same cards. Used for a mid-round reshuffle and for the automatic
 * reshuffle when the draw pile runs out — scores are untouched.
 */
export function reshuffleUnoSlapDeck(deck: number[], rng: () => number): number[] {
  return shuffle(deck, rng);
}

/** True when every card in the pile has been laid (time to reshuffle). */
export function unoSlapDeckExhausted(laid: number, deckLength: number): boolean {
  return laid >= deckLength;
}

/**
 * A fresh deck for a restarted round: the same 40 cards (four suits of
 * 1-10) in a different order than the round identified by `seed`.
 * `round` increments per restart so no two restarts deal alike.
 */
export function restartedUnoSlapDeck(seed: string, level: number, round: number): number[] {
  return generateUnoSlap(`${seed}|restart-${round}`, level).deck;
}

/** Spoken number when `laid` cards are down (cycles 1..10). */
export function spokenNumber(laid: number): number {
  return (laid % 10) + 1;
}

/** Is the top card a slap match for the spoken number? */
export function isSlapMatch(topCard: number, spoken: number): boolean {
  return topCard === spoken;
}

export interface UnoSlapScore {
  score: number;
  mistakes: number;
}

/** Apply a slap: right match scores, wrong slap costs a point. */
export function applySlap(
  match: boolean,
  score: UnoSlapScore,
): UnoSlapScore {
  if (match) return { score: score.score + 1, mistakes: score.mistakes };
  return { score: Math.max(0, score.score - 1), mistakes: score.mistakes + 1 };
}

export function unoSlapProgress(game: UnoSlapGame, score: number): number {
  if (game.target <= 0) return 1;
  return Math.min(1, score / game.target);
}

/** Bot slap delay (ms) after a match appears: slower early. */
export function unoSlapBotDelayMs(level: number): number {
  if (level <= 10) return 1600;
  if (level <= 30) return 1100;
  if (level <= 60) return 800;
  return 600;
}

/** Bot wrong-slap rate: it sometimes slaps when there is no match. */
export function unoSlapBotErrorRate(level: number): number {
  if (level <= 10) return 0.25;
  if (level <= 30) return 0.12;
  if (level <= 60) return 0.05;
  return 0.02;
}
