export interface StrokePoint {
  x: number;
  y: number;
}

export interface Stroke {
  id: string;
  pts: StrokePoint[];
  color: string;
  width: number;
}

export type DrawPhase = 'lobby' | 'ready' | 'drawing' | 'roundEnd';

export interface DrawShared {
  phase?: DrawPhase;
  round?: number;
  drawer?: string | null;
  guesser?: string | null;
  /** Secret word — the guesser's UI never renders it. */
  word?: string;
  /** Finalized strokes (live batches travel via room.send actions). */
  strokes?: Stroke[];
  startedAt?: number;
  reason?: 'guessed' | 'timeout' | null;
  roundWinner?: string | null;
  scores?: Record<string, number>;
  matchWinner?: string | null;
}
