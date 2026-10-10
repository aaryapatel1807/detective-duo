/* Pure rules for Trivia Battle.
 * The deck mixes the offline bank (lib/content/trivia.ts) with the couple's
 * custom "about each other" questions from localStorage 'dd-custom-trivia'.
 * Players alternate answering; faster correct answers earn more points.
 */

import type { CustomTrivia, TriviaQuestion } from '../../lib/content/trivia';

export const QUESTION_SECONDS = 12;
export const QUESTION_COUNT = 10;

export interface DeckQ {
  id: string;
  category: string;
  question: string;
  /** null for custom free-text questions. */
  options: string[] | null;
  /** Canonical answer text (one of options for 'mc'). */
  answerText: string;
  kind: 'mc' | 'custom';
}

export function shuffle<T>(arr: T[], rand: () => number = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Build a 10-question deck: custom questions first, then the bank. */
export function buildDeck(
  general: TriviaQuestion[],
  custom: CustomTrivia[],
  n = QUESTION_COUNT,
  rand: () => number = Math.random,
): DeckQ[] {
  const customs: DeckQ[] = custom.map((c, i) => ({
    id: `custom-${i}`,
    category: 'About Each Other',
    question: c.question,
    options: null,
    answerText: c.answer,
    kind: 'custom' as const,
  }));
  const banked: DeckQ[] = general.map((q) => ({
    id: q.id,
    category: q.category,
    question: q.question,
    options: [...q.options],
    answerText: q.options[q.answer],
    kind: 'mc' as const,
  }));
  return shuffle([...customs, ...banked], rand).slice(0, n);
}

export function normalize(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, ' ');
}

/** Check an answer: option index for 'mc', free text for 'custom'. */
export function isCorrect(q: DeckQ, pick: string): boolean {
  if (q.kind === 'mc') {
    const idx = Number(pick);
    return Number.isInteger(idx) && q.options?.[idx] === q.answerText;
  }
  return normalize(pick) === normalize(q.answerText) && normalize(q.answerText).length > 0;
}

/** 100 base + 10 per second remaining, only when correct. */
export function pointsFor(correct: boolean, secondsLeft: number): number {
  return correct ? 100 + Math.max(0, Math.ceil(secondsLeft)) * 10 : 0;
}

export function secondsLeft(startedAt: number, now: number, total = QUESTION_SECONDS): number {
  return Math.max(0, total - Math.floor((now - startedAt) / 1000));
}
