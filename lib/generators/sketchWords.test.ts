import { describe, expect, it } from 'vitest';
import {
  CLASSIFIER_NOTE,
  classifyDrawing,
  guessCloseness,
  measureDrawing,
  normaliseGuess,
  pickTheme,
  pickWord,
  sketchBlanks,
  sketchFirstLetterHint,
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

  it('measures real features and reports them precisely', () => {
    const f = measureDrawing([roundStroke]);
    expect(f.strokeCount).toBe(1);
    expect(f.closed).toBe(true);
    expect(f.aspectRatio).toBeCloseTo(1, 0);
    expect(f.inkLength).toBeGreaterThan(200);
    expect(f.symmetry).toBeGreaterThan(0.8);
    const g = classifyDrawing([roundStroke], 'c3', 'food');
    expect(g.features.closed).toBe(true);
    expect(g.note).toMatch(/closed loop/);
    expect(g.note).toMatch(/aspect 1\.0/);
    expect(g.note).toMatch(/1 stroke/);
  });

  it('scores a round drawing to round words above tall words, with a distinct second guess', () => {
    const g = classifyDrawing([roundStroke], 'c4', 'food');
    expect(g.guess).toBe('donut');
    expect(g.secondGuess).toBeDefined();
    expect(g.secondGuess).not.toBe(g.guess);
  });

  it('scores a tall drawing to a tall word in the same theme', () => {
    const g = classifyDrawing([tallStroke], 'c5', 'cozy');
    expect(g.archetype).toBe('tall');
    expect(g.guess).toBe('candle');
  });

  it('scores only within the given theme bank', () => {
    const g = classifyDrawing([roundStroke], 'c6', 'places');
    // Places has no donut; the best round-ish place word must come from places.
    expect(['beach', 'market', 'bridge', 'garden', 'station', 'library', 'cafe', 'mountain', 'harbour', 'forest', 'bakery', 'cinema']).toContain(g.guess);
  });
});

describe('sketchWords guesser closeness', () => {
  it('calls an exact normalised match exact', () => {
    expect(guessCloseness('Donut!', 'donut').closeness).toBe('exact');
  });

  it('calls edit distance 1-2 close, with the distance as the reason', () => {
    const c = guessCloseness('donot', 'donut');
    expect(c.closeness).toBe('close');
    expect(c.distance).toBe(1);
    expect(c.reason).toMatch(/1 letter off/);
  });

  it('calls same-length guesses close even when letters differ', () => {
    // cake/book: same length, edit distance 4, different first letter.
    expect(guessCloseness('book', 'cake').closeness).toBe('close');
    expect(guessCloseness('book', 'cake').reason).toBe('same length');
  });

  it('calls a shared first letter close', () => {
    // cat/candle: different length, edit distance > 2, same first letter.
    expect(guessCloseness('cat', 'candle').closeness).toBe('close');
    expect(guessCloseness('cat', 'candle').reason).toBe('same first letter');
  });

  it('calls everything else far', () => {
    expect(guessCloseness('lamp', 'donut').closeness).toBe('far');
  });

  it('shows blanks with spaces kept, and reveals the first letter only after 3 wrong guesses', () => {
    expect(sketchBlanks('ice cream')).toBe('___ _____');
    expect(sketchBlanks('donut')).toBe('_____');
    expect(sketchFirstLetterHint('donut', 2)).toBeNull();
    expect(sketchFirstLetterHint('donut', 3)).toBe('d');
    expect(sketchFirstLetterHint('donut', 5)).toBe('d');
  });
});
