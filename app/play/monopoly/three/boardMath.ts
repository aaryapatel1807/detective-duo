/** Perimeter math for the Sachi Monopoly 3D board.
 * Mirrors the 2D board's gridPos: Go (square 0) at the bottom-right,
 * then counter-clockwise — bottom row right-to-left, left column
 * bottom-to-top, top row left-to-right, right column top-to-bottom.
 * The 3D board is an 11x11 grid centred on the origin; x grows right,
 * z grows toward the viewer (so row 11, the Start row, is nearest). */
export const CELL = 1.08;
export const TILE = 1.0;

export function gridRC(index: number): { row: number; col: number } {
  if (index === 0) return { row: 11, col: 11 };
  if (index >= 1 && index <= 9) return { row: 11, col: 11 - index };
  if (index === 10) return { row: 11, col: 1 };
  if (index >= 11 && index <= 19) return { row: 21 - index, col: 1 };
  if (index === 20) return { row: 1, col: 1 };
  if (index >= 21 && index <= 29) return { row: 1, col: index - 19 };
  if (index === 30) return { row: 1, col: 11 };
  return { row: index - 29, col: 11 };
}

/** World [x, z] of a square's centre on the board plane. */
export function tilePos(index: number): [number, number] {
  const { row, col } = gridRC(index);
  return [(col - 6) * CELL, (row - 6) * CELL];
}

/** A second token on the same square sits slightly offset so both read. */
export function tokenPos(square: number, slot: number): [number, number, number] {
  const [x, z] = tilePos(square);
  const off = slot === 0 ? -0.22 : 0.22;
  return [x + off, 0.32, z + off * 0.5];
}
