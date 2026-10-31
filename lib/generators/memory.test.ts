import { describe, expect, it } from 'vitest';
import { rngFromSeed } from './rng';
import {
  botPick,
  createMemoryGame,
  flipCard,
  generateMemory,
  memoryWinner,
  pairsForLevel,
  resolveMismatch,
} from './memory';

describe('memory', () => {
  it('deals each symbol exactly twice, deterministically, with grids growing by level', () => {
    const easy = generateMemory('s', 1);
    expect(easy.pairs).toBe(6);
    expect(easy.deck).toHaveLength(12);
    expect(easy.cols).toBe(4);
    expect(easy.rows).toBe(3);
    expect(generateMemory('s', 1)).toEqual(easy);
    expect(pairsForLevel(20)).toBe(8);
    expect(pairsForLevel(50)).toBe(12);
    expect(pairsForLevel(70)).toBe(18);
    const expert = generateMemory('s', 70);
    expect(expert.deck).toHaveLength(36);
    expect(expert.cols).toBe(6);
    expect(expert.rows).toBe(6);
    for (const game of [easy, expert]) {
      const counts = new Map<string, number>();
      for (const card of game.deck) counts.set(card.symbol, (counts.get(card.symbol) ?? 0) + 1);
      expect([...counts.values()].every((n) => n === 2)).toBe(true);
    }
  });

  it('a match scores, keeps the turn, and clears the face-up cards', () => {
    const s = createMemoryGame('s', 1);
    const first = s.deck[0]!;
    const partner = s.deck.find((c) => c.symbol === first.symbol && c.index !== first.index)!;
    let t = flipCard(s, first.index);
    expect(t.faceUp).toEqual([first.index]);
    expect(t.turn).toBe(0);
    t = flipCard(t, partner.index);
    expect(t.matchedBy[first.index]).toBe(0);
    expect(t.matchedBy[partner.index]).toBe(0);
    expect(t.scores).toEqual([1, 0]);
    expect(t.faceUp).toEqual([]);
    expect(t.turn).toBe(0);
  });

  it('a mismatch waits for flip-back, then passes the turn', () => {
    const s = createMemoryGame('s', 1);
    const a = s.deck[0]!;
    const b = s.deck.find((c) => c.symbol !== a.symbol)!;
    let t = flipCard(flipCard(s, a.index), b.index);
    expect(t.awaitingFlipBack).toBe(true);
    expect(t.faceUp).toEqual([a.index, b.index]);
    // No further flips while awaiting flip-back.
    expect(flipCard(t, s.deck[2]!.index)).toBe(t);
    t = resolveMismatch(t);
    expect(t.faceUp).toEqual([]);
    expect(t.awaitingFlipBack).toBe(false);
    expect(t.turn).toBe(1);
    expect(resolveMismatch(t)).toBe(t);
  });

  it('ignores flips of matched or already face-up cards', () => {
    const s = createMemoryGame('s', 1);
    const first = s.deck[0]!;
    const partner = s.deck.find((c) => c.symbol === first.symbol && c.index !== first.index)!;
    const t = flipCard(flipCard(s, first.index), partner.index);
    expect(flipCard(t, first.index)).toBe(t);
    expect(flipCard(t, first.index)).toBe(t);
    const u = flipCard(s, first.index);
    expect(flipCard(u, first.index)).toBe(u);
  });

  it('finishes when every pair is found, with the most-pairs winner or a tie', () => {
    let t = createMemoryGame('s', 1);
    // Collect every pair in turn order (player 0 keeps the turn on matches).
    const bySymbol = new Map<string, number[]>();
    for (const card of t.deck) {
      const list = bySymbol.get(card.symbol) ?? [];
      list.push(card.index);
      bySymbol.set(card.symbol, list);
    }
    for (const [, pair] of bySymbol) {
      t = flipCard(flipCard(t, pair[0]!), pair[1]!);
    }
    expect(t.finished).toBe(true);
    expect(t.scores).toEqual([6, 0]);
    expect(memoryWinner(t)).toBe(0);
    // A tie: scores equal, finished.
    const tie = { ...t, scores: [3, 3] as [number, number] };
    expect(memoryWinner(tie)).toBe(null);
    expect(memoryWinner(createMemoryGame('s', 1))).toBe(null);
  });

  it('the bot takes a known pair and never picks a matched or face-up card', () => {
    const s = createMemoryGame('s', 1);
    const first = s.deck[0]!;
    const partner = s.deck.find((c) => c.symbol === first.symbol && c.index !== first.index)!;
    const seen = new Map<string, Set<number>>([
      [first.symbol, new Set([first.index, partner.index])],
    ]);
    const pick = botPick(s, seen, null, rngFromSeed('bot'));
    expect([first.index, partner.index]).toContain(pick);
    // After taking the first half, the bot takes its partner.
    const afterFirst = flipCard(s, pick);
    const second = botPick(afterFirst, seen, null, rngFromSeed('bot'));
    expect(second).toBe(pick === first.index ? partner.index : first.index);
    // Matched cards are never picked.
    const matched = flipCard(afterFirst, second);
    const third = botPick(matched, seen, null, rngFromSeed('bot'));
    expect(matched.matchedBy[third]).toBe(null);
    expect(matched.faceUp).not.toContain(third);
  });
});
