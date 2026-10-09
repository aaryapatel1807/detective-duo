export type BSPhase = 'lobby' | 'place' | 'battle' | 'over';

export interface BattleshipShared {
  phase?: BSPhase;
  /** Secret fleet per player (honor system — each UI renders only its own). */
  ships?: Record<string, number[][]>;
  ready?: Record<string, boolean>;
  /** Shots fired BY each player id: cell -> 'hit' | 'miss'. */
  shots?: Record<string, Record<number, 'hit' | 'miss'>>;
  turn?: string | null;
  winner?: string | null;
}
