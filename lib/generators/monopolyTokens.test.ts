import { describe, expect, it } from 'vitest';
import {
  botTokenFor,
  isValidToken,
  MONOPOLY_TOKENS,
  secondTokenFor,
  tokenGlyph,
} from './monopolyTokens';

describe('monopoly tokens', () => {
  it('has at least 8 distinct shapes, including heart and car', () => {
    expect(MONOPOLY_TOKENS.length).toBeGreaterThanOrEqual(8);
    expect(MONOPOLY_TOKENS.map((t) => t.id)).toContain('heart');
    expect(MONOPOLY_TOKENS.map((t) => t.id)).toContain('car');
    expect(new Set(MONOPOLY_TOKENS.map((t) => t.id)).size).toBe(MONOPOLY_TOKENS.length);
    expect(new Set(MONOPOLY_TOKENS.map((t) => t.glyph)).size).toBe(MONOPOLY_TOKENS.length);
  });

  it('bot token is never the player token, for every player choice', () => {
    for (const t of MONOPOLY_TOKENS) {
      const bot = botTokenFor(t.id);
      expect(isValidToken(bot)).toBe(true);
      expect(bot).not.toBe(t.id);
    }
  });

  it('second player token differs from the first', () => {
    for (const t of MONOPOLY_TOKENS) {
      expect(secondTokenFor(t.id)).not.toBe(t.id);
    }
  });

  it('glyph lookup falls back for unknown ids', () => {
    expect(tokenGlyph('heart')).toBe('❤️');
    expect(tokenGlyph('car')).toBe('🚗');
    expect(tokenGlyph('nope')).toBe('●');
  });
});
