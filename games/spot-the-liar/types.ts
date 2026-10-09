/* Spot the Liar — shared types. The lie index stays LOCAL to the liar (secret).
 * Synced: round, phase, liarId, promptId, statements, scores, verdicts.
 */

export type LiarPhase = 'lobby' | 'writing' | 'interrogation' | 'called' | 'over';

export interface SpotTheLiarShared {
  phase?: LiarPhase;
  round?: number; // 1..3
  liarId?: string | null;
  promptId?: string | null;
  usedPrompts?: string[];
  statements?: string[];
  scores?: Record<string, number>;
  /** set by the liar's tab when the interrogator calls */
  lastVerdict?: { round: number; calledIndex: number; lieIndex: number; correct: boolean } | null;
  winner?: string | null;
}

export interface ChatMessage {
  from: string;
  name: string;
  text: string;
  at: number;
}
