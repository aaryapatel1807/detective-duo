import { describe, expect, it } from 'vitest';
import {
  DEFAULT_DATE_LISTS,
  cleanList,
  cleanLists,
  rollDateNight,
  rollDateNightSeeded,
} from './datenight';

describe('roll a date night', () => {
  it('ships four non-empty default lists', () => {
    for (const key of ['dinner', 'activity', 'treat', 'entertainment'] as const) {
      expect(DEFAULT_DATE_LISTS[key].length).toBeGreaterThan(0);
    }
  });

  it('cleans lists: trims, drops empties, dedupes, caps', () => {
    expect(cleanList(['  Pasta ', '', 'pasta', 'Soup', 'soup  '])).toEqual([
      'Pasta',
      'Soup',
    ]);
    expect(cleanList(Array.from({ length: 50 }, (_, i) => `Item ${i}`))).toHaveLength(40);
  });

  it('rolls one pick from each list', () => {
    const roll = rollDateNight(DEFAULT_DATE_LISTS);
    expect(DEFAULT_DATE_LISTS.dinner).toContain(roll.dinner);
    expect(DEFAULT_DATE_LISTS.activity).toContain(roll.activity);
    expect(DEFAULT_DATE_LISTS.treat).toContain(roll.treat);
    expect(DEFAULT_DATE_LISTS.entertainment).toContain(roll.entertainment);
  });

  it('rolls the same plan for the same seed (shared room rolls)', () => {
    const a = rollDateNightSeeded(DEFAULT_DATE_LISTS, 'room|ABCD|3');
    const b = rollDateNightSeeded(DEFAULT_DATE_LISTS, 'room|ABCD|3');
    expect(a).toEqual({ ...b, at: a.at });
    expect(a.dinner).toBe(b.dinner);
    const c = rollDateNightSeeded(DEFAULT_DATE_LISTS, 'room|ABCD|4');
    expect(
      [c.dinner, c.activity, c.treat, c.entertainment].join('|') !==
        [a.dinner, a.activity, a.treat, a.entertainment].join('|'),
    ).toBe(true);
  });

  it('falls back gracefully when a list is empty', () => {
    const roll = rollDateNightSeeded(cleanLists({ dinner: [] }), 'x');
    expect(roll.dinner).toBe('Anything you like');
  });
});
