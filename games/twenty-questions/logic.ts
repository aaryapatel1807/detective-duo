/* Twenty Questions — pure rules. */

export const MAX_QUESTIONS = 20;

export const CATEGORIES = ['person', 'place', 'thing'] as const;
export type Category = (typeof CATEGORIES)[number];

export function validSecret(text: string): boolean {
  const t = text.trim();
  return t.length >= 2 && t.length <= 60;
}

export function validQuestion(text: string): boolean {
  const t = text.trim();
  return t.length > 0 && t.length <= 200;
}

export function questionsLeft(used: number): number {
  return Math.max(0, MAX_QUESTIONS - used);
}

/** True when the guesser has burned all 20 questions without cracking it. */
export function isOutOfQuestions(used: number): boolean {
  return used >= MAX_QUESTIONS;
}

/** Fuzzy match: does the final guess name the secret? */
export function guessMatches(guess: string, secret: string): boolean {
  const norm = (s: string) => s.trim().toLowerCase().replace(/^(a|an|the)\s+/, '');
  const g = norm(guess);
  const s = norm(secret);
  return g.length > 0 && (g === s || g.includes(s) || s.includes(g));
}
