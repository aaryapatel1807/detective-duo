/* Shared-state types for Cipher Duel (mirrors room.shared.games['cipher-duel']). */

import type { CipherDuelGuess } from './logic';

export interface CipherDuelShared {
  phase?: 'setup' | 'play' | 'over';
  /** Each player's own 4-digit code (unique digits). Opponent cracks it. */
  codes?: Record<string, string>;
  /** Scored guesses per player. */
  guesses?: Record<string, CipherDuelGuess[]>;
  /** playerId whose turn it is to guess. */
  turn?: string | null;
  winner?: string | null;
}
