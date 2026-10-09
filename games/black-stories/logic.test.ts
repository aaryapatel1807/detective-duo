import { describe, expect, it } from 'vitest';
import {
  appendQuestion,
  answerQuestion,
  answeredCount,
  unansweredCount,
  validQuestion,
} from './logic';

describe('black-stories logic', () => {
  it('validates question text', () => {
    expect(validQuestion('Was it raining?')).toBe(true);
    expect(validQuestion('   ')).toBe(false);
    expect(validQuestion('x'.repeat(301))).toBe(false);
  });

  it('appends questions with a null answer', () => {
    const qa = appendQuestion([], 'Was it raining?', 'p1');
    expect(qa).toHaveLength(1);
    expect(qa[0]).toMatchObject({ q: 'Was it raining?', a: null, from: 'p1' });
  });

  it('answers questions and counts them', () => {
    let qa = appendQuestion([], 'Was it raining?', 'p1');
    qa = appendQuestion(qa, 'Was he short?', 'p1');
    expect(unansweredCount(qa)).toBe(2);
    qa = answerQuestion(qa, 0, 'yes');
    expect(qa[0].a).toBe('yes');
    expect(qa[1].a).toBe(null);
    expect(answeredCount(qa)).toBe(1);
    expect(unansweredCount(qa)).toBe(1);
  });

  it('ignores out-of-range answer indexes', () => {
    const qa = appendQuestion([], 'Q?', 'p1');
    expect(answerQuestion(qa, 99, 'no')).toEqual(qa);
  });
});
