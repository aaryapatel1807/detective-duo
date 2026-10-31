import { describe, expect, it } from 'vitest';
import {
  generateSpot,
  spotBotDelayMs,
  spotCardSizeForLevel,
  spotPoolSizeForLevel,
  spotProgress,
  spotTargetForLevel,
} from './spotEmoji';

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

  it('keeps the exact-one-shared-emoji invariant at every level', () => {
    for (const level of [1, 10, 11, 30, 31, 60, 61, 90]) {
      const g = generateSpot('invariant', level);
      const size = spotCardSizeForLevel(level);
      expect(g.cardSize).toBe(size);
      expect(g.cards).toHaveLength(g.target);
      for (const card of g.cards) {
        expect(card.mine).toHaveLength(size);
        expect(card.theirs).toHaveLength(size);
        // Exactly one shared emoji, and it is the declared twin.
        const shared = card.mine.filter((e) => card.theirs.includes(e));
        expect(shared).toEqual([card.shared]);
        // No duplicates within either side, and the union is exactly
        // 2 * size - 1 distinct pictures (shared counted once).
        expect(new Set(card.mine).size).toBe(size);
        expect(new Set(card.theirs).size).toBe(size);
        expect(new Set([...card.mine, ...card.theirs]).size).toBe(2 * size - 1);
        // Every dealt picture comes from the game's active pool.
        expect(new Set([...card.mine, ...card.theirs]).size).toBeLessThanOrEqual(g.poolSize);
      }
    }
  });

  it('grows card count, card size and pool variety with level', () => {
    expect(spotTargetForLevel(5)).toBe(5);
    expect(spotTargetForLevel(20)).toBe(8);
    expect(spotTargetForLevel(45)).toBe(12);
    expect(spotTargetForLevel(80)).toBe(15);
    expect(spotCardSizeForLevel(5)).toBe(6);
    expect(spotCardSizeForLevel(20)).toBe(7);
    expect(spotCardSizeForLevel(45)).toBe(8);
    expect(spotCardSizeForLevel(80)).toBe(9);
    expect(spotPoolSizeForLevel(5)).toBe(24);
    expect(spotPoolSizeForLevel(20)).toBe(32);
    expect(spotPoolSizeForLevel(45)).toBe(40);
    expect(spotPoolSizeForLevel(80)).toBe(48);
    // Growth is visible in generated games, not just the ladders.
    const easy = generateSpot('growth', 5);
    const expert = generateSpot('growth', 80);
    expect(expert.cards.length).toBeGreaterThan(easy.cards.length);
    expect(expert.cardSize).toBeGreaterThan(easy.cardSize);
    expect(expert.poolSize).toBeGreaterThan(easy.poolSize);
  });

  it('is deterministic and scales the target with level', () => {
    expect(generateSpot('s', 5)).toEqual(generateSpot('s', 5));
    expect(generateSpot('s', 80)).toEqual(generateSpot('s', 80));
    expect(generateSpot('s', 5)).not.toEqual(generateSpot('other', 5));
    expect(spotTargetForLevel(20)).toBe(8);
    expect(spotTargetForLevel(45)).toBe(12);
    expect(spotTargetForLevel(80)).toBe(15);
    expect(spotProgress(generateSpot('s', 5), 3)).toBe(0.6);
  });

  it('speeds the bot up with level', () => {
    expect(spotBotDelayMs(1)).toBeGreaterThan(spotBotDelayMs(70));
  });

  it('keeps the bot human-paced: jittered, never instant, floor at level 1', () => {
    // Base delays are unchanged without a seed (backwards compatible).
    expect(spotBotDelayMs(1)).toBe(3200);
    expect(spotBotDelayMs(80)).toBe(1200);
    // With a seed, the delay varies by round (jitter) but stays within
    // ±15% of base and above a 2000ms floor at level 1.
    const easyDelays = Array.from({ length: 10 }, (_, r) => spotBotDelayMs(1, 'bot', r));
    expect(new Set(easyDelays).size).toBeGreaterThan(1);
    for (const d of easyDelays) {
      expect(d).toBeGreaterThanOrEqual(2720);
      expect(d).toBeLessThanOrEqual(3680);
      expect(d).toBeGreaterThan(2000);
    }
    // Jitter is deterministic for the same seed/level/round.
    expect(spotBotDelayMs(1, 'bot', 3)).toBe(spotBotDelayMs(1, 'bot', 3));
    // And ordering survives jitter: even the fastest jittered Expert
    // delay beats the slowest jittered Easy delay.
    const expertDelays = Array.from({ length: 10 }, (_, r) => spotBotDelayMs(80, 'bot', r));
    expect(Math.max(...expertDelays)).toBeLessThan(Math.min(...easyDelays));
  });
});
