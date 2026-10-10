import { describe, expect, it } from 'vitest';
import { TRIVIA } from '../../lib/content/trivia';
import { buildDeck, isCorrect, pointsFor, secondsLeft } from './logic';

describe('trivia-battle logic', () => {
  it('builds a 10-question deck from the bank', () => {
    const deck = buildDeck(TRIVIA, [], 10, () => 0.5);
    expect(deck).toHaveLength(10);
    expect(deck.every((q) => q.kind === 'mc' && q.options?.length === 4)).toBe(true);
  });

  it('mixes custom questions in first', () => {
    const deck = buildDeck(TRIVIA, [{ question: 'Our song?', answer: 'Blue Moon' }], 10, () => 0.99);
    const custom = deck.filter((q) => q.kind === 'custom');
    expect(custom).toHaveLength(1);
    expect(custom[0].options).toBe(null);
  });

  it('checks multiple-choice and free-text answers', () => {
    const mc = {
      id: 'x', category: 'c', question: 'q',
      options: ['a', 'b', 'c', 'd'], answerText: 'b', kind: 'mc' as const,
    };
    expect(isCorrect(mc, '1')).toBe(true);
    expect(isCorrect(mc, '2')).toBe(false);
    const custom = {
      id: 'y', category: 'c', question: 'q',
      options: null, answerText: 'Blue Moon', kind: 'custom' as const,
    };
    expect(isCorrect(custom, 'blue  moon')).toBe(true);
    expect(isCorrect(custom, 'red sun')).toBe(false);
  });

  it('awards speed bonuses only for correct answers', () => {
    expect(pointsFor(true, 10)).toBe(200);
    expect(pointsFor(true, 0)).toBe(100);
    expect(pointsFor(false, 10)).toBe(0);
  });

  it('counts down the question clock', () => {
    expect(secondsLeft(1000, 7000)).toBe(6);
    expect(secondsLeft(1000, 20000)).toBe(0);
  });
});
