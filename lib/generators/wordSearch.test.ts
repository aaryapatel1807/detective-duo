import { describe, expect, it } from 'vitest';
import {
  WORD_THEMES,
  findWord,
  generateLevelPuzzle,
  generatePuzzle,
  levelSeed,
  tierForLevel,
} from './wordSearch';

describe('word search generator', () => {
  it('is deterministic: same seed, same puzzle', () => {
    const a = generatePuzzle('ws|tester|17', 17);
    const b = generatePuzzle('ws|tester|17', 17);
    expect(b).toEqual(a);
  });

  it('levelSeed is stable and salt-sensitive', () => {
    expect(levelSeed(3, 'a')).toBe(levelSeed(3, 'a'));
    expect(levelSeed(3, 'a')).not.toBe(levelSeed(3, 'b'));
    expect(levelSeed(3, 'a')).not.toBe(levelSeed(4, 'a'));
  });

  it('has 8+ hand-written themes', () => {
    expect(WORD_THEMES.length).toBeGreaterThanOrEqual(8);
    for (const t of WORD_THEMES) {
      expect(t.words.length).toBeGreaterThanOrEqual(10);
      for (const w of t.words) expect(w).toMatch(/^[A-Z]+$/);
    }
  });

  it('follows the tier ladder: size, word count and directions widen', () => {
    expect(tierForLevel(1).size).toBe(8);
    expect(tierForLevel(1).wordCount).toBe(6);
    expect(tierForLevel(1).directions.length).toBe(2);
    expect(tierForLevel(30).directions.length).toBe(4);
    expect(tierForLevel(60).directions.length).toBe(6);
    expect(tierForLevel(61).directions.length).toBe(8);
    expect(tierForLevel(61).size).toBe(14);
    expect(tierForLevel(81).size).toBe(16);
    let prevSize = 0;
    let prevWords = 0;
    for (let l = 1; l <= 120; l++) {
      const t = tierForLevel(l);
      expect(t.size).toBeGreaterThanOrEqual(prevSize);
      expect(t.wordCount).toBeGreaterThanOrEqual(prevWords);
      prevSize = t.size;
      prevWords = t.wordCount;
    }
  });

  it('every listed word is present in its grid, no duplicates, across levels 1-120', () => {
    for (let level = 1; level <= 120; level++) {
      const p = generateLevelPuzzle(level, 'presence');
      expect(p.grid.length).toBe(p.size);
      for (const row of p.grid) {
        expect(row.length).toBe(p.size);
        for (const ch of row) expect(ch).toMatch(/^[A-Z]$/);
      }
      const words = p.words.map((w) => w.word);
      expect(new Set(words).size, `level ${level} duplicates`).toBe(words.length);
      for (const w of p.words) {
        // The recorded placement itself spells the word.
        const spelled = w.cells.map(([r, c]) => p.grid[r][c]).join('');
        expect(spelled, `level ${level} word ${w.word}`).toBe(w.word);
        // And an independent all-directions search finds it too.
        expect(findWord(p.grid, w.word), `level ${level} word ${w.word}`).not.toBeNull();
      }
    }
  });

  it('findWord searches all 8 directions', () => {
    const grid = [
      ['C', 'A', 'T'],
      ['X', 'X', 'X'],
      ['D', 'O', 'G'],
    ];
    expect(findWord(grid, 'CAT')).not.toBeNull();
    expect(findWord(grid, 'TAC')).not.toBeNull();
    expect(findWord(grid, 'DOG')).not.toBeNull();
    expect(findWord(grid, 'GOD')).not.toBeNull();
    expect(findWord(grid, 'FISH')).toBeNull();
  });
});
