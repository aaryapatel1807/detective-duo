/* Pure rules for noir Tic-Tac-Toe. Marks are 'a' | 'b' (rendered as 🔍 / 🕵). */

export type Mark = 'a' | 'b';
export type Cell = Mark | null;

export const ROUNDS = 5;
export const WINS_NEEDED = 3; // first to 3 round wins takes the match

const LINES: number[][] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

/** Winning mark, or null. */
export function winnerOf(board: Cell[]): Mark | null {
  for (const [x, y, z] of LINES) {
    if (board[x] && board[x] === board[y] && board[x] === board[z]) return board[x];
  }
  return null;
}

export function isDraw(board: Cell[]): boolean {
  return board.every((c) => c !== null) && winnerOf(board) === null;
}

/** Immutable placement; returns null when the cell is taken. */
export function place(board: Cell[], idx: number, mark: Mark): Cell[] | null {
  if (board[idx] !== null) return null;
  const next = [...board];
  next[idx] = mark;
  return next;
}

export function emptyBoard(): Cell[] {
  return Array(9).fill(null);
}
