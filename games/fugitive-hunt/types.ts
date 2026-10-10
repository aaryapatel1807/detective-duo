import type { Band } from './logic';

export interface HuntClue {
  node: number;
  band: Band;
  dir: string;
  turn: number;
}

export type HuntPhase = 'lobby' | 'hide' | 'seek' | 'move' | 'over';

export interface FugitiveShared {
  phase?: HuntPhase;
  round?: number;
  hider?: string | null;
  seeker?: string | null;
  /** Hider's secret node (honor system — the seeker's UI never renders it). */
  hideNode?: number | null;
  turnsUsed?: number;
  clues?: HuntClue[];
  scores?: Record<string, number>;
  roundWinner?: string | null;
  matchWinner?: string | null;
}
