/* Pure rules for Connect 4 — 7 columns × 6 rows.
 * Cells hold 'a' | 'b' (rendered as noir chips) or null.
 */

export const COLS = 7;
export const ROWS = 6;
export const ROUNDS = 3;
export const WINS_NEEDED = 2; // best of 3

export type Chip = 'a' | 'b';
export type C4Cell = Chip | null;
export type Board = C4Cell[][]; // ROWS × COLS, row 0 = top

export function emptyBoard(): Board {
  return Array.from({ length: ROWS }, () => Array<Chip | null>(COLS).fill(null));
}

/** Lowest empty row in a column, or -1 when the column is full. */
export function dropRow(board: Board, col: number): number {
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r][col] === null) return r;
  }
  return -1;
}

/** Immutable drop; returns null when the column is full. */
export function drop(board: Board, col: number, chip: Chip): Board | null {
  const r = dropRow(board, col);
  if (r < 0) return null;
  const next = board.map((row) => [...row]);
  next[r][col] = chip;
  return next;
}

/** Winning chip, or null. */
export function winnerOf(board: Board): Chip | null {
  const dirs: Array<[number, number]> = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const chip = board[r][c];
      if (!chip) continue;
      for (const [dr, dc] of dirs) {
        let ok = true;
        for (let k = 1; k < 4; k++) {
          const nr = r + dr * k;
          const nc = c + dc * k;
          if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS || board[nr][nc] !== chip) {
            ok = false;
            break;
          }
        }
        if (ok) return chip;
      }
    }
  }
  return null;
}

export function isFull(board: Board): boolean {
  return board.every((row) => row.every((c) => c !== null));
}
