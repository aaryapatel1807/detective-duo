/* Pure rules for Fugitive Hunt — 8x8 city grid chase.
 * The hider picks a secret node; the seeker gets 10 searches, each returning
 * a distance band + a direction arrow. The hider slips one node after the
 * 3rd, 6th and 9th search.
 */

export const GRID = 8;
export const MAX_TURNS = 10;
/** Hider moves right after these guess counts. */
export const MOVE_TURNS = [3, 6, 9];

export type Band = 'Cold' | 'Warm' | 'Hot' | 'Burning';

export function xy(node: number): [number, number] {
  return [node % GRID, Math.floor(node / GRID)];
}

/** Chebyshev distance (king moves) between two grid nodes. */
export function chebyshev(a: number, b: number): number {
  const [ax, ay] = xy(a);
  const [bx, by] = xy(b);
  return Math.max(Math.abs(ax - bx), Math.abs(ay - by));
}

export function bandFor(d: number): Band {
  if (d <= 2) return 'Burning';
  if (d <= 4) return 'Hot';
  if (d <= 6) return 'Warm';
  return 'Cold';
}

const DIR_MAP: Record<string, string> = {
  '0,-1': '↑',
  '1,-1': '↗',
  '1,0': '→',
  '1,1': '↘',
  '0,1': '↓',
  '-1,1': '↙',
  '-1,0': '←',
  '-1,-1': '↖',
};

/** Arrow pointing from the guess toward the hider. */
export function directionArrow(from: number, to: number): string {
  const [fx, fy] = xy(from);
  const [tx, ty] = xy(to);
  const dx = Math.sign(tx - fx);
  const dy = Math.sign(ty - fy);
  if (dx === 0 && dy === 0) return '◎';
  return DIR_MAP[`${dx},${dy}`] ?? '◎';
}

/** Orthogonal neighbours of a node (staying on the grid). */
export function adjacent(node: number): number[] {
  const [x, y] = xy(node);
  const out: number[] = [];
  const deltas: Array<[number, number]> = [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
  ];
  for (const [dx, dy] of deltas) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx >= 0 && nx < GRID && ny >= 0 && ny < GRID) out.push(ny * GRID + nx);
  }
  return out;
}

export function hiderMovesAfter(turnsUsed: number): boolean {
  return MOVE_TURNS.includes(turnsUsed);
}

export interface HuntClueResult {
  band: Band;
  dir: string;
  found: boolean;
}

export function clueFor(guess: number, hide: number): HuntClueResult {
  const d = chebyshev(guess, hide);
  return { band: bandFor(d), dir: directionArrow(guess, hide), found: d === 0 };
}
