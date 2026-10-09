import type { Card } from './logic';

export type { Card };

/** Best result for memory match: fewest moves, then fastest time. */
export interface MemoryBest {
  moves: number;
  seconds: number;
}
