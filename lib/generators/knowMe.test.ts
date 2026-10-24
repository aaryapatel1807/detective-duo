import { describe, expect, it } from 'vitest';
import {
  botAnswer,
  BOT_NAME,
  countMatches,
  KNOW_QUESTIONS,
  pickQuestions,
} from './knowMe';

describe('knowMe bank', () => {
  it('has light, silly and deep questions', () => {
    const tags = new Set(KNOW_QUESTIONS.map((q) => q.tag));
    expect(tags).toEqual(new Set(['light', 'silly', 'deep']));
    expect(KNOW_QUESTIONS.length).toBeGreaterThanOrEqual(30);
    expect(new Set(KNOW_QUESTIONS.map((q) => q.id)).size).toBe(KNOW_QUESTIONS.length);
  });

  it('picks six balanced, unique, deterministic questions', () => {
    const qs = pickQuestions('k1');
    expect(qs.length).toBe(6);
    expect(new Set(qs.map((q) => q.id)).size).toBe(6);
    const counts = { light: 0, silly: 0, deep: 0 };
    for (const q of qs) counts[q.tag]++;
    expect(counts).toEqual({ light: 2, silly: 2, deep: 2 });
    expect(pickQuestions('k1')).toEqual(qs);
    expect(pickQuestions('k2').map((q) => q.id)).not.toEqual(qs.map((q) => q.id));
  });

  it('Pip answers from the canned lines, deterministically', () => {
    const q = KNOW_QUESTIONS[0];
    expect(botAnswer(q, 'p')).toBe(botAnswer(q, 'p'));
    expect(q.botAnswers).toContain(botAnswer(q, 'p'));
    expect(BOT_NAME).toBe('Pip');
  });

  it('counts matches case-insensitively and ignores blanks', () => {
    expect(
      countMatches(
        { a: ' Pizza ', b: '', c: 'tea' },
        { a: 'pizza', b: 'x', c: 'TEA' },
      ),
    ).toBe(2);
  });
});
