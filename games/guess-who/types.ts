/* Guess Who — shared types. Picks and boards stay LOCAL (secret).
 * Synced: phase, turn, ready flags, winner.
 */

export type GuessWhoPhase = 'setup' | 'play' | 'over';

export interface GuessWhoShared {
  phase?: GuessWhoPhase;
  turn?: string | null;
  ready?: Record<string, boolean>;
  winner?: string | null;
  /** set by the judge tab when an accusation is resolved */
  resolvedAccusation?: { accuserId: string; suspectId: string; correct: boolean } | null;
}
