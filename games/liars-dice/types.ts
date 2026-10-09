import type { Bid } from './logic';

export type DicePhase = 'lobby' | 'bidding' | 'revealed' | 'over';

export interface LiarsShared {
  phase?: DicePhase;
  round?: number;
  /** Secret dice per player (honor system — the UI only renders your own). */
  dice?: Record<string, number[]>;
  /** Dice remaining per player (drives re-rolls each round). */
  counts?: Record<string, number>;
  bid?: Bid | null;
  turn?: string | null;
  lastResult?: string;
  matchWinner?: string | null;
}
