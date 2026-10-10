/* Shared-state types for Codenames Duet (mirrors room.shared.games['codenames-duet']). */

import type { CardKind } from './logic';

export interface DuetClue {
  word: string;
  count: number;
}

export interface CodenamesShared {
  phase?: 'lobby' | 'play' | 'over';
  words?: string[];
  key?: CardKind[];
  revealed?: boolean[];
  /** playerId currently giving the clue. */
  clueGiver?: string | null;
  clue?: DuetClue | null;
  guessesLeft?: number;
  /** 1-based turn counter. */
  turn?: number;
  maxTurns?: number;
  result?: 'win' | 'lose' | null;
  loseReason?: string;
  log?: string[];
}
