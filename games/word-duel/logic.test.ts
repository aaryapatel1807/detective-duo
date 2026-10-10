import { describe, expect, it } from 'vitest';
import {
  addGuess,
  isWinningGuess,
  solvedIn,
  wordDuelWinner,
  wordleFeedback,
  WORD_DUEL_TRIES,
} from './logic';

describe('word-duel logic', () => {
  it('marks correct / present / absent letters', () => {
    expect(wordleFeedback('CRIME', 'CRANE')).toEqual([
      'correct',
      'correct',
      'absent',
      'absent',
      'correct',
    ]);
  });

  it('handles duplicate letters correctly', () => {
    // secret has one E; guess has two
    expect(wordleFeedback('SLEUTH', 'EERIE')).toEqual([
      'present',
      'absent',
      'absent',
      'absent',
      'absent',
    ]);
  });

  it('detects winning guesses', () => {
    expect(isWinningGuess('CRIME', 'crime')).toBe(true);
    expect(isWinningGuess('CRIME', 'CRANE')).toBe(false);
  });

  it('reports the try count of a solve', () => {
    expect(solvedIn('CRIME', ['CRANE', 'CRIME'])).toBe(2);
    expect(solvedIn('CRIME', ['CRANE'])).toBe(null);
  });

  it('caps guesses at the try limit', () => {
    const full = addGuess({ p1: ['AAAAA'] }, 'p1', 'BBBBB');
    const g = { p1: Array(WORD_DUEL_TRIES).fill('AAAAA') };
    expect(addGuess(g, 'p1', 'BBBBB')).toBe(g);
    expect(full.p1).toHaveLength(2);
  });

  it('fewer tries wins; equal tries draw', () => {
    const secrets = { p1: 'CRIME', p2: 'GHOST' };
    const guesses = { p1: ['XXXXX', 'GHOST'], p2: ['XXXXX', 'XXXXX', 'CRIME'] };
    expect(wordDuelWinner(secrets, guesses, ['p1', 'p2'])).toBe('p1');

    const tie = { p1: ['GHOST'], p2: ['CRIME'] };
    expect(wordDuelWinner(secrets, tie, ['p1', 'p2'])).toBe('draw');
  });

  it('solver beats an exhausted opponent', () => {
    const secrets = { p1: 'CRIME', p2: 'GHOST' };
    const guesses = {
      p1: ['GHOST'],
      p2: Array(WORD_DUEL_TRIES).fill('WRONG'),
    };
    expect(wordDuelWinner(secrets, guesses, ['p1', 'p2'])).toBe('p1');
  });

  it('both exhausted with no solve is a draw', () => {
    const secrets = { p1: 'CRIME', p2: 'GHOST' };
    const guesses = {
      p1: Array(WORD_DUEL_TRIES).fill('WRONG'),
      p2: Array(WORD_DUEL_TRIES).fill('WRONG'),
    };
    expect(wordDuelWinner(secrets, guesses, ['p1', 'p2'])).toBe('draw');
  });

  it('game stays open while someone can still solve', () => {
    const secrets = { p1: 'CRIME', p2: 'GHOST' };
    const guesses = { p1: ['GHOST'], p2: ['XXXXX'] };
    // p1 solved already but p2 still has tries — still open
    expect(wordDuelWinner(secrets, guesses, ['p1', 'p2'])).toBe(null);
  });
});
