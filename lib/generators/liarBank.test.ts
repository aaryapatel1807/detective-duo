import { describe, expect, it } from 'vitest';
import { generateLiarRound, LIAR_PROMPTS, notesForLevel } from './liarBank';

describe('liarBank solo rounds', () => {
  it('builds a round with three statements and one lie', () => {
    const r = generateLiarRound('lr1', 5);
    expect(r.statements.length).toBe(3);
    expect(r.lieIndex).toBeGreaterThanOrEqual(0);
    expect(r.lieIndex).toBeLessThan(3);
    expect(new Set(r.statements).size).toBe(3);
    expect(r.suspect.length).toBeGreaterThan(0);
    expect(r.role.length).toBeGreaterThan(0);
  });

  it('the contradicted note is always among the notes shown', () => {
    for (const seed of ['a', 'b', 'c', 'd']) {
      const r = generateLiarRound(seed, 20);
      const noteInExplanation = r.explanation.match(/“([^”]+)”/);
      expect(noteInExplanation).not.toBeNull();
      expect(r.notes).toContain(noteInExplanation![1]);
    }
  });

  it('shows more notes to cross-check as levels climb', () => {
    expect(notesForLevel(1)).toBe(3);
    expect(notesForLevel(20)).toBe(4);
    expect(notesForLevel(40)).toBe(5);
    expect(notesForLevel(70)).toBe(6);
    expect(generateLiarRound('n', 1).notes.length).toBe(3);
    expect(generateLiarRound('n', 70).notes.length).toBe(6);
  });

  it('is deterministic for the same seed', () => {
    expect(generateLiarRound('det', 10)).toEqual(generateLiarRound('det', 10));
    expect(generateLiarRound('det', 10)).not.toEqual(generateLiarRound('det', 11));
  });

  it('ships a prompt bank so together rounds never feel blank', () => {
    expect(LIAR_PROMPTS.length).toBeGreaterThanOrEqual(20);
    expect(new Set(LIAR_PROMPTS).size).toBe(LIAR_PROMPTS.length);
  });
});
