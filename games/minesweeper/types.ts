import type { Cell, Difficulty, Mark } from './logic';

export type { Cell, Difficulty, Mark };

/** Minesweeper solo file — UI game status. */
export type SweepStatus = 'ready' | 'playing' | 'won' | 'lost';

export interface SweepBest {
  rookie?: number;
  sleuth?: number;
}
