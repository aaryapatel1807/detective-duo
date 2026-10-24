import { describe, expect, it } from 'vitest';
import {
  computeStreak,
  emptyDailyState,
  getDailyCipher,
  getDailyNonogram,
  getDailySet,
  getISTDateString,
  recordDailyCompletion,
} from './daily';

// localStorage is unavailable in node env; recordDailyCompletion's save
// is try/catch-guarded, so these tests exercise the pure parts.

describe('daily desk', () => {
  it('same IST date gives the identical daily set', () => {
    expect(getDailySet('2026-10-24')).toEqual(getDailySet('2026-10-24'));
  });

  it('different dates give different sets', () => {
    const a = getDailySet('2026-10-24');
    const b = getDailySet('2026-10-25');
    expect(
      a.cipher.encoded !== b.cipher.encoded ||
        JSON.stringify(a.nonogram.solution) !== JSON.stringify(b.nonogram.solution),
    ).toBe(true);
  });

  it('IST date flips at midnight IST, not midnight UTC', () => {
    // 2026-10-24 18:30 UTC = 2026-10-25 00:00 IST (UTC+5:30).
    expect(getISTDateString(new Date('2026-10-24T18:29:59Z'))).toBe('2026-10-24');
    expect(getISTDateString(new Date('2026-10-24T18:30:00Z'))).toBe('2026-10-25');
    expect(getISTDateString(new Date('2026-10-24T12:00:00Z'))).toBe('2026-10-24');
  });

  it('daily cipher fallback round-trips: encoded decodes to the plain text', () => {
    const c = getDailyCipher('2026-10-24');
    const decoded = c.encoded.replace(/[a-z]/gi, (ch) => {
      const base = ch >= 'a' ? 97 : 65;
      return String.fromCharCode(((ch.charCodeAt(0) - base - c.shift + 26 * 10) % 26) + base);
    });
    expect(decoded).toBe(c.plain);
  });

  it('daily nonogram clues match its solution', () => {
    const n = getDailyNonogram('2026-10-24');
    const runs = (line: boolean[]) => {
      const out: number[] = [];
      let run = 0;
      for (const cell of line) {
        if (cell) run++;
        else if (run) {
          out.push(run);
          run = 0;
        }
      }
      if (run) out.push(run);
      return out;
    };
    n.solution.forEach((row, r) => expect(n.rowClues[r]).toEqual(runs(row)));
    n.solution[0].forEach((_, c) =>
      expect(n.colClues[c]).toEqual(runs(n.solution.map((row) => row[c]))),
    );
  });

  it('streak increments only on completion, and repeats on the same day do not count twice', () => {
    let s = emptyDailyState();
    expect(computeStreak(s, '2026-10-24')).toBe(0);
    s = recordDailyCompletion(s, '2026-10-24', 'cipher');
    expect(computeStreak(s, '2026-10-24')).toBe(1);
    s = recordDailyCompletion(s, '2026-10-24', 'nonogram');
    expect(computeStreak(s, '2026-10-24')).toBe(1);
    s = recordDailyCompletion(s, '2026-10-25', 'cipher');
    expect(computeStreak(s, '2026-10-25')).toBe(2);
  });

  it('missing days do not penalise: the streak freezes, it never decrements on its own', () => {
    let s = emptyDailyState();
    s = recordDailyCompletion(s, '2026-10-24', 'cipher');
    s = recordDailyCompletion(s, '2026-10-25', 'cipher');
    expect(computeStreak(s, '2026-10-25')).toBe(2);
    // Two days pass with no play at all.
    expect(computeStreak(s, '2026-10-27')).toBe(2);
    expect(computeStreak(s, '2026-10-30')).toBe(2);
  });

  it('daily case rotates through the bank with no repeat until exhausted', () => {
    // Walk consecutive days and collect the rotated case ids.
    const ids: string[] = [];
    const start = new Date('2026-10-24T00:00:00Z');
    for (let i = 0; i < 40; i++) {
      const d = new Date(start.getTime() + i * 86_400_000);
      const iso = d.toISOString().slice(0, 10);
      const c = getDailySet(iso).dailyCase;
      expect(c, `no case on ${iso}`).not.toBeNull();
      ids.push(c!.id);
    }
    // First pass through the bank has no repeats; the cycle then restarts.
    const firstRepeat = ids.findIndex((id, i) => ids.indexOf(id) !== i);
    expect(firstRepeat).toBeGreaterThan(0);
    expect(ids.slice(0, firstRepeat).length).toBe(new Set(ids.slice(0, firstRepeat)).size);
    expect(ids[firstRepeat]).toBe(ids[0]);
  });
});
