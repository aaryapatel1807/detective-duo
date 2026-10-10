/* Jigsaw core — pure piece layout, unit-testable.
 * Positions are fractions of the board width; the board is a 1×1 square
 * and the scatter tray sits below it (y in [1, AREA_H]).
 */

export const AREA_H = 1.45;

export interface JigPiece {
  id: number;
  row: number;
  col: number;
  /** top-left corner, in board-width fractions */
  fx: number;
  fy: number;
  placed: boolean;
}

export function homeOf(id: number, n: number): { row: number; col: number } {
  return { row: Math.floor(id / n), col: id % n };
}

export function homeFx(col: number, n: number): number {
  return col / n;
}

export function homeFy(row: number, n: number): number {
  return row / n;
}

export function pieceFrac(n: number): number {
  return 1 / n;
}

/** Scatter pieces randomly around the tray area. */
export function scatterPieces(n: number, rng: () => number = Math.random): JigPiece[] {
  const size = pieceFrac(n);
  const pieces: JigPiece[] = [];
  for (let id = 0; id < n * n; id++) {
    const { row, col } = homeOf(id, n);
    pieces.push({
      id,
      row,
      col,
      fx: rng() * (1 - size),
      fy: 1.06 + rng() * (AREA_H - 1.12 - size),
      placed: false,
    });
  }
  // Shuffle so the tray isn't in solve order.
  for (let i = pieces.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
  }
  return pieces;
}

/** Snap threshold: within 60% of a piece-size of home. */
export function nearHome(p: JigPiece, n: number): boolean {
  const tol = 0.6 * pieceFrac(n);
  return Math.abs(p.fx - homeFx(p.col, n)) < tol && Math.abs(p.fy - homeFy(p.row, n)) < tol;
}

export function allPlaced(pieces: JigPiece[]): boolean {
  return pieces.length > 0 && pieces.every((p) => p.placed);
}
