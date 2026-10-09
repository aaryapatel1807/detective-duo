/* Mind Meld logic tests. */
import { describe, expect, it } from 'vitest';
import { MIND_THEMES } from './content';
import {
  MIND_WIN_MATCHES,
  advanceRound,
  buildCustomTheme,
  freshMeld,
  nextThemeIdx,
  normalizeWord,
  wordsMatch,
} from './logic';

describe('normalizeWord / wordsMatch', () => {
  it('matches case-insensitively', () => {
    expect(wordsMatch('Rain', 'RAIN')).toBe(true);
    expect(wordsMatch('  rain  ', 'Rain')).toBe(true);
  });
  it('collapses inner whitespace', () => {
    expect(wordsMatch('new  york', 'New York')).toBe(true);
  });
  it('rejects different words and empties', () => {
    expect(wordsMatch('rain', 'jazz')).toBe(false);
    expect(wordsMatch('', '')).toBe(false);
    expect(wordsMatch('   ', 'rain')).toBe(false);
  });
  it('normalizeWord trims and lowercases', () => {
    expect(normalizeWord('  HeLLo WoRLD ')).toBe('hello world');
  });
});

describe('buildCustomTheme', () => {
  it('joins both words as the next prompt', () => {
    expect(buildCustomTheme('rain', 'jazz')).toBe('RAIN + JAZZ');
    expect(buildCustomTheme('  trench coat ', 'Whiskey')).toBe('TRENCH COAT + WHISKEY');
  });
});

describe('nextThemeIdx', () => {
  it('cycles through the theme list', () => {
    expect(nextThemeIdx(0, 8)).toBe(1);
    expect(nextThemeIdx(7, 8)).toBe(0);
  });
});

describe('advanceRound', () => {
  it('a match advances the meld and moves to the next theme', () => {
    const r = advanceRound(1, 0, 0, 8, 'rain', 'RAIN');
    expect(r.matches).toBe(1);
    expect(r.round).toBe(2);
    expect(r.themeIdx).toBe(1);
    expect(r.customTheme).toBe('');
    expect(r.won).toBe(false);
  });
  it('a miss keeps matches and sets a both-words theme', () => {
    const r = advanceRound(2, 1, 3, 8, 'rain', 'jazz');
    expect(r.matches).toBe(1);
    expect(r.round).toBe(3);
    expect(r.themeIdx).toBe(-1);
    expect(r.customTheme).toBe('RAIN + JAZZ');
    expect(r.prevA).toBe('rain');
    expect(r.prevB).toBe('jazz');
    expect(r.won).toBe(false);
  });
  it('5 matches wins the meld', () => {
    const r = advanceRound(9, MIND_WIN_MATCHES - 1, 0, 8, 'clue', 'clue');
    expect(r.matches).toBe(MIND_WIN_MATCHES);
    expect(r.won).toBe(true);
  });
  it('is idempotent (double-fire from both tabs is safe)', () => {
    const a = advanceRound(1, 0, 0, 8, 'rain', 'RAIN');
    const b = advanceRound(1, 0, 0, 8, 'rain', 'RAIN');
    expect(a).toEqual(b);
  });
});

describe('freshMeld', () => {
  it('starts round 1 with the first theme and empty submissions', () => {
    const f = freshMeld();
    expect(f.round).toBe(1);
    expect(f.matches).toBe(0);
    expect(f.themeIdx).toBe(0);
    expect(f.submissions).toEqual({});
    expect(f.won).toBe(false);
  });
});

describe('content', () => {
  it('ships 8 themed round sets', () => {
    expect(MIND_THEMES).toHaveLength(8);
    const ids = MIND_THEMES.map((t) => t.id);
    expect(new Set(ids).size).toBe(8);
    for (const t of MIND_THEMES) {
      expect(t.prompt.length).toBeGreaterThan(0);
      expect(t.hint.length).toBeGreaterThan(0);
    }
  });
});
