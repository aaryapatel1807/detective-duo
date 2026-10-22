import { describe, expect, it } from 'vitest';
import { CONTRAST_PAIRS, THEMES, contrastRatio } from './themes';

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

  it('both Phase 1 themes define the full token set', () => {
    const keys = Object.keys(THEMES.noir.tokens).sort();
    for (const theme of Object.values(THEMES)) {
      expect(Object.keys(theme.tokens).sort()).toEqual(keys);
    }
  });
});
