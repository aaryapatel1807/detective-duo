/* Minesweeper core — pure board logic, unit-testable. Board is row-major. */

export type Mark = 'none' | 'flag' | 'question';

export interface Cell {
  mine: boolean;
  open: boolean;
  mark: Mark;
  adj: number;
}

export interface Difficulty {
  id: string;
  label: string;
  rows: number;
  cols: number;
  mines: number;
}

export const DIFFICULTIES: Difficulty[] = [
  { id: 'rookie', label: 'Rookie · 9×9, 10 mines', rows: 9, cols: 9, mines: 10 },
  { id: 'sleuth', label: 'Sleuth · 16×16, 40 mines', rows: 16, cols: 16, mines: 40 },
];

export function neighbors(rows: number, cols: number, idx: number): number[] {
  const r = Math.floor(idx / cols);
  const c = idx % cols;
  const out: number[] = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) out.push(nr * cols + nc);
    }
  }
  return out;
}

/** Place mines avoiding the safe cell and its neighbours (first click is safe). */
export function createBoard(
  rows: number,
  cols: number,
  mineCount: number,
  safeIdx: number,
  rng: () => number = Math.random,
): Cell[] {
  const total = rows * cols;
  const safeZone = new Set([safeIdx, ...neighbors(rows, cols, safeIdx)]);
  const candidates: number[] = [];
  for (let i = 0; i < total; i++) {
    if (!safeZone.has(i)) candidates.push(i);
  }
  // Fisher–Yates with the injected rng.
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  const mines = new Set(candidates.slice(0, mineCount));
  const board: Cell[] = [];
  for (let i = 0; i < total; i++) {
    const mine = mines.has(i);
    board.push({
      mine,
      open: false,
      mark: 'none',
      adj: mine ? 0 : neighbors(rows, cols, i).filter((n) => mines.has(n)).length,
    });
  }
  return board;
}

/** Open a cell; flood-fills through zero-adjacency cells. Returns a new board. */
export function openCell(board: Cell[], rows: number, cols: number, idx: number): Cell[] {
  const cell = board[idx];
  if (!cell || cell.open || cell.mark !== 'none') return board.slice();
  const next = board.map((c) => ({ ...c }));
  const stack = [idx];
  while (stack.length > 0) {
    const i = stack.pop() as number;
    const c = next[i];
    if (c.open || c.mark !== 'none') continue;
    c.open = true;
    if (!c.mine && c.adj === 0) {
      for (const n of neighbors(rows, cols, i)) {
        if (!next[n].open && next[n].mark === 'none') stack.push(n);
      }
    }
  }
  return next;
}

/** Cycle mark: none → flag → question → none. Returns a new board. */
export function toggleMark(board: Cell[], idx: number): Cell[] {
  const cell = board[idx];
  if (!cell || cell.open) return board.slice();
  const next = board.map((c) => ({ ...c }));
  const order: Mark[] = ['none', 'flag', 'question'];
  next[idx].mark = order[(order.indexOf(cell.mark) + 1) % order.length];
  return next;
}

export function countFlags(board: Cell[]): number {
  return board.filter((c) => c.mark === 'flag').length;
}

export function openedCount(board: Cell[]): number {
  return board.filter((c) => c.open && !c.mine).length;
}

export function isWin(board: Cell[]): boolean {
  return board.every((c) => c.mine || c.open);
}

export function totalMines(board: Cell[]): number {
  return board.filter((c) => c.mine).length;
}
