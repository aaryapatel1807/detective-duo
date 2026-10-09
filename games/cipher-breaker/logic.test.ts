import { describe, expect, it } from 'vitest';
import {
  checkAnswer,
  evidenceTokenCount,
  grantToken,
  makeHintToken,
  normalizeAnswer,
} from './logic';
import { BREAKER_CIPHERS } from './content';
import { caesarDecode, atbashDecode } from '../../../lib/content/ciphers';

describe('cipher-breaker logic', () => {
  it('normalizes answers for comparison', () => {
    expect(normalizeAnswer('  hello,  WORLD! ')).toBe('HELLO WORLD');
  });

  it('accepts correct decodings regardless of case/spacing', () => {
    expect(checkAnswer('THE DEAD DROP IS UNDER THE BRIDGE', 'the dead drop is under the bridge')).toBe(true);
    expect(checkAnswer('THE DEAD DROP IS UNDER THE BRIDGE', 'THE  DEAD DROP IS UNDER THE BRIDGE ')).toBe(true);
    expect(checkAnswer('THE DEAD DROP IS UNDER THE BRIDGE', 'WRONG ANSWER HERE')).toBe(false);
  });

  it('ships 8 ciphers, all decodable with the documented method', () => {
    expect(BREAKER_CIPHERS).toHaveLength(8);
    for (const c of BREAKER_CIPHERS) {
      const decoded =
        c.type === 'caesar'
          ? caesarDecode(c.message, c.id === 'c-6' ? 7 : c.id === 'c-8' ? 12 : c.id === 'c-2' ? 4 : c.id === 'c-4' ? 5 : 3)
          : atbashDecode(c.message);
      expect(checkAnswer(c.solution, decoded), c.id).toBe(true);
      expect(c.keyword.length).toBeGreaterThan(0);
    }
  });

  it('builds hint tokens with the required shape', () => {
    const t = makeHintToken('BRIDGE', 123);
    expect(t).toEqual({ from: 'cipher-breaker', text: 'Hint token: BRIDGE', at: 123 });
  });

  it('grants tokens immutably and counts evidence tokens', () => {
    const tokens = grantToken([], 'BRIDGE');
    expect(tokens).toHaveLength(1);
    const tokens2 = grantToken(tokens, 'SAFE');
    expect(tokens).toHaveLength(1); // original untouched
    expect(tokens2).toHaveLength(2);
    expect(evidenceTokenCount(tokens2)).toBe(2);
    expect(evidenceTokenCount(undefined)).toBe(0);
    expect(evidenceTokenCount([...tokens2, { from: 'other', text: 'x', at: 1 }])).toBe(2);
  });
});
