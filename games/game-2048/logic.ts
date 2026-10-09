/* 2048 core — pure grid logic, unit-testable. Grid is row-major, length 16. */

export type Direction = 'up' | 'down' | 'left' | 'right';
export type Grid = number[];

export const BOARD_SIZE = 4;
export const CELLS = BOARD_SIZE * BOARD_SIZE;
export const WIN_TILE = 2048;

export function emptyGrid(): Grid {
  return new Array<number>(CELLS).fill(0);
}

export interface SpawnResult {
  grid: Grid;
  /** index of the new tile, or -1 when the board was full */
  index: number;
}

/** Drop a 2 (90%) or 4 (10%) into a random empty cell. */
export function spawnTile(grid: Grid, rng: () => number = Math.random): SpawnResult {
  const empties: number[] = [];
  for (let i = 0; i < CELLS; i++) {
    if (grid[i] === 0) empties.push(i);
  }
  if (empties.length === 0) return { grid: grid.slice(), index: -1 };
  const pick = empties[Math.floor(rng() * empties.length)];
  const next = grid.slice();
  next[pick] = rng() < 0.9 ? 2 : 4;
  return { grid: next, index: pick };
}

interface SlideResult {
  line: number[];
  gained: number;
  moved: boolean;
}

/** Slide one row/column toward index 0, merging equal neighbours once each. */
function slideLine(line: number[]): SlideResult {
  const tiles = line.filter((v) => v !== 0);
  const out: number[] = [];
  let gained = 0;
  let i = 0;
  while (i < tiles.length) {
    if (i + 1 < tiles.length && tiles[i] === tiles[i + 1]) {
      const v = tiles[i] * 2;
      out.push(v);
      gained += v;
      i += 2;
    } else {
      out.push(tiles[i]);
      i += 1;
    }
  }
  while (out.length < BOARD_SIZE) out.push(0);
  const moved = out.some((v, k) => v !== line[k]);
  return { line: out, gained, moved };
}

/** Cell indices for each of the 4 lines, ordered in the slide direction. */
function lineIndices(dir: Direction): number[][] {
  const lines: number[][] = [];
  for (let k = 0; k < BOARD_SIZE; k++) {
    const idx: number[] = [];
    for (let j = 0; j < BOARD_SIZE; j++) {
      let r: number;
      let c: number;
      if (dir === 'left') {
        r = k;
        c = j;
      } else if (dir === 'right') {
        r = k;
        c = BOARD_SIZE - 1 - j;
      } else if (dir === 'up') {
        r = j;
        c = k;
      } else {
        r = BOARD_SIZE - 1 - j;
        c = k;
      }
      idx.push(r * BOARD_SIZE + c);
    }
    lines.push(idx);
  }
  return lines;
}

export interface MoveResult {
  grid: Grid;
  gained: number;
  moved: boolean;
}

export function move(grid: Grid, dir: Direction): MoveResult {
  const next = grid.slice();
  let gained = 0;
  let moved = false;
  for (const idx of lineIndices(dir)) {
    const line = idx.map((i) => grid[i]);
    const r = slideLine(line);
    gained += r.gained;
    moved = moved || r.moved;
    idx.forEach((cell, k) => {
      next[cell] = r.line[k];
    });
  }
  return { grid: next, gained, moved };
}

export function hasWon(grid: Grid): boolean {
  return grid.some((v) => v >= WIN_TILE);
}

export function canMove(grid: Grid): boolean {
  if (grid.some((v) => v === 0)) return true;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const v = grid[r * BOARD_SIZE + c];
      if (c + 1 < BOARD_SIZE && grid[r * BOARD_SIZE + c + 1] === v) return true;
      if (r + 1 < BOARD_SIZE && grid[(r + 1) * BOARD_SIZE + c] === v) return true;
    }
  }
  return false;
}

export function isGameOver(grid: Grid): boolean {
  return !canMove(grid);
}

export function maxTile(grid: Grid): number {
  return Math.max(...grid);
}
