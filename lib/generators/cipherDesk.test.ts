import { describe, expect, it } from 'vitest';
import { CIPHER_SENTENCES } from '../content/cipher-sentences';
import {
  decodeAtbash,
  decodeCaesar,
  decodePuzzle,
  decodeRailFence,
  decodeSubstitution,
  decodeVigenere,
  encodeAtbash,
  encodeCaesar,
  encodePuzzle,
  encodeRailFence,
  encodeSubstitution,
  encodeVigenere,
  generateLevelPuzzle,
  generatePuzzle,
  levelSeed,
  tierForLevel,
  type CipherStep,
} from './cipherDesk';

const SAMPLE =
  "The teapot whistled just as the rain began to fall, and Mabel looked up from her crossword!";

describe('cipher primitives round-trip', () => {
  it('caesar across shifts', () => {
    for (let shift = 1; shift <= 25; shift++) {
      expect(decodeCaesar(encodeCaesar(SAMPLE, shift), shift)).toBe(SAMPLE);
    }
  });
  it('atbash is its own inverse', () => {
    expect(decodeAtbash(encodeAtbash(SAMPLE))).toBe(SAMPLE);
    expect(encodeAtbash(encodeAtbash(SAMPLE))).toBe(SAMPLE);
  });
  it('rail fence across rail counts and lengths', () => {
    for (const rails of [2, 3, 4, 5]) {
      for (const text of [SAMPLE, 'Hello world', 'A', 'Ab', 'The quick brown fox']) {
        expect(decodeRailFence(encodeRailFence(text, rails), rails)).toBe(text);
      }
    }
  });
  it('vigenere across keys', () => {
    for (const key of ['TEA', 'LANTERN', 'JASMINE', 'KEY', 'POCKET']) {
      expect(decodeVigenere(encodeVigenere(SAMPLE, key), key)).toBe(SAMPLE);
    }
  });
  it('substitution across keys', () => {
    for (const key of [
      'QWERTYUIOPASDFGHJKLZXCVBNM',
      'ZYXWVUTSRQPONMLKJIHGFEDCBA',
      'PHQGIUMEAYLNOFDXJKRCVSTZWB',
    ]) {
      expect(decodeSubstitution(encodeSubstitution(SAMPLE, key), key)).toBe(SAMPLE);
    }
  });
});

describe('cipher desk generator', () => {
  it('is deterministic: same seed, same puzzle', () => {
    const a = generatePuzzle('cd|tester|17', 17);
    const b = generatePuzzle('cd|tester|17', 17);
    expect(b).toEqual(a);
  });

  it('levelSeed is stable and salt-sensitive', () => {
    expect(levelSeed(3, 'a')).toBe(levelSeed(3, 'a'));
    expect(levelSeed(3, 'a')).not.toBe(levelSeed(3, 'b'));
    expect(levelSeed(3, 'a')).not.toBe(levelSeed(4, 'a'));
  });

  it('follows the tier ladder', () => {
    expect(tierForLevel(1).tier).toBe('Easy');
    expect(tierForLevel(10).tier).toBe('Easy');
    expect(tierForLevel(11).tier).toBe('Medium');
    expect(tierForLevel(30).tier).toBe('Medium');
    expect(tierForLevel(31).tier).toBe('Hard');
    expect(tierForLevel(60).tier).toBe('Hard');
    expect(tierForLevel(61).tier).toBe('Expert');
    expect(tierForLevel(61).layers).toBe(2);
    expect(tierForLevel(61).twist).toBe('none');
    expect(tierForLevel(71).twist).toBe('reversed');
    expect(tierForLevel(81).twist).toBe('extra-layer');
    expect(tierForLevel(81).layers).toBe(2); // layers field is the base; extra-layer adds one
    const p81 = generateLevelPuzzle(81, 'twist');
    expect(p81.steps.length).toBe(3);
    expect(p81.twist).toBe('extra-layer');
    const p71 = generateLevelPuzzle(71, 'twist');
    expect(p71.twist).toBe('reversed');
  });

  it('every cipher type appears in its tier band', () => {
    const easyKinds = new Set<string>();
    for (let l = 1; l <= 10; l++) {
      for (const s of generateLevelPuzzle(l, 'bands').steps) easyKinds.add(s.kind);
    }
    expect([...easyKinds].sort()).toEqual(['atbash', 'caesar']);
    const mediumKinds = new Set<string>();
    for (let l = 11; l <= 30; l++) {
      for (const s of generateLevelPuzzle(l, 'bands').steps) mediumKinds.add(s.kind);
    }
    expect(mediumKinds.has('railfence')).toBe(true);
    expect(mediumKinds.has('vigenere')).toBe(true);
    expect(mediumKinds.has('substitution')).toBe(false);
    const hardKinds = new Set<string>();
    for (let l = 31; l <= 60; l++) {
      for (const s of generateLevelPuzzle(l, 'bands').steps) hardKinds.add(s.kind);
    }
    expect(hardKinds.has('substitution')).toBe(true);
  });

  it('encode -> decode round-trips for every level 1-120, layered included', () => {
    for (let level = 1; level <= 120; level++) {
      const p = generateLevelPuzzle(level, 'roundtrip');
      expect(decodePuzzle(p.ciphertext, p.steps, p.twist), `level ${level}`).toBe(p.plaintext);
      expect(encodePuzzle(p.plaintext, p.steps, p.twist), `level ${level}`).toBe(p.ciphertext);
      expect(p.ciphertext).not.toBe(p.plaintext);
      if (level >= 61) expect(p.steps.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('layered puzzles decode with explicit step stacks', () => {
    const steps: CipherStep[] = [
      { kind: 'caesar', shift: 7 },
      { kind: 'vigenere', key: 'LANTERN' },
    ];
    const ct = encodePuzzle(SAMPLE, steps, 'none');
    expect(decodePuzzle(ct, steps, 'none')).toBe(SAMPLE);
    const rev = encodePuzzle(SAMPLE, steps, 'reversed');
    expect(decodePuzzle(rev, steps, 'reversed')).toBe(SAMPLE);
    const three: CipherStep[] = [
      { kind: 'atbash' },
      { kind: 'railfence', rails: 3 },
      { kind: 'substitution', key: 'QWERTYUIOPASDFGHJKLZXCVBNM' },
    ];
    const ct3 = encodePuzzle(SAMPLE, three, 'none');
    expect(decodePuzzle(ct3, three, 'none')).toBe(SAMPLE);
  });

  it('substitution puzzles carry frequency hints', () => {
    let seen = 0;
    for (let l = 31; l <= 60; l++) {
      const p = generateLevelPuzzle(l, 'freq');
      if (p.steps.some((s) => s.kind === 'substitution')) {
        seen++;
        expect(p.frequencyHints.length).toBeGreaterThan(0);
        for (const h of p.frequencyHints) {
          expect(h.count).toBeGreaterThan(0);
          expect(p.ciphertext).toContain(h.letter);
        }
      }
    }
    expect(seen).toBeGreaterThan(0);
  });

  it('sentence bank has 120+ sentences across 10+ themes', () => {
    expect(CIPHER_SENTENCES.length).toBeGreaterThanOrEqual(120);
    expect(new Set(CIPHER_SENTENCES.map((s) => s.theme)).size).toBeGreaterThanOrEqual(10);
    for (const s of CIPHER_SENTENCES) {
      expect(s.text).toMatch(/^[A-Za-z0-9 ,.'!?-]+$/);
    }
  });
});
