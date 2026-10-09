import { describe, expect, it } from 'vitest';
import { PROMPT_CARDS, drawPrompt } from './content';
import {
  TOTAL_ROUNDS,
  isLastRound,
  liarForRound,
  matchWinner,
  scoreForVerdict,
  validStatements,
} from './logic';

describe('spot-the-liar logic', () => {
  it('has 12 prompt cards', () => {
    expect(PROMPT_CARDS).toHaveLength(12);
  });

  it('draws prompts, avoiding repeats when possible', () => {
    const used = PROMPT_CARDS.slice(0, 11).map((c) => c.id);
    const card = drawPrompt(used);
    expect(card.id).toBe(PROMPT_CARDS[11].id);
    expect(drawPrompt(PROMPT_CARDS.map((c) => c.id)).id).toBeTruthy();
  });

  it('validates statement triples', () => {
    expect(validStatements(['a truth', 'another truth', 'a lie'])).toBe(true);
    expect(validStatements(['a', 'b', 'c'])).toBe(false);
    expect(validStatements(['only two', 'statements'])).toBe(false);
  });

  it('alternates the liar each round', () => {
    expect(liarForRound(1, 'A', 'B')).toBe('A');
    expect(liarForRound(2, 'A', 'B')).toBe('B');
    expect(liarForRound(3, 'A', 'B')).toBe('A');
    expect(isLastRound(TOTAL_ROUNDS)).toBe(true);
    expect(isLastRound(1)).toBe(false);
  });

  it('scores verdicts and finds the match winner', () => {
    const s1 = scoreForVerdict({}, 'int', 'liar', true);
    expect(s1).toEqual({ int: 1 });
    const s2 = scoreForVerdict(s1, 'int', 'liar', false);
    expect(s2).toEqual({ int: 1, liar: 1 });
    expect(matchWinner({ int: 2, liar: 1 })).toBe('int');
    expect(matchWinner({ int: 1, liar: 1 })).toBe(null);
  });
});
