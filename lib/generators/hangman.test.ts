import { describe, expect, it } from 'vitest';
import {
  MAX_LIVES,
  createCustomHangmanGame,
  createHangmanGame,
  createHangmanWord,
  generateAnyHangman,
  generateHangman,
  guessLetter,
  maskedWord,
  parseCustomWord,
  revealHint,
  wordsForLevel,
  wrongGuesses,
} from './hangman';

describe('hangman', () => {
  it('picks the same word for the same seed and level, and longer words at higher levels', () => {
    expect(generateHangman('s', 1)).toEqual(generateHangman('s', 1));
    expect(createHangmanGame('s', 1)).toEqual(createHangmanGame('s', 1));
    expect(generateAnyHangman('s')).toEqual(generateAnyHangman('s'));
    const easy = wordsForLevel(1);
    const medium = wordsForLevel(20);
    const hard = wordsForLevel(50);
    const expert = wordsForLevel(70);
    const maxLen = (words: { word: string }[]) => Math.max(...words.map((w) => w.word.length));
    const minLen = (words: { word: string }[]) => Math.min(...words.map((w) => w.word.length));
    expect(maxLen(easy)).toBeLessThanOrEqual(5);
    expect(minLen(medium)).toBeGreaterThanOrEqual(6);
    expect(minLen(hard)).toBeGreaterThanOrEqual(8);
    expect(minLen(expert)).toBeGreaterThanOrEqual(10);
    for (const pool of [easy, medium, hard, expert]) {
      for (const entry of pool) {
        expect(entry.word).toMatch(/^[a-z]+$/);
        expect(['Animals', 'Food', 'Places', 'Things']).toContain(entry.category);
      }
    }
    // No word is banked twice.
    const all = [...easy, ...medium, ...hard, ...expert].map((w) => w.word);
    expect(new Set(all).size).toBe(all.length);
  });

  it('a correct guess reveals every matching position and costs no life', () => {
    const start = createHangmanWord({ word: 'banana', category: 'Food' });
    const after = guessLetter(start, 'a');
    expect(maskedWord(after)).toEqual(['_', 'a', '_', 'a', '_', 'a']);
    expect(after.lives).toBe(MAX_LIVES);
    expect(after.status).toBe('playing');
    expect(wrongGuesses(after)).toEqual([]);
  });

  it('a wrong guess costs exactly one life and is marked wrong', () => {
    const start = createHangmanWord({ word: 'banana', category: 'Food' });
    const after = guessLetter(start, 'z');
    expect(after.lives).toBe(MAX_LIVES - 1);
    expect(wrongGuesses(after)).toEqual(['z']);
    expect(maskedWord(after)).toEqual(['_', '_', '_', '_', '_', '_']);
  });

  it('wins when the word is completed and loses when lives run out', () => {
    let won = createHangmanWord({ word: 'dog', category: 'Animals' });
    for (const ch of ['d', 'o', 'g']) won = guessLetter(won, ch);
    expect(won.status).toBe('won');
    expect(maskedWord(won)).toEqual(['d', 'o', 'g']);
    // Finished games ignore further guesses.
    expect(guessLetter(won, 'z')).toBe(won);

    let lost = createHangmanWord({ word: 'dog', category: 'Animals' });
    for (const ch of ['a', 'b', 'c', 'e', 'f', 'h']) lost = guessLetter(lost, ch);
    expect(lost.lives).toBe(0);
    expect(lost.status).toBe('lost');
    expect(guessLetter(lost, 'd')).toBe(lost);
  });

  it('a free hint reveals an unrevealed letter, never a wrong one, and costs no life', () => {
    const start = createHangmanWord({ word: 'banana', category: 'Food' });
    const afterGuess = guessLetter(start, 'b');
    const afterHint = revealHint(afterGuess);
    expect(afterHint.lives).toBe(MAX_LIVES);
    expect(afterHint.hintsUsed).toBe(1);
    // The hint reveals a letter that is in the word and was not guessed.
    const newlyRevealed = afterHint.guessed.filter((ch) => !afterGuess.guessed.includes(ch));
    expect(newlyRevealed).toHaveLength(1);
    expect('banana').toContain(newlyRevealed[0]!);
    expect(wrongGuesses(afterHint)).toEqual([]);
    // Hinting to completion still wins.
    let t = createHangmanWord({ word: 'dog', category: 'Animals' });
    for (let i = 0; i < 3; i++) t = revealHint(t);
    expect(t.status).toBe('won');
    // No hint left to give once won, and none on a fresh finished game.
    expect(revealHint(t)).toBe(t);
  });

  it('rejects invalid input and accepts a valid pass-and-play custom word', () => {
    const start = createHangmanWord({ word: 'dog', category: 'Animals' });
    expect(guessLetter(start, '')).toBe(start);
    expect(guessLetter(start, 'ab')).toBe(start);
    expect(guessLetter(start, '1')).toBe(start);
    expect(guessLetter(start, ' ')).toBe(start);
    const once = guessLetter(start, 'd');
    expect(guessLetter(once, 'd')).toBe(once);
    expect(guessLetter(once, 'D')).toBe(once);

    expect(parseCustomWord('')).toBe(null);
    expect(parseCustomWord('ab')).toBe(null);
    expect(parseCustomWord('hello world')).toBe(null);
    expect(parseCustomWord('hello1')).toBe(null);
    expect(parseCustomWord('hello-world')).toBe(null);
    expect(parseCustomWord('abcdefghijklm')).toBe(null);
    expect(parseCustomWord('  Secret  ')).toBe('secret');
    const custom = createCustomHangmanGame('Secret');
    expect(custom).not.toBe(null);
    expect(custom!.word).toBe('secret');
    expect(custom!.category).toBe('Set by your partner');
    expect(custom!.lives).toBe(MAX_LIVES);
    expect(custom!.status).toBe('playing');
    expect(createCustomHangmanGame('no good!')).toBe(null);
  });
});
