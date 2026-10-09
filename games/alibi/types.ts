/* Alibi — shared types. The alibi text is public once submitted (interrogator
 * must see it); timed questions are shared so both clocks tick together.
 */

export type AlibiPhase = 'lobby' | 'alibiwriting' | 'cross' | 'judgment' | 'roundEnd' | 'over';
export type Verdict = 'busted' | 'clean';

export interface TimedQuestion {
  text: string;
  askedAt: number;
  deadline: number; // epoch ms
  from: string;
}

export interface AlibiShared {
  phase?: AlibiPhase;
  round?: number; // 1..3
  criminalId?: string | null;
  crimeId?: string | null;
  usedCrimes?: string[];
  alibi?: string;
  timedQ?: TimedQuestion | null;
  verdict?: Verdict | null;
  scores?: Record<string, number>;
  winner?: string | null;
}
