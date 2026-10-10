import type { Cell } from './logic';

export interface TTTShared {
  round?: number;
  board?: Cell[];
  turn?: string | null;
  first?: string | null;
  scores?: Record<string, number>;
  /** 'draw' when the round is a stalemate. */
  roundWinner?: string | null;
  matchWinner?: string | null;
}
