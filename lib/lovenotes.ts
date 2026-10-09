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
