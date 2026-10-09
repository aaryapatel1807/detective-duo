'use client';

/* Love Notes storage helpers (used by app/lovenotes and game agents). */

import { readJSON, writeJSON } from './store';

export const NOTES_KEY = 'dd-lovenotes';
export const COOP_WINS_KEY = 'dd-coop-wins';

export interface LoveNote {
  id: string;
  to: string;
  text: string;
  createdAt: number;
  unlockWins: number;
  opened: boolean;
}

export function getCoopWins(): number {
  if (typeof window === 'undefined') return 0;
  return readJSON<number>(COOP_WINS_KEY, 0);
}

/** Game agents: call after a co-op victory. Returns the new total. */
export function recordCoopWin(): number {
  const next = getCoopWins() + 1;
  writeJSON(COOP_WINS_KEY, next);
  return next;
}

export function readNotes(): LoveNote[] {
  if (typeof window === 'undefined') return [];
  return readJSON<LoveNote[]>(NOTES_KEY, []);
}

export function saveNotes(notes: LoveNote[]): void {
  writeJSON(NOTES_KEY, notes);
}

/* ---- Unlockable surprises ---------------------------------------------
 * Wax-sealed surprise prompts unlocked per co-op win. The lovenotes page
 * can call unlockSurprise() after a win and display readSurprises().
 * Stored in localStorage 'dd-surprises'. Additive only — existing note
 * APIs above are untouched.
 */

export const SURPRISES_KEY = 'dd-surprises';

export interface UnlockedSurprise {
  id: string;
  text: string;
  unlockedAt: number;
  opened: boolean;
}

/** Deck of wax-sealed surprise prompts — one unlocked per co-op win. */
export const SURPRISE_IDEAS: string[] = [
  'Case closed! Your surprise: a slow-dance voucher — redeemable tonight, no excuses.',
  "Pick tonight's movie — the loser's choice is final, no vetoes.",
  'One full shoulder massage, owed and payable on demand.',
  'Breakfast in bed, served by the detective of your choice.',
  'A handwritten love letter, sealed with wax, delivered by hand.',
  'Stargazing date — you pick the spot, they bring the snacks.',
  "One 'yes evening' coupon: they can't say no (within reason, detective).",
  "Cook their favourite meal together — phones off, music on.",
  'A long drive with no destination, just the two of you.',
  'Dessert date: they pick the place, you pick the table.',
  'One chore-free evening — the other detective handles everything.',
  'Recreate your first date, down to the smallest detail.',
  "A surprise picnic — you pack everything, they just show up.",
  'One hour of undivided attention: no phones, just talking.',
  "Buy them the little thing they've been eyeing. No interrogation.",
  'Plan a mystery date — they only learn the plan when you arrive.',
  'Slow morning: coffee, blankets, nowhere to be.',
  "Write them a poem. It doesn't have to rhyme. It has to be true.",
  'An at-home spa night — candles, music, zero case talk.',
  "One 'get out of one argument free' card. Use wisely, detective.",
];

export function readSurprises(): UnlockedSurprise[] {
  if (typeof window === 'undefined') return [];
  return readJSON<UnlockedSurprise[]>(SURPRISES_KEY, []);
}

export function saveSurprises(surprises: UnlockedSurprise[]): void {
  writeJSON(SURPRISES_KEY, surprises);
}

/**
 * Unlock the next surprise (call after a co-op win). Picks a random idea
 * not already unlocked; once the deck is exhausted it cycles through the
 * full deck again. Returns the newly unlocked surprise.
 */
export function unlockSurprise(): UnlockedSurprise {
  const existing = readSurprises();
  const used = new Set(existing.map((s) => s.text));
  const remaining = SURPRISE_IDEAS.filter((idea) => !used.has(idea));
  const pool = remaining.length > 0 ? remaining : SURPRISE_IDEAS;
  const text = pool[Math.floor(Math.random() * pool.length)];
  const surprise: UnlockedSurprise = {
    id: Math.random().toString(36).slice(2, 10),
    text,
    unlockedAt: Date.now(),
    opened: false,
  };
  saveSurprises([...existing, surprise]);
  return surprise;
}

/** Mark a surprise as opened (wax seal broken). */
export function openSurprise(id: string): void {
  saveSurprises(readSurprises().map((s) => (s.id === id ? { ...s, opened: true } : s)));
}

/** How many surprises are still sealed. */
export function sealedSurpriseCount(): number {
  return readSurprises().filter((s) => !s.opened).length;
}
