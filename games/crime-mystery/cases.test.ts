/* Crime Mystery case-bank tests: every case must be fair, asymmetric, solvable. */
import { describe, expect, it } from 'vitest';
import { validateCaseFile } from '../../lib/content/cases';
import { ALL_CASES } from './cases';
import { INTERROGATIONS, HINT_EXTRAS } from './qa';
import { exclusiveCounts } from './logic';

describe('crime-mystery case bank', () => {
  it('has the 2 bank cases plus 7 authored cases (9 total)', () => {
    expect(ALL_CASES.length).toBe(9);
    const ids = ALL_CASES.map((c) => c.id);
    expect(ids).toContain('quiet-vault');
    expect(ids).toContain('midnight-express');
    expect(new Set(ids).size).toBe(ids.length); // unique ids
  });

  it('validateCaseFile() returns [] for every case', () => {
    for (const c of ALL_CASES) {
      expect(validateCaseFile(c), `case ${c.id}`).toEqual([]);
    }
  });

  it('every case has >=1 a-only and >=1 b-only clue (asymmetric dealing)', () => {
    for (const c of ALL_CASES) {
      const { a, b } = exclusiveCounts(c);
      expect(a, `${c.id} a-only`).toBeGreaterThan(0);
      expect(b, `${c.id} b-only`).toBeGreaterThan(0);
    }
  });

  it('culprit is one of the suspects and solutions name the deduction', () => {
    for (const c of ALL_CASES) {
      expect(c.suspects.map((s) => s.name)).toContain(c.culprit);
      expect(c.solution.length).toBeGreaterThan(50);
    }
  });

  it('difficulty escalates: clue counts grow across the authored cases', () => {
    const authored = ALL_CASES.filter(
      (c) => c.id !== 'quiet-vault' && c.id !== 'midnight-express',
    );
    const counts = authored.map((c) => c.clues.length);
    expect(counts).toEqual([5, 6, 7, 8, 10, 11, 12]);
    const diffs = authored.map((c) => c.difficulty);
    expect(diffs).toEqual([
      'easy',
      'easy',
      'medium',
      'medium',
      'hard',
      'hard',
      'hard',
    ]);
  });

  it('every suspect in every case has 4+ interrogation Q&A pairs', () => {
    for (const c of ALL_CASES) {
      const qa = INTERROGATIONS[c.id];
      expect(qa, `interrogations for ${c.id}`).toBeDefined();
      for (const s of c.suspects) {
        const pairs = qa[s.name];
        expect(pairs, `${c.id} / ${s.name}`).toBeDefined();
        expect(pairs.length).toBeGreaterThanOrEqual(4);
        for (const p of pairs) {
          expect(p.q.length).toBeGreaterThan(0);
          expect(p.a.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('culprits never confess outright in interrogations', () => {
    const confess = /i did it|i killed|i murdered|i poisoned|i\'m guilty|i am guilty/i;
    for (const c of ALL_CASES) {
      for (const p of INTERROGATIONS[c.id][c.culprit] ?? []) {
        expect(p.a).not.toMatch(confess);
      }
    }
  });

  it('every case has hint extras (bonus clue + nudges)', () => {
    for (const c of ALL_CASES) {
      const ex = HINT_EXTRAS[c.id];
      expect(ex, `hint extras for ${c.id}`).toBeDefined();
      expect(ex.bonus.split).toBe('both');
      expect(ex.bonus.text.length).toBeGreaterThan(20);
      expect(ex.nudges.length).toBeGreaterThanOrEqual(2);
    }
  });
});
