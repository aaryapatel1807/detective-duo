import { describe, expect, it } from 'vitest';
import {
  botAnswer,
  botWyrChoice,
  BOT_NAME,
  countMatches,
  KNOW_QUESTIONS,
  KNOW_WYR,
  pickQuestions,
  pickWyr,
  validatedCorrectCount,
  validationsComplete,
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

  it('has a 12-pair Would You Rather bank with distinct options and unique ids', () => {
    expect(KNOW_WYR).toHaveLength(12);
    expect(new Set(KNOW_WYR.map((w) => w.id)).size).toBe(12);
    const pairs = new Set<string>();
    for (const w of KNOW_WYR) {
      expect(w.optionA.trim()).not.toBe('');
      expect(w.optionB.trim()).not.toBe('');
      expect(w.optionA).not.toBe(w.optionB);
      pairs.add([w.optionA, w.optionB].sort().join(' | '));
    }
    expect(pairs.size).toBe(12);
  });

  it('picks six unique, deterministic Would You Rather pairs', () => {
    const a = pickWyr('w1');
    expect(a).toHaveLength(6);
    expect(new Set(a.map((w) => w.id)).size).toBe(6);
    expect(pickWyr('w1')).toEqual(a);
    expect(pickWyr('w2').map((w) => w.id)).not.toEqual(a.map((w) => w.id));
    expect(KNOW_WYR.map((w) => w.id)).toContain(a[0].id);
  });

  it('Pip picks A or B deterministically for Would You Rather', () => {
    const w = KNOW_WYR[0];
    const c = botWyrChoice(w, 'p');
    expect(['A', 'B']).toContain(c);
    expect(botWyrChoice(w, 'p')).toBe(c);
  });

  it('counts only the owner validations, one per question, correct only', () => {
    const validations = {
      // Owner 'a' validated 2 correct, 1 incorrect.
      a: { q1: 'correct', q2: 'correct', q3: 'incorrect' },
      // A stray entry keyed by someone else must not count for 'a'.
      someoneElse: { q1: 'correct', q2: 'correct', q3: 'correct', q4: 'correct' },
    } as const;
    expect(validatedCorrectCount(validations, 'a')).toBe(2);
    expect(validatedCorrectCount(validations, 'someoneElse')).toBe(4);
    expect(validatedCorrectCount(undefined, 'a')).toBe(0);
    // One validation per question: re-recording overwrites, it cannot double-count.
    const overwritten = { a: { q1: 'incorrect' } } as const;
    expect(validatedCorrectCount(overwritten, 'a')).toBe(0);
  });

  it('validations are complete only when every owner validated every question', () => {
    const ids = ['q1', 'q2'];
    expect(validationsComplete({}, ['a', 'b'], ids)).toBe(false);
    expect(
      validationsComplete({ a: { q1: 'correct', q2: 'incorrect' } }, ['a', 'b'], ids),
    ).toBe(false);
    expect(
      validationsComplete(
        { a: { q1: 'correct', q2: 'incorrect' }, b: { q1: 'correct', q2: 'correct' } },
        ['a', 'b'],
        ids,
      ),
    ).toBe(true);
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
