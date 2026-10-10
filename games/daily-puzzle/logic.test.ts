import { describe, expect, it } from 'vitest';
import {
  cellsOnLine,
  dateKey,
  formatCountdown,
  generateDaily,
  hashStr,
  SIZE,
  wordBank,
  WORDS_PER_DAY,
} from './logic';

describe('daily puzzle', () => {
  it('is deterministic for the same date', () => {
    const a = generateDaily('2026-10-09');
    const b = generateDaily('2026-10-09');
    expect(a.letters).toEqual(b.letters);
    expect(a.words).toEqual(b.words);
  });

  it('differs across dates', () => {
    const a = generateDaily('2026-10-09');
    const b = generateDaily('2026-10-10');
    expect(a.letters).not.toEqual(b.letters);
  });

  it('places 5 words whose letters match the grid cells', () => {
    const p = generateDaily('2026-10-09');
    expect(p.words).toHaveLength(WORDS_PER_DAY);
    expect(p.letters).toHaveLength(SIZE * SIZE);
    for (const w of p.words) {
      expect(wordBank()).toContain(w.word);
      const spelled = w.cells.map((i) => p.letters[i]).join('');
      expect(spelled).toBe(w.word);
    }
  });

  it('cellsOnLine walks straight lines and rejects crooked ones', () => {
    // 5x5: row 0 = cells 0..4; diagonal 0 -> 24
    expect(cellsOnLine(5, 0, 4)).toEqual([0, 1, 2, 3, 4]);
    expect(cellsOnLine(5, 4, 0)).toEqual([4, 3, 2, 1, 0]);
    expect(cellsOnLine(5, 0, 20)).toEqual([0, 5, 10, 15, 20]);
    expect(cellsOnLine(5, 0, 24)).toEqual([0, 6, 12, 18, 24]);
    expect(cellsOnLine(5, 0, 7)).toBeNull(); // knight-ish, not straight
    expect(cellsOnLine(5, 3, 3)).toBeNull(); // same cell
  });

  it('dateKey formats local dates as YYYY-MM-DD', () => {
    expect(dateKey(new Date(2026, 9, 9, 15, 30))).toBe('2026-10-09');
  });

  it('hashStr is stable', () => {
    expect(hashStr('dd-daily:2026-10-09')).toBe(hashStr('dd-daily:2026-10-09'));
  });

  it('formatCountdown renders HH:MM:SS', () => {
    expect(formatCountdown(3661000)).toBe('01:01:01');
    expect(formatCountdown(0)).toBe('00:00:00');
  });
});
