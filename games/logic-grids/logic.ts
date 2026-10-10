/* Logic Grids — pure rules. */

import type { LogicGrid } from './content';

export type Mark = 'empty' | 'yes' | 'no';

export interface CellPair {
  row: number;
  col: number;
}

/** Parse "Row → Col" solution strings into grid coordinates.
 * Handles both the exact "Row → ColLabel" form and the 3-axis form found in
 * some banks ("Row → Room → Time"), where the column is matched by its first
 * segment (e.g. "Study" → "Study/9PM").
 */
export function parseSolution(grid: LogicGrid): CellPair[] {
  const pairs: CellPair[] = [];
  for (const entry of grid.solution) {
    const parts = entry.split('→').map((p) => p.trim());
    if (parts.length < 2) continue;
    const row = grid.rows.indexOf(parts[0]);
    if (row < 0) continue;
    let col = grid.cols.indexOf(parts.slice(1).join('/'));
    if (col < 0) {
      const seg = parts[1];
      col = grid.cols.findIndex((c) => c === seg || c.startsWith(`${seg}/`));
    }
    if (col >= 0) pairs.push({ row, col });
  }
  return pairs;
}

export function emptyMarks(grid: LogicGrid): Mark[][] {
  return grid.rows.map(() => grid.cols.map(() => 'empty' as Mark));
}

export function cycleMark(m: Mark): Mark {
  return m === 'empty' ? 'yes' : m === 'yes' ? 'no' : 'empty';
}

/** Solved iff the set of ✓ marks exactly equals the solution pairs. */
export function isSolved(marks: Mark[][], grid: LogicGrid): boolean {
  const expected = new Set(parseSolution(grid).map((p) => `${p.row},${p.col}`));
  const actual = new Set<string>();
  marks.forEach((rowArr, r) =>
    rowArr.forEach((m, c) => {
      if (m === 'yes') actual.add(`${r},${c}`);
    }),
  );
  if (expected.size !== actual.size) return false;
  for (const k of expected) if (!actual.has(k)) return false;
  return true;
}

/** Winner = fastest finisher (race) or null until both finish (coop). */
export function raceWinner(finished: Record<string, number>): string | null {
  const entries = Object.entries(finished);
  if (entries.length === 0) return null;
  return entries.sort((a, b) => a[1] - b[1])[0][0];
}

export function allFinished(finished: Record<string, number>, playerIds: string[]): boolean {
  return playerIds.every((id) => typeof finished[id] === 'number');
}

export function formatMs(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}
