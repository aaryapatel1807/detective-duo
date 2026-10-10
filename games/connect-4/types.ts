import type { Board } from './logic';

export interface C4Shared {
  round?: number;
  board?: Board;
  turn?: string | null;
  first?: string | null;
  scores?: Record<string, number>;
  roundWinner?: string | null;
  matchWinner?: string | null;
}
