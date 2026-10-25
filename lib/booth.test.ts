import { describe, expect, it } from 'vitest';
import {
  BOOTH_FILTERS,
  BOOTH_STYLES,
  COUNTDOWN_SECONDS,
  MEME_POSES,
  POSE_IDEAS,
  STORY_HEIGHT,
  STORY_WIDTH,
  STRIP_SHOTS,
  boothStyleById,
  canComposite,
  canShareFiles,
  duoTurnNames,
  interleaveShots,
  layoutSlots,
  pickPoses,
  scrapbookPageSize,
  shotTimeline,
  stripDateLine,
  stripLayout,
} from './booth';

describe('photo booth', () => {
  it('ships the original five styles plus the new frame styles', () => {
    expect(BOOTH_STYLES.map((s) => s.id)).toEqual([
      'classic',
      '35mm',
      'love-note',
      'after-hours',
      'date-plan',
      'hearts',
      'stars',
      'birthday',
      'doodle',
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

describe('photo booth upgrade (phases 1–6)', () => {
  it('phase 1: every shot gets a pose card and a full countdown first', () => {
    const events = shotTimeline(3);
    const captures = events.filter((e) => e.type === 'capture');
    expect(captures).toHaveLength(3);
    for (const cap of captures) {
      const i = events.indexOf(cap);
      // pose card, then 3, 2, 1, then the capture — in order
      expect(events[i - 4]).toMatchObject({ type: 'pose', shot: cap.shot });
      expect(events[i - 3]).toMatchObject({ type: 'tick', shot: cap.shot, count: 3 });
      expect(events[i - 2]).toMatchObject({ type: 'tick', shot: cap.shot, count: 2 });
      expect(events[i - 1]).toMatchObject({ type: 'tick', shot: cap.shot, count: 1 });
      // a pose gap, not a burst: capture is never right after the last one
      if (cap.shot > 0) {
        const prev = captures[cap.shot - 1]!;
        expect(cap.at - prev.at).toBeGreaterThanOrEqual(3000 + COUNTDOWN_SECONDS * 1000);
      }
    }
    expect(events[events.length - 1]).toMatchObject({ type: 'done' });
  });

  it('phase 1: pose picks never repeat within a strip', () => {
    const picks = pickPoses(POSE_IDEAS, 3, () => 0.5);
    expect(picks).toHaveLength(3);
    expect(new Set(picks.map((p) => p.id)).size).toBe(3);
    expect(pickPoses([], 3)).toEqual([]);
    expect(pickPoses(POSE_IDEAS, 0)).toEqual([]);
  });

  it('phase 1: a strip never composites with a missing shot', () => {
    expect(canComposite(2, 3)).toBe(false);
    expect(canComposite(3, 3)).toBe(true);
    expect(canComposite(4, 3)).toBe(true);
  });

  it('phase 3: filters ship with a live-preview CSS string each', () => {
    expect(BOOTH_FILTERS.map((f) => f.id)).toContain('bw');
    expect(BOOTH_FILTERS.map((f) => f.id)).toContain('vintage');
    expect(BOOTH_FILTERS.length).toBeGreaterThanOrEqual(10);
    for (const f of BOOTH_FILTERS) expect(typeof f.css).toBe('string');
  });

  it('phase 3: grid and polaroid layouts stay inside the canvas', () => {
    const grid = layoutSlots('grid', STORY_WIDTH, STORY_HEIGHT, 4);
    expect(grid.slots).toHaveLength(4);
    const polaroid = layoutSlots('polaroid', STORY_WIDTH, STORY_HEIGHT, 1);
    expect(polaroid.slots).toHaveLength(1);
    for (const { slots, caption } of [grid, polaroid]) {
      for (const s of slots) {
        expect(s.x).toBeGreaterThanOrEqual(0);
        expect(s.x + s.w).toBeLessThanOrEqual(STORY_WIDTH);
        expect(s.y + s.h).toBeLessThanOrEqual(caption.y);
      }
    }
    // grid slots don't overlap
    const [a, b, c, d] = grid.slots;
    expect(b!.x).toBeGreaterThan(a!.x + a!.w);
    expect(c!.y).toBeGreaterThan(a!.y + a!.h);
    expect(d!.x).toBeGreaterThan(c!.x + c!.w);
  });

  it('phase 3: the date stamp formats like the caption band expects', () => {
    expect(stripDateLine(new Date(2026, 9, 25))).toBe('25 Oct 2026');
  });

  it('phase 4: meme poses are original couple poses, not copies', () => {
    expect(MEME_POSES.length).toBeGreaterThanOrEqual(10);
    for (const p of MEME_POSES) {
      expect(p.title.length).toBeGreaterThan(0);
      expect(p.hint.length).toBeGreaterThan(0);
    }
    expect(BOOTH_STYLES.find((s) => s.id === 'birthday')?.dividerText).toBe('HAPPY BIRTHDAY');
  });

  it('phase 5: scrapbook pages are the promised sizes', () => {
    expect(scrapbookPageSize('4:5')).toEqual({ w: 1080, h: 1350 });
    expect(scrapbookPageSize('9:16')).toEqual({ w: 1080, h: 1920 });
  });

  it('phase 6: together strips interleave mine and theirs', () => {
    expect(interleaveShots(['a1', 'a2'], ['b1', 'b2'])).toEqual(['a1', 'b1', 'a2', 'b2']);
    expect(interleaveShots(['a1'], ['b1', 'b2', 'b3'])).toEqual(['a1', 'b1', 'b2', 'b3']);
    expect(interleaveShots([], [])).toEqual([]);
  });

  it('phase 6: duo turns alternate shooters', () => {
    expect(duoTurnNames(4, 'You', 'Partner')).toEqual(['You', 'Partner', 'You', 'Partner']);
    expect(duoTurnNames(1, 'A', 'B')).toEqual(['A']);
  });
});
