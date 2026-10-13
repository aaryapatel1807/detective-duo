/* Game-UI kit helper unit tests. Keep it light: pure helpers only. */
import { describe, expect, it } from 'vitest';
import { clamp01, formatClock, formatNumber, isNewRecord, pad3, pctOf } from './helpers';

describe('formatClock', () => {
  it('formats plain seconds as MM:SS', () => {
    expect(formatClock(0)).toBe('00:00');
    expect(formatClock(7)).toBe('00:07');
    expect(formatClock(277)).toBe('04:37');
  });

  it('adds the hour component past one hour', () => {
    expect(formatClock(3600)).toBe('1:00:00');
    expect(formatClock(3725)).toBe('1:02:05');
  });

  it('floors fractional seconds and clamps negatives', () => {
    expect(formatClock(61.9)).toBe('01:01');
    expect(formatClock(-5)).toBe('00:00');
  });
});

describe('formatNumber', () => {
  it('groups thousands', () => {
    expect(formatNumber(1436)).toBe('1,436');
    expect(formatNumber(8192)).toBe('8,192');
    expect(formatNumber(0)).toBe('0');
  });

  it('rounds fractional input', () => {
    expect(formatNumber(1240.6)).toBe('1,241');
  });
});

describe('clamp01', () => {
  it('clamps out-of-range values', () => {
    expect(clamp01(-0.5)).toBe(0);
    expect(clamp01(1.5)).toBe(1);
    expect(clamp01(0.4)).toBeCloseTo(0.4);
  });

  it('returns 0 for non-finite input', () => {
    expect(clamp01(NaN)).toBe(0);
    expect(clamp01(Infinity)).toBe(0);
  });
});

describe('pctOf', () => {
  it('computes fill fraction', () => {
    expect(pctOf(50, 100)).toBeCloseTo(0.5);
    expect(pctOf(120, 100)).toBe(1);
  });

  it('returns 0 on zero/negative max (no NaN)', () => {
    expect(pctOf(5, 0)).toBe(0);
    expect(pctOf(5, -3)).toBe(0);
  });
});

describe('isNewRecord', () => {
  it('detects a beaten best', () => {
    expect(isNewRecord(9000, 8192)).toBe(true);
    expect(isNewRecord(8192, 8192)).toBe(false);
    expect(isNewRecord(0, 8192)).toBe(false);
  });
});

describe('pad3', () => {
  it('zero-pads and caps at 999', () => {
    expect(pad3(5)).toBe('005');
    expect(pad3(37)).toBe('037');
    expect(pad3(1000)).toBe('999');
  });
});
