import type { DeckQ } from './logic';

export type TriviaPhase = 'lobby' | 'question' | 'reveal' | 'over';

export interface TriviaShared {
  phase?: TriviaPhase;
  deck?: DeckQ[];
  idx?: number;
  answerer?: string | null;
  startedAt?: number;
  /** The answerer's submitted pick (option index as string, or free text). */
  pick?: string | null;
  correct?: boolean | null;
  earned?: number;
  scores?: Record<string, number>;
  matchWinner?: string | null;
}
