import { describe, expect, it } from 'vitest';
import {
  guessMatches,
  isOutOfQuestions,
  questionsLeft,
  validQuestion,
  validSecret,
} from './logic';

describe('twenty-questions logic', () => {
  it('validates secrets and questions', () => {
    expect(validSecret('Eiffel Tower')).toBe(true);
    expect(validSecret('x')).toBe(false);
    expect(validQuestion('Is it alive?')).toBe(true);
    expect(validQuestion('  ')).toBe(false);
  });

  it('tracks the question budget', () => {
    expect(questionsLeft(0)).toBe(20);
    expect(questionsLeft(19)).toBe(1);
    expect(questionsLeft(20)).toBe(0);
    expect(isOutOfQuestions(20)).toBe(true);
    expect(isOutOfQuestions(19)).toBe(false);
  });

  it('matches final guesses fuzzily', () => {
    expect(guessMatches('Eiffel Tower', 'the eiffel tower')).toBe(true);
    expect(guessMatches('tower', 'The Eiffel Tower')).toBe(true);
    expect(guessMatches('Big Ben', 'Eiffel Tower')).toBe(false);
    expect(guessMatches('', 'Eiffel Tower')).toBe(false);
  });
});
