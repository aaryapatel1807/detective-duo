import { describe, expect, it } from 'vitest';
import {
  countFace,
  isValidRaise,
  loseDie,
  resolveChallenge,
  rollDice,
  START_DICE,
} from './logic';

describe("liar's dice logic", () => {
  it('rolls the right number of dice in range', () => {
    const dice = rollDice(START_DICE, () => 0.0);
    expect(dice).toHaveLength(START_DICE);
    expect(dice.every((d) => d >= 1 && d <= 6)).toBe(true);
  });

  it('validates raises', () => {
    expect(isValidRaise(null, 1, 1)).toBe(true); // first bid always legal
    const prev = { qty: 3, face: 4, by: 'a' };
    expect(isValidRaise(prev, 4, 2)).toBe(true); // more dice
    expect(isValidRaise(prev, 3, 5)).toBe(true); // same dice, higher face
    expect(isValidRaise(prev, 3, 4)).toBe(false); // identical bid
    expect(isValidRaise(prev, 3, 3)).toBe(false); // lower face
    expect(isValidRaise(prev, 2, 6)).toBe(false); // fewer dice
    expect(isValidRaise(prev, 0, 4)).toBe(false); // nonsense qty
    expect(isValidRaise(prev, 3, 7)).toBe(false); // nonsense face
  });

  it('counts faces across both hands', () => {
    expect(countFace([1, 4, 4], [4, 2], 4)).toBe(3);
    expect(countFace([1, 2], [3, 5], 6)).toBe(0);
  });

  it('resolves challenges: bidder honest when count meets the bid', () => {
    const bid = { qty: 3, face: 4, by: 'a' };
    expect(resolveChallenge(bid, [4, 4], [4, 2])).toEqual({ bidderWins: true, actual: 3 });
    expect(resolveChallenge(bid, [4, 1], [2, 3])).toEqual({ bidderWins: false, actual: 1 });
  });

  it('losing a die shrinks the hand by one, never below zero', () => {
    expect(loseDie([1, 2, 3])).toHaveLength(2);
    expect(loseDie([1])).toHaveLength(0);
    expect(loseDie([])).toHaveLength(0);
  });
});
