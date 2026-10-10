/* Logic Grids — shared types. Each player solves their own grid locally
 * (marks never sync); only the synced timer start + finish times + winner sync.
 */

export type GridMode = 'race' | 'coop';
export type GridPhase = 'lobby' | 'solving' | 'over';

export interface LogicGridsShared {
  phase?: GridPhase;
  gridId?: string | null;
  mode?: GridMode;
  startAt?: number | null;
  /** finish times in ms since startAt, per player */
  finished?: Record<string, number>;
  winner?: string | null;
}
