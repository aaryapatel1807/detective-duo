/* Pure rules for Battleship — 8×8, 4 ships each (sizes 4, 3, 2, 2).
 * Ships are stored as arrays of cell indices (row * 8 + col).
 */

export const GRID = 8;
export const SHIP_SIZES = [4, 3, 2, 2];

export function xy(cell: number): [number, number] {
  return [cell % GRID, Math.floor(cell / GRID)];
}

/** Cells a ship would occupy, or null when it would run off the grid. */
export function cellsForShip(start: number, len: number, horizontal: boolean): number[] | null {
  const [x, y] = xy(start);
  const cells: number[] = [];
  for (let i = 0; i < len; i++) {
    const nx = horizontal ? x + i : x;
    const ny = horizontal ? y : y + i;
    if (nx >= GRID || ny >= GRID) return null;
    cells.push(ny * GRID + nx);
  }
  return cells;
}

/** A placement is legal when it fits and touches no existing ship. */
export function canPlace(
  ships: number[][],
  start: number,
  len: number,
  horizontal: boolean,
): boolean {
  const cells = cellsForShip(start, len, horizontal);
  if (!cells) return false;
  const taken = new Set(ships.flat());
  return cells.every((c) => !taken.has(c));
}

/** Immutable placement (assumes canPlace was checked). */
export function placeShip(
  ships: number[][],
  start: number,
  len: number,
  horizontal: boolean,
): number[][] | null {
  if (!canPlace(ships, start, len, horizontal)) return null;
  return [...ships, cellsForShip(start, len, horizontal)!];
}

export function hitAt(ships: number[][], cell: number): boolean {
  return ships.some((s) => s.includes(cell));
}

export function shipSunk(ship: number[], shots: Record<number, 'hit' | 'miss'>): boolean {
  return ship.every((c) => shots[c] === 'hit');
}

/** True when every ship of the fleet is sunk. */
export function allSunk(ships: number[][], shots: Record<number, 'hit' | 'miss'>): boolean {
  return ships.length === SHIP_SIZES.length && ships.every((s) => shipSunk(s, shots));
}
