import { describe, expect, it } from 'vitest';
import { generateSpot, spotBotDelayMs, spotProgress, spotTargetForLevel } from './spotEmoji';

describe('spot the emoji', () => {
  it('deals cards with exactly one shared emoji, six per side', () => {
    const g = generateSpot('s', 5);
    expect(g.target).toBe(5);
    expect(g.cards).toHaveLength(5);
    for (const card of g.cards) {
      expect(card.mine).toHaveLength(6);
      expect(card.theirs).toHaveLength(6);
      const shared = card.mine.filter((e) => card.theirs.includes(e));
      expect(shared).toEqual([card.shared]);
      expect(new Set(card.mine).size).toBe(6);
      expect(new Set(card.theirs).size).toBe(6);
    }
  });

  it('is deterministic and scales the target with level', () => {
    expect(generateSpot('s', 5)).toEqual(generateSpot('s', 5));
    expect(spotTargetForLevel(20)).toBe(8);
    expect(spotTargetForLevel(45)).toBe(12);
    expect(spotTargetForLevel(80)).toBe(15);
    expect(spotProgress(generateSpot('s', 5), 3)).toBe(0.6);
  });

  it('speeds the bot up with level', () => {
    expect(spotBotDelayMs(1)).toBeGreaterThan(spotBotDelayMs(70));
  });
});
