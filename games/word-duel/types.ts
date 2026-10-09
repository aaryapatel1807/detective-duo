/* Shared-state types for Word Duel (mirrors room.shared.games['word-duel']). */

export interface WordDuelShared {
  phase?: 'setup' | 'play' | 'over';
  /** Each player's own secret word (5 letters). Opponent guesses it. */
  secrets?: Record<string, string>;
  /** Each player's guesses against the opponent's secret. */
  guesses?: Record<string, string[]>;
  winner?: string | 'draw' | null;
}
