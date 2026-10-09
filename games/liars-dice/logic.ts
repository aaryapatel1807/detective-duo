/* Pure rules for Liar's Dice (2 players).
 * Each player hides their dice. Bids are quantity × face; a raise must be
 * higher (more dice, or same dice with a higher face). A challenge counts
 * every die showing the bid face across both hands: if the count meets the
 * bid, the bidder was honest and the challenger loses a die; otherwise the
 * bidder loses a die. Last detective holding dice wins.
 */

export const START_DICE = 5;
export const FACES = [1, 2, 3, 4, 5, 6] as const;

export interface Bid {
  qty: number;
  face: number;
  by: string;
}

export function rollDie(rand: () => number = Math.random): number {
  return 1 + Math.floor(rand() * 6);
}

export function rollDice(n: number, rand: () => number = Math.random): number[] {
  return Array.from({ length: n }, () => rollDie(rand));
}

/** A raise is legal when it beats the previous bid. First bid of a round is always legal. */
export function isValidRaise(prev: Bid | null, qty: number, face: number): boolean {
  if (qty < 1 || face < 1 || face > 6) return false;
  if (!prev) return true;
  if (qty > prev.qty) return true;
  if (qty === prev.qty && face > prev.face) return true;
  return false;
}

/** Count dice showing a face across both hands. */
export function countFace(diceA: number[], diceB: number[], face: number): number {
  return [...diceA, ...diceB].filter((d) => d === face).length;
}

export interface ChallengeResult {
  /** true when the bidder was honest (count met the bid). */
  bidderWins: boolean;
  actual: number;
}

export function resolveChallenge(bid: Bid, diceA: number[], diceB: number[]): ChallengeResult {
  const actual = countFace(diceA, diceB, bid.face);
  return { bidderWins: actual >= bid.qty, actual };
}

/** Remove one die from the loser's hand (immutable). */
export function loseDie(dice: number[]): number[] {
  return dice.slice(0, Math.max(0, dice.length - 1));
}

const FACE_GLYPH: Record<number, string> = {
  1: '⚀',
  2: '⚁',
  3: '⚂',
  4: '⚃',
  5: '⚄',
  6: '⚅',
};

export function dieGlyph(face: number): string {
  return FACE_GLYPH[face] ?? '🎲';
}
