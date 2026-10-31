/**
 * Tic Tac Toe — classic 3x3, X vs O, Duo Corner.
 *
 * Studied from the classic rules: players alternate placing their mark
 * on an empty cell, the first to complete a row, column, or diagonal
 * wins, and a full board with no winner is a draw (never a loss).
 * Solo mode plays the same game against Cosy Bot; two-player mode is
 * pass-and-play on one device. The player to move first is X.
 *
 * Pure logic, no React: the page drives moves turn by turn and tests
 * can replay exact games. The bot takes a winning move when it has
 * one, blocks the opponent's winning move, and otherwise plays the
 * strongest move it can find — except that at low levels it sometimes
 * plays a random move instead, so it is never unbeatable there.
 * Higher levels get sharper: at Expert the bot never blunders.
 */

export type Mark = 'X' | 'O';
export type CellValue = Mark | null;
/** Board positions 0-8, row-major: 0 1 2 / 3 4 5 / 6 7 8. */
export type Board = CellValue[];

export const EMPTY_BOARD: Board = Array<CellValue>(9).fill(null);

export const WIN_LINES: readonly (readonly [number, number, number])[] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

/** The completed line, or null when nobody has won yet. */
export function winningLine(board: Board): [number, number, number] | null {
  for (const line of WIN_LINES) {
    const [a, b, c] = line;
    const mark = board[a];
    if (mark !== null && mark !== undefined && mark === board[b] && mark === board[c]) {
      return [a, b, c];
    }
  }
  return null;
}

/** The winning mark, or null when nobody has won yet. */
export function winner(board: Board): Mark | null {
  const line = winningLine(board);
  return line === null ? null : board[line[0]]!;
}

/** True when the board is full and nobody has won — a draw, not a loss. */
export function isDraw(board: Board): boolean {
  return board.every((cell) => cell !== null) && winner(board) === null;
}

/** True when the game is over by win or by draw. */
export function isFinished(board: Board): boolean {
  return winner(board) !== null || isDraw(board);
}

export function emptyCells(board: Board): number[] {
  const out: number[] = [];
  for (let i = 0; i < 9; i++) {
    if (board[i] === null) out.push(i);
  }
  return out;
}

export function opponent(mark: Mark): Mark {
  return mark === 'X' ? 'O' : 'X';
}

/**
 * Place a mark. Returns a new board, or null when the move is illegal:
 * the cell is out of range, already occupied, or the game is already
 * decided. The input board is never mutated.
 */
export function placeMark(board: Board, index: number, mark: Mark): Board | null {
  if (index < 0 || index > 8) return null;
  if (board[index] !== null) return null;
  if (isFinished(board)) return null;
  const next = [...board];
  next[index] = mark;
  return next;
}

/**
 * How often the bot ignores its best move and plays a random empty
 * cell instead. Easy blunders often, Medium sometimes, Hard rarely,
 * Expert never — so the bot is never unbeatable at low levels and
 * gets sharper as levels rise.
 */
export function mistakeChance(level: number): number {
  if (level <= 10) return 0.45;
  if (level <= 30) return 0.25;
  if (level <= 60) return 0.1;
  return 0;
}

/**
 * Minimax score from the bot's point of view: a win scores 10 minus
 * depth (sooner wins beat later wins), a loss scores depth minus 10
 * (later losses beat sooner ones), a draw scores 0.
 */
function minimax(board: Board, turn: Mark, botMark: Mark, depth: number): number {
  const w = winner(board);
  if (w === botMark) return 10 - depth;
  if (w !== null) return depth - 10;
  if (board.every((cell) => cell !== null)) return 0;
  const scores = emptyCells(board).map((i) => {
    const next = [...board];
    next[i] = turn;
    return minimax(next, opponent(turn), botMark, depth + 1);
  });
  return turn === botMark ? Math.max(...scores) : Math.min(...scores);
}

/**
 * The bot's strongest move. Ties break toward the centre, then
 * corners, then sides — the sensible human order. Returns -1 when the
 * board is full.
 */
export function optimalMove(board: Board, botMark: Mark): number {
  const empties = emptyCells(board);
  if (empties.length === 0) return -1;
  const preference = [4, 0, 2, 6, 8, 1, 3, 5, 7];
  const ordered = preference.filter((i) => empties.includes(i));
  let best = ordered[0]!;
  let bestScore = -Infinity;
  for (const i of ordered) {
    const next = [...board];
    next[i] = botMark;
    const score = minimax(next, opponent(botMark), botMark, 0);
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  }
  return best;
}

/**
 * The bot's move for a level. With probability mistakeChance(level) it
 * plays a random empty cell instead of its best move — that is what
 * keeps low levels beatable. Returns -1 when the board is full.
 */
export function botMove(
  board: Board,
  botMark: Mark,
  level: number,
  rng: () => number,
): number {
  const empties = emptyCells(board);
  if (empties.length === 0) return -1;
  if (rng() < mistakeChance(level)) {
    return empties[Math.floor(rng() * empties.length)]!;
  }
  return optimalMove(board, botMark);
}
