/* Bomb Defusal — shared types.
 * The Technician sees the bomb; the Expert sees the manual. Both views read
 * from shared.games['bomb-defusal']; static bomb config is derived from the
 * seed in logic.ts so both tabs agree without extra syncing.
 */

export type BombRole = 'technician' | 'expert';

export type BombStatus = 'setup' | 'armed' | 'defused' | 'exploded';

export interface BombShared {
  seed?: number | null;
  roles?: Record<string, BombRole>;
  status?: BombStatus;
  /** epoch ms when the 5:00 countdown ends */
  deadline?: number;
  strikes?: number;
  /** wires module: index of the cut wire */
  cutWire?: number | null;
  /** keypad module: symbols pressed so far, in order */
  keypadPressed?: string[];
  /** simon module */
  simonRound?: number;
  simonInput?: string[];
  /** strikes at the moment the current simon round started (locks the key) */
  simonKeyStrikes?: number;
  /** password module: wheel positions */
  wheelIdx?: number[];
  /** per-player win-award markers (rejoin-safe XP) */
  awarded?: Record<string, boolean>;
}
