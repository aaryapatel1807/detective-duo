/* Bomb Defusal logic tests — manual rules must match the Expert's manual. */
import { describe, expect, it } from 'vitest';
import {
  BOMB_TIME_MS,
  KEYPAD_SYMBOLS,
  MAX_STRIKES,
  PASSWORD_WORDS,
  SIMON_KEY,
  SIMON_ROUNDS,
  generateBomb,
  keypadPressOrder,
  passwordSpellable,
  simonExpected,
  validPasswords,
  wheelLetters,
  wireToCut,
  type WireColor,
} from './logic';

describe('wireToCut (manual §1)', () => {
  it('no red wires -> cut 2nd wire', () => {
    expect(wireToCut(['Y', 'B', 'W', 'K', 'Y'])).toBe(1);
  });
  it('last wire yellow (with red present) -> cut first red', () => {
    expect(wireToCut(['B', 'R', 'W', 'K', 'Y'])).toBe(1);
    expect(wireToCut(['R', 'B', 'R', 'W', 'Y'])).toBe(0);
  });
  it('exactly one blue, red present, last not yellow -> cut 1st wire', () => {
    expect(wireToCut(['R', 'B', 'W', 'K', 'W'])).toBe(0);
  });
  it('more yellow than red -> cut last wire', () => {
    expect(wireToCut(['R', 'Y', 'Y', 'B', 'B'])).toBe(4);
  });
  it('otherwise -> cut 2nd wire', () => {
    expect(wireToCut(['R', 'R', 'B', 'B', 'W'])).toBe(1);
  });
  it('rule order: no-red beats more-yellow-than-red', () => {
    // no red at all -> rule 1 wins even though yellows outnumber reds
    expect(wireToCut(['Y', 'Y', 'B', 'W', 'K'])).toBe(1);
  });
  it('always returns a valid index', () => {
    const wires: WireColor[] = ['R', 'Y', 'B', 'W', 'K'];
    for (let i = 0; i < 200; i++) {
      const w = wires.map(() => wires[Math.floor(Math.random() * 5)]);
      const idx = wireToCut(w);
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(5);
    }
  });
});

describe('keypadPressOrder (manual §2)', () => {
  it('sorts symbols by master-list order', () => {
    expect(keypadPressOrder(['☽', 'Ω', '♠', 'Δ'])).toEqual(['Ω', 'Δ', '♠', '☽']);
  });
  it('already-ordered input is unchanged', () => {
    const syms = ['Ψ', '☰', '☼'];
    expect(keypadPressOrder(syms)).toEqual(syms);
  });
  it('handles all 8 symbols', () => {
    const reversed = [...KEYPAD_SYMBOLS].reverse();
    expect(keypadPressOrder(reversed)).toEqual(KEYPAD_SYMBOLS);
  });
});

describe('simonExpected (manual §3)', () => {
  it('0 strikes key', () => {
    expect(simonExpected(['R', 'B', 'G', 'Y'], 0)).toEqual(['B', 'G', 'Y', 'R']);
  });
  it('1 strike key', () => {
    expect(simonExpected(['R', 'B', 'G', 'Y'], 1)).toEqual(['Y', 'R', 'B', 'G']);
  });
  it('2 strikes key', () => {
    expect(simonExpected(['R', 'B', 'G', 'Y'], 2)).toEqual(['G', 'Y', 'R', 'B']);
  });
  it('clamps strike counts above 2', () => {
    expect(simonExpected(['R'], 5)).toEqual(simonExpected(['R'], 2));
  });
  it('every flash maps to a valid color', () => {
    for (const s of [0, 1, 2]) {
      for (const c of Object.keys(SIMON_KEY[0])) {
        expect(['R', 'G', 'B', 'Y']).toContain(
          simonExpected([c as 'R'], s)[0],
        );
      }
    }
  });
});

describe('password wheels (manual §4)', () => {
  it('spellable checks each wheel position', () => {
    const wheels = [
      ['C', 'X', 'Q', 'Z', 'M', 'P'],
      ['A', 'O', 'I', 'E', 'U', 'Y'],
      ['T', 'G', 'D', 'K', 'L', 'N'],
    ];
    expect(passwordSpellable(wheels, 'CAT')).toBe(true);
    expect(passwordSpellable(wheels, 'DOG')).toBe(false);
    expect(passwordSpellable(wheels, 'CART')).toBe(false);
  });

  it('generated bombs have exactly one valid manual word', () => {
    for (let seed = 1; seed <= 25; seed++) {
      const { password } = generateBomb(seed);
      const valid = validPasswords(password.wheels);
      expect(valid).toHaveLength(1);
      expect(valid[0]).toBe(password.answer);
      expect(PASSWORD_WORDS).toContain(password.answer);
    }
  });

  it('wheelLetters reads the current positions', () => {
    const wheels = [
      ['A', 'B', 'C', 'D', 'E', 'F'],
      ['G', 'H', 'I', 'J', 'K', 'L'],
      ['M', 'N', 'O', 'P', 'Q', 'R'],
    ];
    expect(wheelLetters(wheels, [0, 0, 0])).toEqual(['A', 'G', 'M']);
    expect(wheelLetters(wheels, [5, 3, 1])).toEqual(['F', 'J', 'N']);
  });
});

describe('generateBomb', () => {
  it('is deterministic per seed', () => {
    expect(generateBomb(42)).toEqual(generateBomb(42));
  });
  it('differs across seeds', () => {
    expect(generateBomb(1).wires).not.toEqual(generateBomb(2).wires);
  });
  it('builds 5 wires, 4 distinct keypad symbols, simon rounds', () => {
    const b = generateBomb(7);
    expect(b.wires).toHaveLength(5);
    expect(new Set(b.keypad).size).toBe(4);
    expect(b.simon).toHaveLength(SIMON_ROUNDS);
    b.simon.forEach((seq) => expect(seq.length).toBeGreaterThan(0));
  });
});

describe('constants', () => {
  it('bomb timer is 5:00 and 3 strikes lose', () => {
    expect(BOMB_TIME_MS).toBe(5 * 60 * 1000);
    expect(MAX_STRIKES).toBe(3);
  });
});
