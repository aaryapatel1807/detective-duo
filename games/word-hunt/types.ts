/* Shared-state types for Word Hunt (mirrors room.shared.games['word-hunt']). */

export interface WordHuntShared {
  phase?: 'lobby' | 'play' | 'over';
  /** 16 letters, row-major (a 'Q' tile is played as "Qu"). */
  board?: string[];
  /** Epoch ms when the 90s hunt ends. */
  endsAt?: number;
  /** Found words per player (validated on submit). */
  words?: Record<string, string[]>;
  /** Set when a player's clock runs out locally. */
  done?: Record<string, boolean>;
  winner?: string | 'draw' | null;
}
