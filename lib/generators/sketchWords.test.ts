import { describe, expect, it } from 'vitest';
import {
  CLASSIFIER_NOTE,
  classifyDrawing,
  normaliseGuess,
  pickTheme,
  pickWord,
  SKETCH_THEMES,
  type Stroke,
} from './sketchWords';

const roundStroke: Stroke = {
  points: Array.from({ length: 20 }, (_, i) => {
    const a = (i / 20) * Math.PI * 2;
    return [100 + Math.round(40 * Math.cos(a)), 100 + Math.round(40 * Math.sin(a))] as [number, number];
  }),
};

const tallStroke: Stroke = {
  points: Array.from({ length: 12 }, (_, i) => [50, 20 + i * 15] as [number, number]),
};

describe('sketchWords banks', () => {
  it('has four themes with words and hints', () => {
    expect(SKETCH_THEMES.map((t) => t.id)).toEqual(['mystery', 'cozy', 'food', 'places']);
    for (const t of SKETCH_THEMES) {
      const w = pickWord(`bank-${t.id}`, 1, t.id);
      expect(w.word.length).toBeGreaterThan(0);
      expect(w.hint.length).toBeGreaterThan(0);
    }
  });

  it('is deterministic and favours short words on Easy', () => {
    expect(pickWord('s', 1, 'food')).toEqual(pickWord('s', 1, 'food'));
    expect(pickWord('s', 1, 'food').word.replace(/ /g, '').length).toBeLessThanOrEqual(5);
    expect(pickTheme('t')).toBe(pickTheme('t'));
  });
});

describe('sketchWords toy classifier', () => {
  it('sees a round shape and a tall shape differently', () => {
    expect(classifyDrawing([roundStroke], 'c1').archetype).toBe('round');
    expect(classifyDrawing([tallStroke], 'c2').archetype).toBe('tall');
  });

  it('is deterministic for the same strokes and seed', () => {
    expect(classifyDrawing([roundStroke], 'same')).toEqual(classifyDrawing([roundStroke], 'same'));
  });

  it('is honest about being a toy', () => {
    expect(CLASSIFIER_NOTE).toMatch(/often wrong/);
  });

  it('normalises guesses for comparison', () => {
    expect(normaliseGuess('  Moon! ')).toBe('moon');
  });
});
