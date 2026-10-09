import { describe, expect, it } from 'vitest';
import {
  boggleScore,
  canFormWord,
  totalScore,
  validateWord,
  wordHuntWinner,
  WORD_HUNT_MIN_LEN,
} from './logic';

const BANK = ['CRIME', 'CRIMSON', 'GHOST', 'MOON', 'SLEUTH'];

// Board (row-major):
//  C R I M
//  G H O S
//  L E U T
//  A B N D
const BOARD = [
  'C', 'R', 'I', 'M',
  'G', 'H', 'O', 'S',
  'L', 'E', 'U', 'T',
  'A', 'B', 'N', 'D',
];

describe('word-hunt logic', () => {
  it('scores by word length', () => {
    expect(boggleScore('MOON')).toBe(1);
    expect(boggleScore('GHOST')).toBe(2);
    expect(boggleScore('SLEUTH')).toBe(3);
    expect(boggleScore('CRIMSON')).toBe(5);
    expect(boggleScore('CRIMSONXX')).toBe(11);
  });

  it('rejects words with no adjacent path (CRIME cannot reach E from M)', () => {
    expect(canFormWord(BOARD, 'CRIME')).toBe(false);
  });

  it('rejects words that are not traceable', () => {
    expect(canFormWord(BOARD, 'SLEUTH')).toBe(false); // no adjacent path S-L-E-U-T-H
  });

  it('validates submissions', () => {
    expect(validateWord(BOARD, BANK, [], 'CRI')).toBe('too-short');
    expect(validateWord(BOARD, BANK, ['CRIME'], 'crime')).toBe('already-found');
    expect(validateWord(BOARD, BANK, [], 'ZEBRA')).toBe('not-in-dictionary');
    expect(validateWord(BOARD, BANK, [], 'SLEUTH')).toBe('not-on-board');
  });

  it('accepts a traceable dictionary word', () => {
    // G-H-O-S-T path: G(4)-H(5)-O(6)-S(7)-T(11)
    expect(canFormWord(BOARD, 'GHOST')).toBe(true);
    expect(validateWord(BOARD, BANK, [], 'GHOST')).toBe(null);
  });

  it('treats Q tiles as Qu', () => {
    // Q(0)-I(1)-T(2) is an adjacent chain; the Q tile covers "QU"
    const b = ['Q', 'I', 'T', 'X', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M'];
    expect(canFormWord(b, 'QUIT')).toBe(true);
  });

  it('totals scores with dedup', () => {
    expect(totalScore(['GHOST', 'ghost', 'MOON'])).toBe(2 + 1);
  });

  it('higher score wins; ties draw; null while running', () => {
    const words = { p1: ['GHOST'], p2: ['MOON'] };
    const done = { p1: true, p2: true };
    expect(wordHuntWinner(words, done, ['p1', 'p2'], 0, 1_000_000)).toBe('p1');
    expect(
      wordHuntWinner({ p1: ['MOON'], p2: ['MOON'] }, done, ['p1', 'p2'], 0, 1_000_000),
    ).toBe('draw');
    // still running: endsAt in the future, nobody done
    expect(wordHuntWinner(words, {}, ['p1', 'p2'], Date.now() + 60_000, Date.now())).toBe(null);
  });

  it('enforces the minimum length', () => {
    expect(WORD_HUNT_MIN_LEN).toBe(4);
  });
});
