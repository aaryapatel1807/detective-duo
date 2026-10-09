/* Shared-state types for Hangman Duel (mirrors room.shared.games['hangman-duel']). */

export interface HangmanRoundSummary {
  word: string;
  winner: string | 'draw';
  strikes: Record<string, number>;
}

export interface HangmanShared {
  phase?: 'lobby' | 'play' | 'over';
  /** 0-based index of the current round. */
  round?: number;
  /** Secret word for the current round (kept out of sight in the UI). */
  word?: string;
  /** Letters guessed this round. */
  guessed?: string[];
  /** Strikes in the current round, per player. */
  roundStrikes?: Record<string, number>;
  /** Total strikes across all rounds, per player. */
  totalStrikes?: Record<string, number>;
  /** playerId whose turn it is to guess. */
  turn?: string | null;
  /** playerId who opened the current round. */
  starter?: string | null;
  winner?: string | 'draw' | null;
  history?: HangmanRoundSummary[];
}
