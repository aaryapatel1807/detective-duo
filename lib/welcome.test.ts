import { describe, expect, it } from 'vitest';
import {
  GREETING_LETTERS,
  WELCOME_SEEN_KEY,
  clearWelcomeSeen,
  greetingProgressAt,
  greetingTotalSeconds,
  isWelcomeSeen,
  markWelcomeSeen,
} from './welcome';

function stubStorage(initial: Record<string, string> = {}) {
  const store = { ...initial };
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => {
      store[k] = v;
    },
    removeItem: (k: string) => {
      delete store[k];
    },
    _store: store,
  };
}

describe('welcome intro', () => {
  it('shows until "Come in" is tapped, then stays seen', () => {
    const s = stubStorage();
    expect(isWelcomeSeen(s)).toBe(false);
    markWelcomeSeen(s);
    expect(s._store[WELCOME_SEEN_KEY]).toBe('1');
    expect(isWelcomeSeen(s)).toBe(true);
    clearWelcomeSeen(s);
    expect(isWelcomeSeen(s)).toBe(false);
  });

  it('treats missing or throwing storage as unseen', () => {
    expect(isWelcomeSeen(null)).toBe(false);
    expect(isWelcomeSeen(undefined)).toBe(false);
  });

  it('writes "hey Sachi" in about 2.5s', () => {
    expect(GREETING_LETTERS.map((l) => l.ch).join('')).toBe('hey Sachi');
    expect(greetingTotalSeconds()).toBeCloseTo(2.5, 5);
  });

  it('reveals letter by letter, from nothing to everything', () => {
    expect(greetingProgressAt(0)).toBe(0);
    const mid = greetingProgressAt(1250);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);
    expect(greetingProgressAt(99999)).toBe(1);
    expect(greetingProgressAt(1250)).toBeLessThan(greetingProgressAt(2000));
  });
});
