/* Black Stories — pure rules. */

import type { Answer, QAEntry } from './types';

/** Host must exist before a story can be picked. */
export function canPickStory(hostId: string | null | undefined): boolean {
  return !!hostId;
}

/** A question is valid if non-empty after trimming (yes/no games need nothing more). */
export function validQuestion(text: string): boolean {
  return text.trim().length > 0 && text.trim().length <= 300;
}

export function appendQuestion(qa: QAEntry[], q: string, from: string): QAEntry[] {
  return [...qa, { q: q.trim(), a: null, from }];
}

export function answerQuestion(qa: QAEntry[], index: number, answer: Answer): QAEntry[] {
  if (index < 0 || index >= qa.length) return qa;
  return qa.map((entry, i) => (i === index ? { ...entry, a: answer } : entry));
}

export function unansweredCount(qa: QAEntry[]): number {
  return qa.filter((e) => e.a === null).length;
}

export function answeredCount(qa: QAEntry[]): number {
  return qa.filter((e) => e.a !== null).length;
}

/** True when the asker already knows everything — used to unlock the "I cracked it" path. */
export function isSolvedEntry(qa: QAEntry[]): boolean {
  return qa.length > 0;
}
