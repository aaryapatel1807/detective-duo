/* Realism-kit pure helper unit tests. Keep it light: pure helpers only. */
import { describe, expect, it } from 'vitest';
import { pipLayout, suitColor, suitGlyph } from './realism-helpers';

describe('pipLayout', () => {
  it('returns the standard pip cells for each face', () => {
    expect(pipLayout(1)).toEqual([4]);
    expect(pipLayout(2)).toEqual([0, 8]);
    expect(pipLayout(3)).toEqual([0, 4, 8]);
    expect(pipLayout(4)).toEqual([0, 2, 6, 8]);
    expect(pipLayout(5)).toEqual([0, 2, 4, 6, 8]);
    expect(pipLayout(6)).toEqual([0, 2, 3, 5, 6, 8]);
  });

  it('returns one pip per face value', () => {
    for (let v = 1; v <= 6; v += 1) {
      expect(pipLayout(v)).toHaveLength(v);
    }
  });

  it('returns an empty layout for out-of-range values', () => {
    expect(pipLayout(0)).toEqual([]);
    expect(pipLayout(7)).toEqual([]);
    expect(pipLayout(-3)).toEqual([]);
  });
});

describe('suitColor', () => {
  it('marks hearts and diamonds red, spades and clubs black', () => {
    expect(suitColor('hearts')).toBe('red');
    expect(suitColor('diamonds')).toBe('red');
    expect(suitColor('spades')).toBe('black');
    expect(suitColor('clubs')).toBe('black');
  });
});

describe('suitGlyph', () => {
  it('returns a distinct glyph per suit', () => {
    const glyphs = ['spades', 'hearts', 'diamonds', 'clubs'].map((s) =>
      suitGlyph(s as 'spades'),
    );
    expect(new Set(glyphs).size).toBe(4);
  });
});
