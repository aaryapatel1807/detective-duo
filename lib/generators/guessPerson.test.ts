import { describe, expect, it } from 'vitest';
import {
  QUESTIONS,
  ROSTER,
  answerQuestion,
  applyAnswer,
  askQuestion,
  budgetForLevel,
  generateGuessPerson,
  makeGuess,
  questionById,
  rosterSizeForLevel,
  splitsCandidates,
  type Persona,
} from './guessPerson';

function traitTuple(p: Persona): string {
  return [p.glasses, p.hat, p.hair, p.facialHair, p.smile].join('|');
}

describe('guess-person', () => {
  it('is deterministic: same seed and level give the same roster, secret, and budget', () => {
    const a = generateGuessPerson('s', 1);
    const b = generateGuessPerson('s', 1);
    expect(b).toEqual(a);
    expect(a.roster).toHaveLength(12);
    expect(a.roster).toContain(a.secret);
    expect(a.remaining).toEqual(a.roster);
    expect(a.budget).toBe(8);
    expect(a.finished).toBe(false);
  });

  it('grows the roster and shrinks the budget by level', () => {
    expect(rosterSizeForLevel(1)).toBe(12);
    expect(budgetForLevel(1)).toBe(8);
    expect(rosterSizeForLevel(20)).toBe(16);
    expect(budgetForLevel(20)).toBe(6);
    expect(rosterSizeForLevel(50)).toBe(20);
    expect(budgetForLevel(50)).toBe(5);
    expect(rosterSizeForLevel(70)).toBe(24);
    expect(budgetForLevel(70)).toBe(4);
    expect(generateGuessPerson('s', 70).roster).toHaveLength(24);
    expect(generateGuessPerson('s', 20).roster).toHaveLength(16);
  });

  it('has 24 personas with distinct names, valid trait values, and distinct trait mixes', () => {
    expect(ROSTER).toHaveLength(24);
    expect(new Set(ROSTER.map((p) => p.name)).size).toBe(24);
    expect(new Set(ROSTER.map(traitTuple)).size).toBe(24);
    const hairs = ['black', 'brown', 'blonde', 'red', 'grey', 'bald'];
    const facial = ['none', 'beard', 'moustache', 'goatee'];
    for (const p of ROSTER) {
      expect(p.name.trim()).not.toBe('');
      expect(typeof p.glasses).toBe('boolean');
      expect(typeof p.hat).toBe('boolean');
      expect(typeof p.smile).toBe('boolean');
      expect(hairs).toContain(p.hair);
      expect(facial).toContain(p.facialHair);
    }
  });

  it('every question splits the full roster into a non-empty yes side and no side', () => {
    expect(QUESTIONS.length).toBeGreaterThan(0);
    expect(new Set(QUESTIONS.map((q) => q.id)).size).toBe(QUESTIONS.length);
    for (const q of QUESTIONS) {
      expect(questionById(q.id)).toBe(q);
      expect(splitsCandidates(ROSTER, q)).toBe(true);
      const yes = ROSTER.filter((p) => answerQuestion(p, q));
      const no = ROSTER.filter((p) => !answerQuestion(p, q));
      expect(yes.length + no.length).toBe(24);
      expect(yes.length).toBeGreaterThan(0);
      expect(no.length).toBeGreaterThan(0);
      // applyAnswer keeps exactly the matching side, for both answers.
      expect(applyAnswer(ROSTER, q, true)).toEqual(yes);
      expect(applyAnswer(ROSTER, q, false)).toEqual(no);
    }
  });

  it('asking keeps exactly the candidates matching the secret answer, and repeats are no-ops', () => {
    const game = generateGuessPerson('s', 1);
    const question = QUESTIONS.find((q) => splitsCandidates(game.remaining, q))!;
    const answer = answerQuestion(game.secret, question);
    const next = askQuestion(game, question.id);
    expect(next.questionsUsed).toBe(1);
    expect(next.asked).toEqual([{ question, answer }]);
    expect(next.remaining).toEqual(applyAnswer(game.remaining, question, answer));
    expect(next.remaining).toContain(game.secret);
    expect(next.finished).toBe(false);
    expect(askQuestion(next, question.id)).toBe(next);
  });

  it('a correct guess wins and a wrong guess loses, and finished games ignore further moves', () => {
    const game = generateGuessPerson('s', 1);
    const won = makeGuess(game, game.secret.name);
    expect(won.finished).toBe(true);
    expect(won.won).toBe(true);
    expect(makeGuess(won, game.secret.name)).toBe(won);
    expect(askQuestion(won, QUESTIONS[0]!.id)).toBe(won);
    const wrong = game.remaining.find((p) => p.name !== game.secret.name)!;
    const lost = makeGuess(game, wrong.name);
    expect(lost.finished).toBe(true);
    expect(lost.won).toBe(false);
  });

  it('spending the whole question budget without guessing loses the round', () => {
    let game = generateGuessPerson('s', 70); // Expert: budget 4.
    expect(game.budget).toBe(4);
    while (!game.finished) {
      const question = QUESTIONS.find(
        (q) =>
          !game.asked.some((a) => a.question.id === q.id) &&
          splitsCandidates(game.remaining, q),
      );
      // With distinct trait mixes, a splitting question always exists
      // until a single candidate remains; if not, guess wrongly instead.
      if (!question) break;
      game = askQuestion(game, question.id);
    }
    if (!game.finished) {
      const wrong = game.remaining.find((p) => p.name !== game.secret.name);
      if (wrong) game = makeGuess(game, wrong.name);
    }
    expect(game.finished).toBe(true);
    expect(game.won).toBe(false);
    // The budget path itself: fresh game, ask until the budget is spent.
    let budgeted = generateGuessPerson('budget', 70);
    for (let i = 0; i < budgeted.budget; i++) {
      const question = QUESTIONS.find(
        (q) => !budgeted.asked.some((a) => a.question.id === q.id),
      )!;
      budgeted = askQuestion(budgeted, question.id);
    }
    expect(budgeted.questionsUsed).toBe(4);
    expect(budgeted.finished).toBe(true);
    expect(budgeted.won).toBe(false);
  });

  it('different seeds shuffle the roster (the same level is not one fixed board)', () => {
    const a = generateGuessPerson('alpha', 1);
    const b = generateGuessPerson('beta', 1);
    expect(a.roster.map((p) => p.name)).not.toEqual(b.roster.map((p) => p.name));
  });
});
