import { describe, expect, it } from 'vitest';
import { generateRoomCode, isValidRoomCode, normalizeRoomCode } from './roomCode';

describe('room codes', () => {
  it('generates exactly 4 letters from the unambiguous alphabet', () => {
    for (let i = 0; i < 200; i++) {
      const code = generateRoomCode();
      expect(code).toMatch(/^[A-HJ-NP-Z]{4}$/);
    }
  });

  it('generates varied codes (no single-code collapse)', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) seen.add(generateRoomCode());
    expect(seen.size).toBeGreaterThan(150);
  });

  it('validates format and rejects lookalikes and wrong lengths', () => {
    expect(isValidRoomCode('ABCD')).toBe(true);
    expect(isValidRoomCode('abcd')).toBe(true);
    expect(isValidRoomCode('ABCI')).toBe(false); // I excluded
    expect(isValidRoomCode('ABCO')).toBe(false); // O excluded
    expect(isValidRoomCode('ABC1')).toBe(false);
    expect(isValidRoomCode('ABC')).toBe(false);
    expect(isValidRoomCode('ABCDE')).toBe(false);
    expect(isValidRoomCode('AB D')).toBe(false);
  });

  it('normalizes join input', () => {
    expect(normalizeRoomCode('  abcd ')).toBe('ABCD');
  });
});
