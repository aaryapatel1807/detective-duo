import { describe, expect, it } from 'vitest';
import { WORDS_5 } from '../../lib/content/words';
import { evaluateGuess, isFiveLetters, mergeMark, pickAnswer } from './logic';

describe('wordle evaluation', () => {
  it('marks a perfect guess all-correct', () => {
    expect(evaluateGuess('CRIME', 'CRIME')).toEqual([
      'correct',
      'correct',
      'correct',
      'correct',
      'correct',
    ]);
  });

  it('handles duplicate letters: second C in CRICK vs CRIME is absent', () => {
    // answer CRIME, guess CRICK: C,R,I correct; K absent; extra C absent (only one C in answer)
    expect(evaluateGuess('CRIME', 'CRICK')).toEqual([
      'correct',
      'correct',
      'correct',
      'absent',
      'absent',
    ]);
  });

  it('marks present letters not in the right spot', () => {
    // answer SMOKE, guess MOLES: M,O,E,S present (wrong spots), L absent
    const marks = evaluateGuess('SMOKE', 'MOLES');
    expect(marks).toEqual(['present', 'present', 'absent', 'present', 'present']);
  });

  it('counts duplicates correctly: one E in answer, two in guess', () => {
    // answer THIEF, guess EERIE: E at 0 is present (one E in answer, at pos 4)
    const marks = evaluateGuess('THIEF', 'EERIE');
    expect(marks[0]).toBe('present');
    expect(marks[1]).toBe('absent'); // second E has nothing left to match
  });

  it('pickAnswer returns a word from the shared bank', () => {
    const a = pickAnswer(() => 0.42);
    expect(WORDS_5).toContain(a);
    expect(a).toHaveLength(5);
  });

  it('validates 5-letter input', () => {
    expect(isFiveLetters('crime')).toBe(true);
    expect(isFiveLetters('noir')).toBe(false);
    expect(isFiveLetters('cr1me')).toBe(false);
  });

  it('mergeMark keeps the best mark for keyboard shading', () => {
    expect(mergeMark(undefined, 'present')).toBe('present');
    expect(mergeMark('present', 'correct')).toBe('correct');
    expect(mergeMark('correct', 'absent')).toBe('correct');
  });
});
