import { describe, expect, it } from 'vitest';
import { SUSPECTS } from './content';
import {
  filterByAnswer,
  firstTurn,
  isCorrectAccusation,
  remainingAfterAnswer,
} from './logic';

describe('guess-who logic', () => {
  it('has 12 unique suspects', () => {
    expect(SUSPECTS).toHaveLength(12);
    const ids = SUSPECTS.map((s) => s.id);
    expect(new Set(ids).size).toBe(12);
  });

  it('filters by attribute answer', () => {
    const withHat = filterByAnswer(SUSPECTS, 'hat', true);
    expect(withHat.length).toBeGreaterThan(0);
    expect(withHat.length).toBeLessThan(12);
    expect(withHat.every((s) => s.attrs.hat)).toBe(true);
  });

  it('prunes the board after an answer', () => {
    const all = SUSPECTS.map((s) => s.id);
    const afterNo = remainingAfterAnswer(all, SUSPECTS, 'beard', false);
    expect(afterNo.length).toBeGreaterThan(0);
    expect(afterNo.length).toBeLessThan(12);
    const afterYes = remainingAfterAnswer(all, SUSPECTS, 'beard', true);
    expect(afterNo.length + afterYes.length).toBe(12);
  });

  it('judges accusations', () => {
    expect(isCorrectAccusation('s3', 's3')).toBe(true);
    expect(isCorrectAccusation('s3', 's4')).toBe(false);
  });

  it('picks a deterministic first turn', () => {
    expect(firstTurn(['b', 'a'])).toBe('a');
    expect(firstTurn([])).toBe(null);
  });
});
