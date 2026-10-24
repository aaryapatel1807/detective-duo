import { describe, expect, it } from 'vitest';
import {
  canBuild,
  findableWords,
  generateJinx,
  isValidJinxEntry,
  jinxBotList,
  jinxScore,
  jinxShared,
} from './jinx';

describe('jinx', () => {
  it('checks letter bags with multiplicity', () => {
    expect(canBuild('CAT', 'ACT')).toBe(true);
    expect(canBuild('CAT', 'AC')).toBe(false);
    expect(canBuild('BOOK', 'BOK')).toBe(false);
    expect(canBuild('BOOK', 'BOOKS')).toBe(true);
  });

  it('generates a bag with at least 12 findable words, deterministically', () => {
    const a = generateJinx('s1', 5);
    const b = generateJinx('s1', 5);
    expect(a).toEqual(b);
    expect(a.letters).toHaveLength(9);
    expect(a.findable.length).toBeGreaterThanOrEqual(12);
    for (const w of a.findable) {
      expect(canBuild(w, a.letters)).toBe(true);
    }
  });

  it('scores unique words and cancels shared ones', () => {
    expect(jinxScore(['CAT', 'DOG'], ['CAT'])).toBe(1); // DOG only: 3-2
    expect(jinxScore(['APPLE'], [])).toBe(3);
    expect(jinxShared(['CAT', 'DOG'], ['CAT', 'FISH'])).toEqual(['CAT']);
    expect(jinxScore([], [])).toBe(0);
  });

  it('validates entries against the bag and the lexicon', () => {
    const g = generateJinx('s1', 5);
    const word = g.findable[0]!;
    expect(isValidJinxEntry(word, g, [])).toBe(true);
    expect(isValidJinxEntry(word, g, [word])).toBe(false);
    expect(isValidJinxEntry('ZZZQQQ', g, [])).toBe(false);
    expect(isValidJinxEntry('AB', g, [])).toBe(false);
  });

  it('sizes the bot list by level', () => {
    const g = generateJinx('s1', 5);
    expect(jinxBotList(g, 5, 'b').length).toBeLessThanOrEqual(5);
    const hard = jinxBotList(g, 70, 'b');
    expect(hard.length).toBeGreaterThan(jinxBotList(g, 5, 'b').length);
  });

  it('findable words are real lexicon words', () => {
    const found = findableWords('AEINRSTCD');
    expect(found.length).toBeGreaterThan(0);
    expect(found.every((w) => w.length >= 3)).toBe(true);
  });
});
