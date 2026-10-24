import { describe, expect, it } from 'vitest';
import {
  generateVibe,
  traitsForPersona,
  vibeAnswer,
  vibeBoardKindForLevel,
  vibeBotGuessThreshold,
  vibeBotQuestion,
  vibeEliminate,
  vibeProgress,
  vibeRemaining,
} from './vibeCheck';

describe('vibe check', () => {
  it('deals 24 personas, deterministic per seed + level', () => {
    const a = generateVibe('s', 5);
    const b = generateVibe('s', 5);
    expect(a).toEqual(b);
    expect(a.board).toHaveLength(24);
    expect(a.kind).toBe('desi');
    expect(generateVibe('s', 20).kind).toBe('global');
    expect(generateVibe('s', 50).kind).toBe('both');
    expect(vibeBoardKindForLevel(80)).toBe('both');
  });

  it('assigns the same traits to the same name everywhere', () => {
    expect(traitsForPersona('Asha')).toEqual(traitsForPersona('Asha'));
    expect(traitsForPersona('Asha')).toHaveLength(5);
    expect(traitsForPersona('Asha')).not.toEqual(traitsForPersona('Rohan'));
  });

  it('eliminates everyone whose answer differs', () => {
    const g = generateVibe('s', 5);
    const trait = 'chai';
    const secret = g.board[0]!;
    const answer = vibeAnswer(secret, trait);
    const eliminated = vibeEliminate(g.board, [], trait, answer);
    expect(eliminated).not.toContain(0);
    for (const i of eliminated) {
      expect(vibeAnswer(g.board[i]!, trait)).toBe(!answer);
    }
    const remaining = vibeRemaining(eliminated, 24);
    expect(remaining.every((i) => vibeAnswer(g.board[i]!, trait) === answer)).toBe(true);
  });

  it('bot picks a splitting question and guesses late', () => {
    const g = generateVibe('s', 5);
    const q = vibeBotQuestion(g.board, Array.from({ length: 24 }, (_, i) => i));
    expect(q).not.toBe(null);
    expect(vibeBotQuestion(g.board, [3])).toBe(null);
    expect(vibeBotGuessThreshold(5)).toBe(1);
    expect(vibeBotGuessThreshold(50)).toBe(3);
    expect(vibeProgress(24, 23)).toBe(1);
    expect(vibeProgress(24, 0)).toBe(0);
  });
});
