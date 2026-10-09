import type { LetterMark } from './logic';

/** Wordle solo file — one submitted row of the grid. */
export interface WordleRow {
  word: string;
  marks: LetterMark[];
}

export interface WordleStats {
  played: number;
  won: number;
  streak: number;
}
