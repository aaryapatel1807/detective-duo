import { describe, expect, it } from 'vitest';
import { rngFromSeed } from './rng';
import {
  botAccuracyForLevel,
  botAnswer,
  botDelayForLevel,
  generateQuiz,
  questionsForLevel,
  QUIZ_BANK,
  QUIZ_CATEGORIES,
  quizWinner,
  scoreAnswers,
  turnForQuestion,
} from './quizGk';

describe('quizGk bank', () => {
  it('has at least 60 questions covering all 5 categories', () => {
    expect(QUIZ_BANK.length).toBeGreaterThanOrEqual(60);
    const seen = new Set(QUIZ_BANK.map((q) => q.category));
    expect([...seen].sort()).toEqual([...QUIZ_CATEGORIES].sort());
    for (const category of QUIZ_CATEGORIES) {
      expect(QUIZ_BANK.filter((q) => q.category === category).length).toBeGreaterThanOrEqual(10);
    }
    const ids = new Set(QUIZ_BANK.map((q) => q.id));
    expect(ids.size).toBe(QUIZ_BANK.length);
  });

  it('every bank question has exactly 4 distinct options with one correct answer', () => {
    for (const q of QUIZ_BANK) {
      const options = [q.correct, ...q.wrong];
      expect(options).toHaveLength(4);
      expect(new Set(options).size).toBe(4);
      expect(q.wrong).toHaveLength(3);
      expect(q.wrong).not.toContain(q.correct);
    }
  });
});

describe('quizGk rounds', () => {
  it('is deterministic: same seed and level give the same set, order, and option order', () => {
    const a = generateQuiz('s', 1);
    expect(generateQuiz('s', 1)).toEqual(a);
    expect(generateQuiz('other', 1)).not.toEqual(a);
    expect(generateQuiz('s', 20)).not.toEqual(a);
  });

  it('grows with level and gives every round question 4 distinct options with a valid correct index', () => {
    expect(questionsForLevel(1)).toBe(6);
    expect(questionsForLevel(20)).toBe(8);
    expect(questionsForLevel(50)).toBe(10);
    expect(questionsForLevel(70)).toBe(12);
    for (const level of [1, 20, 50, 70]) {
      const round = generateQuiz('s', level);
      expect(round).toHaveLength(questionsForLevel(level));
      const ids = new Set(round.map((q) => q.id));
      expect(ids.size).toBe(round.length);
      for (const q of round) {
        expect(q.options).toHaveLength(4);
        expect(new Set(q.options).size).toBe(4);
        expect(q.correctIndex).toBeGreaterThanOrEqual(0);
        expect(q.correctIndex).toBeLessThan(4);
        const bank = QUIZ_BANK.find((b) => b.id === q.id)!;
        expect(q.options[q.correctIndex]).toBe(bank.correct);
        expect(q.category).toBe(bank.category);
      }
    }
  });

  it('represents more than one category in every round', () => {
    const round = generateQuiz('s', 1);
    expect(new Set(round.map((q) => q.category)).size).toBeGreaterThan(1);
  });
});

describe('quizGk scoring and turns', () => {
  it('counts scores and streaks, resetting the streak on a wrong answer', () => {
    const round = generateQuiz('s', 1);
    const correct = round.map((q) => q.correctIndex);
    expect(scoreAnswers(correct, round)).toEqual({
      score: round.length,
      bestStreak: round.length,
      currentStreak: round.length,
    });
    // Correct, correct, wrong, then correct to the end: best streak 3, ending on 3.
    const mixed = [...correct];
    mixed[2] = (mixed[2]! + 1) % 4;
    expect(scoreAnswers(mixed, round)).toEqual({
      score: round.length - 1,
      bestStreak: 3,
      currentStreak: round.length - 3,
    });
    // Unanswered questions never count as correct.
    const skipped: (number | null)[] = [...correct];
    skipped[0] = null;
    expect(scoreAnswers(skipped, round).score).toBe(round.length - 1);
    expect(scoreAnswers([], round)).toEqual({ score: 0, bestStreak: 0, currentStreak: 0 });
  });

  it('picks a winner by score, or a tie on equal scores', () => {
    expect(quizWinner([5, 3])).toBe(0);
    expect(quizWinner([2, 4])).toBe(1);
    expect(quizWinner([3, 3])).toBeNull();
  });

  it('alternates pass-and-play turns question by question', () => {
    expect([0, 1, 2, 3, 4, 5].map(turnForQuestion)).toEqual([0, 1, 0, 1, 0, 1]);
  });
});

describe('quizGk bot', () => {
  it('accuracy rises with level and never reaches 100%', () => {
    const levels = [1, 20, 50, 70];
    const accuracies = levels.map(botAccuracyForLevel);
    for (let i = 1; i < accuracies.length; i++) {
      expect(accuracies[i]).toBeGreaterThan(accuracies[i - 1]!);
    }
    expect(accuracies.every((a) => a > 0 && a < 1)).toBe(true);
  });

  it('answers faster at higher levels', () => {
    const delays = [1, 20, 50, 70].map(botDelayForLevel);
    for (let i = 1; i < delays.length; i++) {
      expect(delays[i]).toBeLessThan(delays[i - 1]!);
    }
    expect(delays.every((d) => d > 0)).toBe(true);
  });

  it('answers correctly on a lucky roll and wrong on an unlucky one', () => {
    const q = generateQuiz('s', 1)[0]!;
    expect(botAnswer(q, 1, () => 0)).toBe(q.correctIndex);
    const unlucky = botAnswer(q, 1, () => 0.999);
    expect(unlucky).not.toBe(q.correctIndex);
    expect(unlucky).toBeGreaterThanOrEqual(0);
    expect(unlucky).toBeLessThan(4);
  });

  it('over many seeded answers, higher levels score more but stay below perfect', () => {
    const round = generateQuiz('s', 1);
    for (const level of [1, 70]) {
      const rng = rngFromSeed(`bot-rate|${level}`);
      let correct = 0;
      const trials = 2000;
      for (let i = 0; i < trials; i++) {
        const q = round[i % round.length]!;
        if (botAnswer(q, level, rng) === q.correctIndex) correct += 1;
      }
      const rate = correct / trials;
      expect(rate).toBeGreaterThan(botAccuracyForLevel(level) - 0.08);
      expect(rate).toBeLessThan(botAccuracyForLevel(level) + 0.08);
      expect(rate).toBeLessThan(1);
    }
  });
});
