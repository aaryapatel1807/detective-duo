import type { WYRPair } from './logic';

export type WYRPhase = 'lobby' | 'voting' | 'reveal';

export interface WYRShared {
  phase?: WYRPhase;
  deck?: WYRPair[];
  idx?: number;
  /** Secret votes — the UI reveals them only once both are in. */
  votes?: Record<string, number>;
  matches?: number;
  rounds?: number;
}
