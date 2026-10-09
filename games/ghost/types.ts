/* Shared-state types for Ghost (mirrors room.shared.games['ghost']). */

export interface GhostShared {
  phase?: 'lobby' | 'play' | 'over';
  /** Current word fragment, uppercase. */
  fragment?: string;
  /** playerId whose turn it is (play a letter or challenge). */
  turn?: string | null;
  /** playerId who made the last letter play (the challenge target). */
  lastMover?: string | null;
  /** Round losses per player; first to 2 loses the match. */
  roundLosses?: Record<string, number>;
  /** 1-based round number. */
  round?: number;
  winner?: string | null;
  /** Noir case log of what happened. */
  log?: string[];
}
