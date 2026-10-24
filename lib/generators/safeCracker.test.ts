import { describe, expect, it } from 'vitest';
import {
  allCandidates,
  blunderChance,
  botGuess,
  botOpener,
  candidatesAfter,
  filterCandidates,
  generateCode,
  isCracked,
  markGuess,
  paramsForLevel,
  versusProgress,
  type GuessRecord,
} from './safeCracker';
import { rngFromSeed } from './rng';

describe('safeCracker marking', () => {
  it('marks exact and misplaced digits', () => {
    expect(markGuess([1, 2, 3, 4], [1, 2, 3, 4])).toEqual({ rightPlace: 4, rightDigit: 0 });
    expect(markGuess([4, 3, 2, 1], [1, 2, 3, 4])).toEqual({ rightPlace: 0, rightDigit: 4 });
    expect(markGuess([5, 6, 7, 8], [1, 2, 3, 4])).toEqual({ rightPlace: 0, rightDigit: 0 });
  });

  it('counts each secret digit at most once with duplicates', () => {
    // Secret 1,1,2 vs guess 1,2,1: first 1 is exact; the other 1 and 2 swap.
    expect(markGuess([1, 2, 1], [1, 1, 2])).toEqual({ rightPlace: 1, rightDigit: 2 });
    // Secret 1,1,2 vs guess 1,1,1: two exact, the extra 1 matches nothing.
    expect(markGuess([1, 1, 1], [1, 1, 2])).toEqual({ rightPlace: 2, rightDigit: 0 });
  });
});

describe('safeCracker codes', () => {
  it('scales digits, pool and repeats by tier', () => {
    expect(paramsForLevel(1)).toEqual({ digits: 4, pool: 10, repeats: false });
    expect(paramsForLevel(20)).toEqual({ digits: 4, pool: 10, repeats: true });
    expect(paramsForLevel(40)).toEqual({ digits: 5, pool: 10, repeats: true });
    expect(paramsForLevel(70)).toEqual({ digits: 6, pool: 6, repeats: true });
  });

  it('is deterministic for the same seed and differs across levels', () => {
    expect(generateCode('s|1', 1)).toEqual(generateCode('s|1', 1));
    expect(generateCode('s|1', 1)).not.toEqual(generateCode('s|2', 2));
    const code = generateCode('x', 1);
    expect(code.length).toBe(4);
    expect(new Set(code).size).toBe(4); // no repeats on Easy
  });

  it('the low-level bot blunders on purpose, the sharp bot does not', () => {
    expect(blunderChance(5)).toBeGreaterThan(0);
    expect(blunderChance(50)).toBe(0);
    const p = paramsForLevel(1);
    const cands = [[1, 2, 3, 4]];
    // rng always 0.99: no blunder -> returns the only consistent candidate.
    expect(botGuess(p, cands, 1, () => 0.99)).toEqual([1, 2, 3, 4]);
    // Blunder rng: first call 0.0 (< 0.3) triggers the blunder, then varied
    // draws so the no-repeat code builder terminates.
    const seq = [0.0, 0.15, 0.35, 0.55, 0.75, 0.95];
    let si = 0;
    const blunderRng = () => seq[si++ % seq.length];
    const blunder = botGuess(p, cands, 1, blunderRng);
    expect(blunder.length).toBe(4);
    expect(blunder.every((d) => d >= 0 && d < 10)).toBe(true);
    expect(new Set(blunder).size).toBe(4);
  });
});

describe('safeCracker solver', () => {
  it('a consistent-candidate solver cracks Easy codes quickly', () => {
    for (const seed of ['a', 'b', 'c', 'd', 'e']) {
      const secret = generateCode(seed, 1);
      const p = paramsForLevel(1);
      let cands = allCandidates(p);
      const rng = rngFromSeed(`solve-${seed}`);
      let guesses = 0;
      let guess = botOpener(p);
      while (!isCracked(guess, secret) && guesses < 12) {
        const m = markGuess(guess, secret);
        cands = filterCandidates(cands, guess, m);
        expect(cands.length).toBeGreaterThan(0);
        guess = botGuess(p, cands, 50, rng); // sharp: no blunders
        guesses++;
      }
      expect(isCracked(guess, secret)).toBe(true);
      expect(guesses).toBeLessThan(12);
    }
  });

  it('versus progress is 0 fresh, 1 cracked, and grows as candidates fall', () => {
    const p = paramsForLevel(1);
    expect(versusProgress(p, [], false)).toBe(0);
    expect(versusProgress(p, [], true)).toBe(1);
    const secret = generateCode('prog', 1);
    const history: GuessRecord[] = [];
    let guess = botOpener(p);
    const m = markGuess(guess, secret);
    history.push({ guess, mark: m });
    const prog = versusProgress(p, history, false);
    expect(prog).toBeGreaterThan(0);
    expect(prog).toBeLessThan(1);
    expect(candidatesAfter(p, history).length).toBeLessThan(allCandidates(p).length);
  });
});
