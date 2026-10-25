/**
 * Real nonogram content: hand-designed pictures, not random blobs.
 *
 * The old endless generator draws seeded blobs (plus a staircase
 * fallback). Real nonogram games (Katana, Picross-style) ship
 * hand-designed, recognisable pictures — and keep endless random as a
 * separate mode. This file is the picture library: every picture is
 * drawn by hand, and the tests prove each one has exactly one
 * solution with the existing solver (B&W) or the color solver below.
 *
 * Format: one string per row. B&W: '#' = filled, '.' = empty.
 * Color: '.' = empty, '1'..'5' = palette colours (see PALETTE).
 */
import {
  cluesFromGrid,
  countSolutions,
  type NonogramPuzzle,
  type NonogramTier,
} from './nonogram';

export const PALETTE: Record<number, string> = {
  1: '#e5484d', // red
  2: '#f5d90a', // yellow
  3: '#46a758', // green
  4: '#0091ff', // blue
  5: '#f76b15', // orange
};

export interface BWPicture {
  name: string;
  group: string;
  rows: string[];
}

export interface ColorPicture {
  name: string;
  group: string;
  rows: string[];
}

export const BW_PICTURES: BWPicture[] = [
  // 5x5 — Tiny
  { name: 'Heart', group: 'Shapes', rows: ['##.##', '#####', '#####', '.###.', '..#..'] },
  { name: 'Sparkle', group: 'Shapes', rows: ['..#..', '.###.', '#####', '.###.', '..#..'] },
  { name: 'Flower', group: 'Nature', rows: ['.#.#.', '#####', '.###.', '..#..', '.#.#.'] },
  { name: 'Arrow', group: 'Shapes', rows: ['....#', '...##', '#####', '...##', '....#'] },
  { name: 'Apple', group: 'Food', rows: ['..#..', '.###.', '#####', '#####', '.###.'] },
  { name: 'Moon', group: 'Nature', rows: ['.###.', '#....', '#....', '#....', '.###.'] },
  // 10x10
  {
    name: 'Cat', group: 'Animals',
    rows: ['#........#', '##......##', '##......##', '##########', '##########', '#.##..##.#', '##########', '.##.##.##.', '..######..', '...####...'],
  },
  {
    name: 'Dog', group: 'Animals',
    rows: ['###....###', '###....###', '##########', '##########', '#.##..##.#', '##########', '##.####.##', '.########.', '..######..', '...####...'],
  },
  {
    name: 'House', group: 'Places',
    rows: ['....##....', '...####...', '..######..', '.########.', '##########', '##.#..#.##', '##.#..#.##', '##########', '####..####', '####..####'],
  },
  {
    name: 'Tree', group: 'Nature',
    rows: ['...####...', '..######..', '.########.', '##########', '##########', '.########.', '..######..', '....##....', '....##....', '....##....'],
  },
  {
    name: 'Boat', group: 'Places',
    rows: ['....#.....', '....##....', '....###...', '....####..', '....#####.', '....#.....', '....#.....', '##########', '.########.', '..######..'],
  },
  {
    name: 'Butterfly', group: 'Animals',
    rows: ['.#......#.', '##......##', '###....###', '####..####', '##########', '##########', '.########.', '.###..###.', '.##....##.', '....##....'],
  },
  {
    name: 'Sun', group: 'Nature',
    rows: ['..##...##.', '..##...##.', '..#######.', '.########.', '##########', '##########', '.########.', '..#######.', '..##...##.', '..##...##.'],
  },
  {
    name: 'Cupcake', group: 'Food',
    rows: ['....#.....', '...###....', '..#####...', '##########', '##########', '.########.', '..######..', '..######..', '...####...', '...####...'],
  },
  // 15x15
  {
    name: 'Rocket', group: 'Places',
    rows: [
      '.......#.......', '......###......', '.....#####.....', '....#######....',
      '....#######....', '....#######....', '....###.###....', '....#######....',
      '....#######....', '....#######....', '..###########..', '.#############.',
      '.###.......###.', '.##.........##.', '......###......',
    ],
  },
  {
    name: 'Castle', group: 'Places',
    rows: [
      '###...###...###', '###...###...###', '###############', '###############',
      '##..#######..##', '##..#######..##', '##..#######..##', '##..#######..##',
      '##..#######..##', '##..##...##..##', '##..##...##..##', '##..##...##..##',
      '##..##...##..##', '##..##...##..##', '###############',
    ],
  },
  {
    name: 'Sunflower', group: 'Nature',
    rows: [
      '.....#####.....', '..###########..', '.#############.', '.#############.',
      '###############', '.#############.', '..###########..', '.....#####.....',
      '.......#.......', '.......#.......', '....#######....', '...#########...',
      '.......#.......', '.......#.......', '.......#.......',
    ],
  },
  {
    name: 'Sailboat', group: 'Places',
    rows: [
      '.......#.......', '.......##......', '.......###.....', '.......####....',
      '.......#####...', '.......######..', '.......#######.', '.......########',
      '.......#.......', '.......#.......', '###############', '.#############.',
      '..###########..', '...#########...', '..#...#...#....',
    ],
  },
];

export const COLOR_PICTURES: ColorPicture[] = [
  // 5x5 — Tiny color
  { name: 'Flower', group: 'Nature', rows: ['.1.1.', '11111', '.121.', '..3..', '.3.3.'] },
  { name: 'Fish', group: 'Animals', rows: ['5....', '555..', '55545', '555..', '5....'] },
  { name: 'Ice cream', group: 'Food', rows: ['..1..', '.111.', '22222', '.555.', '..5..'] },
  { name: 'Bird', group: 'Animals', rows: ['.44..', '44442', '44344', '444..', '.4...'] },
  // 10x10 — Color
  {
    name: 'Cat', group: 'Animals',
    rows: ['55......55', '551....155', '5555555555', '5525555255', '5555555555', '5555225555', '5555555555', '.55555555.', '..555555..', '...5555...'],
  },
  {
    name: 'House', group: 'Places',
    rows: ['....11....', '...1111...', '..111111..', '.11111111.', '1111111111', '22.2222.22', '22.2222.22', '2222222222', '2222332222', '2222332222'],
  },
  {
    name: 'Butterfly', group: 'Animals',
    rows: ['.11....11.', '11......11', '111....111', '1111..1111', '1111111111', '1111331111', '1111331111', '.11133111.', '.111..111.', '....33....'],
  },
  {
    name: 'Car', group: 'Places',
    rows: ['...1111...', '..111111..', '.1114411..', '1111111111', '1111111111', '1111111111', '.11111111.', '2211111122', '2211111122', '2222222222'],
  },
];

export function parseBWPicture(pic: BWPicture): boolean[][] {
  return pic.rows.map((row) => [...row].map((ch) => ch === '#'));
}

/** Color grid: 0 = empty, otherwise the palette digit. */
export function parseColorPicture(pic: ColorPicture): number[][] {
  return pic.rows.map((row) =>
    [...row].map((ch) => {
      if (ch === '.') return 0;
      const n = Number(ch);
      if (!Number.isInteger(n) || n < 1 || n > 5) throw new Error(`bad color char ${ch}`);
      return n;
    }),
  );
}

export function bwPictureAt(level: number): BWPicture | null {
  const idx = level - 1;
  return idx >= 0 && idx < BW_PICTURES.length ? BW_PICTURES[idx] : null;
}

export function colorPictureAt(level: number): ColorPicture | null {
  const idx = level - 1;
  return idx >= 0 && idx < COLOR_PICTURES.length ? COLOR_PICTURES[idx] : null;
}

function tierForSize(size: number): NonogramTier {
  if (size <= 5) return 'Easy';
  if (size <= 10) return 'Medium';
  return 'Hard';
}

export function picturePuzzleFromBW(pic: BWPicture, level: number): NonogramPuzzle {
  const grid = parseBWPicture(pic);
  const { rowClues, colClues } = cluesFromGrid(grid);
  return {
    seed: `pic|${pic.name}|${level}`,
    level,
    tier: tierForSize(grid.length),
    size: grid.length,
    grid,
    rowClues,
    colClues,
  };
}

// ------------------------------------------------------------ color ----

export interface ColorClue {
  n: number;
  c: number;
}

export function colorRunsOf(line: number[]): ColorClue[] {
  const runs: ColorClue[] = [];
  let cur = 0;
  let curC = 0;
  for (const cell of line) {
    if (cell !== 0 && cell === curC) {
      cur++;
    } else {
      if (cur > 0) runs.push({ n: cur, c: curC });
      cur = cell === 0 ? 0 : 1;
      curC = cell;
    }
  }
  if (cur > 0) runs.push({ n: cur, c: curC });
  return runs;
}

export function colorCluesFromGrid(grid: number[][]): {
  rowClues: ColorClue[][];
  colClues: ColorClue[][];
} {
  const n = grid.length;
  const rowClues = grid.map((row) => colorRunsOf(row));
  const colClues: ColorClue[][] = [];
  for (let c = 0; c < n; c++) {
    colClues.push(colorRunsOf(grid.map((row) => row[c])));
  }
  return { rowClues, colClues };
}

/**
 * All length-`len` color assignments whose filled runs equal `clue`.
 * Rule (standard color nonograms): runs appear in order; two runs of
 * the SAME colour need at least one empty cell between them, runs of
 * different colours may touch.
 */
export function optionsForColorClue(clue: ColorClue[], len: number): number[][] {
  const out: number[][] = [];
  const minSpace = (rest: ColorClue[], prevC: number): number => {
    let total = 0;
    let prev = prevC;
    for (const r of rest) {
      total += (r.c === prev ? 1 : 0) + r.n;
      prev = r.c;
    }
    return total;
  };
  const place = (i: number, pos: number, cells: number[]): void => {
    if (i === clue.length) {
      out.push([...cells]);
      return;
    }
    const { n, c } = clue[i];
    const rest = clue.slice(i + 1);
    const gapAfter = rest.length > 0 && rest[0].c === c ? 1 : 0;
    for (let s = pos; s + n + minSpace(rest, c) <= len; s++) {
      const next = [...cells];
      for (let k = 0; k < n; k++) next[s + k] = c;
      place(i + 1, s + n + gapAfter, next);
    }
  };
  place(0, 0, new Array(len).fill(0));
  return out;
}

/**
 * Count color-grid solutions for a clue set, stopping at `limit`.
 * Same row-by-row shape as the B&W solver; -1 means the node budget
 * ran out (unknown, not a count).
 */
export function countColorSolutions(
  rowClues: ColorClue[][],
  colClues: ColorClue[][],
  size: number,
  limit = 2,
): number {
  const rowOptions = rowClues.map((c) => optionsForColorClue(c, size));
  const colOptions = colClues.map((c) => optionsForColorClue(c, size));
  if (rowOptions.some((o) => o.length === 0) || colOptions.some((o) => o.length === 0)) {
    return 0;
  }
  const rowOrder = rowOptions
    .map((opts, i) => ({ i, n: opts.length }))
    .sort((a, b) => a.n - b.n)
    .map((x) => x.i);
  let count = 0;
  let nodes = 0;
  let overBudget = false;
  const NODE_BUDGET = 200_000;

  const dfs = (pos: number, colFiltered: number[][][]): void => {
    if (count >= limit || overBudget) return;
    if (++nodes > NODE_BUDGET) {
      overBudget = true;
      return;
    }
    if (pos === size) {
      count++;
      return;
    }
    const row = rowOrder[pos];
    for (const assignment of rowOptions[row]) {
      const next: number[][][] = new Array(size);
      let ok = true;
      for (let c = 0; c < size; c++) {
        const filtered = colFiltered[c].filter((cm) => cm[row] === assignment[c]);
        if (filtered.length === 0) {
          ok = false;
          break;
        }
        next[c] = filtered;
      }
      if (!ok) continue;
      dfs(pos + 1, next);
      if (count >= limit || overBudget) return;
    }
  };

  dfs(0, colOptions);
  if (overBudget) return -1;
  return count;
}

export interface ColorPuzzle {
  name: string;
  group: string;
  size: number;
  palette: number[];
  grid: number[][];
  rowClues: ColorClue[][];
  colClues: ColorClue[][];
}

export function colorPuzzleFromPicture(pic: ColorPicture): ColorPuzzle {
  const grid = parseColorPicture(pic);
  const { rowClues, colClues } = colorCluesFromGrid(grid);
  const palette = [...new Set(grid.flat().filter((v) => v !== 0))].sort((a, b) => a - b);
  return { name: pic.name, group: pic.group, size: grid.length, palette, grid, rowClues, colClues };
}

// --------------------------------------------------------- auto-cross ----

/**
 * Mark X on every cell of a fully-correct B&W line (row or column):
 * the line is complete when every cell matches the solution, and then
 * every solution-empty cell that is still blank becomes an X.
 * Cells: 0 blank, 1 filled, 2 X.
 */
export function autoCrossBW(
  cells: Record<string, number>,
  grid: boolean[][],
): Record<string, number> {
  const out = { ...cells };
  const n = grid.length;
  const key = (r: number, c: number) => `${r}:${c}`;
  for (let r = 0; r < n; r++) {
    let complete = true;
    for (let c = 0; c < n; c++) {
      if (((out[key(r, c)] ?? 0) === 1) !== grid[r][c]) {
        complete = false;
        break;
      }
    }
    if (complete) {
      for (let c = 0; c < n; c++) {
        if (!grid[r][c] && (out[key(r, c)] ?? 0) === 0) out[key(r, c)] = 2;
      }
    }
  }
  for (let c = 0; c < n; c++) {
    let complete = true;
    for (let r = 0; r < n; r++) {
      if (((out[key(r, c)] ?? 0) === 1) !== grid[r][c]) {
        complete = false;
        break;
      }
    }
    if (complete) {
      for (let r = 0; r < n; r++) {
        if (!grid[r][c] && (out[key(r, c)] ?? 0) === 0) out[key(r, c)] = 2;
      }
    }
  }
  return out;
}

/**
 * Same for color lines. Cells: 0 blank, -1 X, otherwise palette digit.
 * A line is complete when every solution-filled cell has exactly its
 * colour and no cell is filled where the solution is empty.
 */
export function autoCrossColor(
  cells: Record<string, number>,
  grid: number[][],
): Record<string, number> {
  const out = { ...cells };
  const n = grid.length;
  const key = (r: number, c: number) => `${r}:${c}`;
  const lineComplete = (get: (i: number) => number, sol: (i: number) => number): boolean => {
    for (let i = 0; i < n; i++) {
      const v = get(i);
      const s = sol(i);
      if (s === 0) {
        if (v !== 0 && v !== -1) return false;
      } else if (v !== s) {
        return false;
      }
    }
    return true;
  };
  for (let r = 0; r < n; r++) {
    if (lineComplete((c) => out[key(r, c)] ?? 0, (c) => grid[r][c])) {
      for (let c = 0; c < n; c++) {
        if (grid[r][c] === 0 && (out[key(r, c)] ?? 0) === 0) out[key(r, c)] = -1;
      }
    }
  }
  for (let c = 0; c < n; c++) {
    if (lineComplete((r) => out[key(r, c)] ?? 0, (r) => grid[r][c])) {
      for (let r = 0; r < n; r++) {
        if (grid[r][c] === 0 && (out[key(r, c)] ?? 0) === 0) out[key(r, c)] = -1;
      }
    }
  }
  return out;
}

/** B&W uniqueness check used by the tests (and only by the tests). */
export function bwPictureIsUnique(pic: BWPicture): boolean {
  const grid = parseBWPicture(pic);
  const { rowClues, colClues } = cluesFromGrid(grid);
  return countSolutions(rowClues, colClues, grid.length, 2) === 1;
}

/** Color uniqueness check used by the tests (and only by the tests). */
export function colorPictureIsUnique(pic: ColorPicture): boolean {
  const puzzle = colorPuzzleFromPicture(pic);
  return countColorSolutions(puzzle.rowClues, puzzle.colClues, puzzle.size, 2) === 1;
}
