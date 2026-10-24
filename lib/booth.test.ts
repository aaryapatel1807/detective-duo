import { describe, expect, it } from 'vitest';
import {
  BOOTH_STYLES,
  COUNTDOWN_SECONDS,
  STORY_HEIGHT,
  STORY_WIDTH,
  STRIP_SHOTS,
  boothStyleById,
  canShareFiles,
  stripLayout,
} from './booth';

describe('photo booth', () => {
  it('ships all five styles from the brief', () => {
    expect(BOOTH_STYLES.map((s) => s.id)).toEqual([
      'classic',
      '35mm',
      'love-note',
      'after-hours',
      'date-plan',
    ]);
  });

  it('falls back to the classic strip for an unknown style', () => {
    expect(boothStyleById('nope').id).toBe('classic');
  });

  it('sizes strips for Instagram stories with three shots', () => {
    expect(STORY_WIDTH).toBe(1080);
    expect(STORY_HEIGHT).toBe(1920);
    expect(STRIP_SHOTS).toBe(3);
    expect(COUNTDOWN_SECONDS).toBe(3);
  });

  it('lays slots inside the canvas without overlap', () => {
    const { slots, caption } = stripLayout(STORY_WIDTH, STORY_HEIGHT, STRIP_SHOTS);
    expect(slots.length).toBe(3);
    for (let i = 1; i < slots.length; i++) {
      expect(slots[i]!.y).toBeGreaterThan(slots[i - 1]!.y + slots[i - 1]!.h);
    }
    const last = slots[slots.length - 1]!;
    expect(last.y + last.h).toBeLessThanOrEqual(caption.y);
    for (const s of slots) {
      expect(s.x).toBeGreaterThanOrEqual(0);
      expect(s.x + s.w).toBeLessThanOrEqual(STORY_WIDTH);
    }
  });

  it('reports share support safely in node (no navigator)', () => {
    expect(canShareFiles()).toBe(false);
  });
});
