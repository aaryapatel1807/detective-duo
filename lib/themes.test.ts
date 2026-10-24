import { describe, expect, it } from 'vitest';
import { CONTRAST_PAIRS, THEMES, THEME_IDS, contrastRatio, isThemeId, resolveThemeId } from './themes';

describe('theme tokens', () => {
  it('every theme passes WCAG contrast for text and puzzle marks', () => {
    for (const theme of Object.values(THEMES)) {
      for (const pair of CONTRAST_PAIRS) {
        const ratio = contrastRatio(theme.tokens[pair.fg], theme.tokens[pair.bg]);
        expect(
          ratio,
          `${theme.id}: ${pair.fg} on ${pair.bg} (${pair.why})`,
        ).toBeGreaterThanOrEqual(pair.min);
      }
    }
  });

  it('all four themes define the full token set', () => {
    expect(THEME_IDS).toEqual(['noir', 'candy', 'midnight', 'sunny']);
    const keys = Object.keys(THEMES.noir.tokens).sort();
    for (const theme of Object.values(THEMES)) {
      expect(Object.keys(theme.tokens).sort()).toEqual(keys);
    }
  });

  it('every theme defines its motion, glow and card-border tokens', () => {
    for (const theme of Object.values(THEMES)) {
      expect(theme.tokens['--motion']).toBeTruthy();
      expect(theme.tokens['--glow']).toBeTruthy();
      expect(theme.tokens['--card-border']).toBeTruthy();
    }
    // Midnight is slow and calm by design; the others are quicker.
    expect(THEMES.midnight.tokens['--motion']).toContain('0.6s');
    expect(THEMES.candy.tokens['--motion']).not.toContain('0.6s');
  });
});

describe('theme switching', () => {
  it('accepts all four theme ids and nothing else', () => {
    for (const id of THEME_IDS) expect(isThemeId(id)).toBe(true);
    for (const bad of ['duo-blue', '', null, undefined, 42]) {
      expect(isThemeId(bad)).toBe(false);
    }
  });

  it('resolves an unknown saved value to noir (no flash of a wrong theme)', () => {
    expect(resolveThemeId('midnight')).toBe('midnight');
    expect(resolveThemeId('sunny')).toBe('sunny');
    expect(resolveThemeId('candy')).toBe('candy');
    expect(resolveThemeId('not-a-theme')).toBe('noir');
    expect(resolveThemeId(null)).toBe('noir');
  });
});
