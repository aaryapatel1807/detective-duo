import type { ToDCard } from './logic';

export type ToDPhase = 'lobby' | 'spun';

export interface ToDShared {
  phase?: ToDPhase;
  deck?: ToDCard[];
  idx?: number;
  /** Whose turn it is to take the card. */
  turn?: string | null;
  doneCount?: number;
}
