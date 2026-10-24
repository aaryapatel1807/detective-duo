/**
 * Nonogram generator.
 *
 * Pure functions: a seed string goes in, a puzzle comes out. The same
 * seed always produces the same puzzle (FNV-1a + mulberry32, same
 * pattern as lib/generators/logicGrid.ts).
 *
 * A picture is drawn (seeded blobs), its row/column clues are derived,
 * and a solver counts solutions up to 2. Only pictures with exactly
 * one solution ship. If blob pictures keep failing for a seed, the
 * generator falls back to a staircase (Ferrers) picture, which is
 * provably unique: every row is a single run touching the full edge,
 * so the edge clue forces every row to be a prefix of its clue length.
 */
export function hashSeed(seed: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seedNum: number): () => number {
  let a = seedNum >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --------------------------------------------------------------- tiers ----

export type NonogramTier = 'Easy' | 'Medium' | 'Hard' | 'Expert';

export function tierName(level: number): NonogramTier {
  if (level <= 10) return 'Easy';
  if (level <= 30) return 'Medium';
  if (level <= 60) return 'Hard';
  return 'Expert';
}

/** Grid size grows 5x5 -> 20x20 across the ladder, never shrinking. */
export function sizeForLevel(level: number): number {
  if (level <= 10) return 5 + Math.floor((level - 1) / 2);
  if (level <= 30) return 10 + Math.floor((level - 11) / 4);
  if (level <= 60) return 15 + Math.floor((level - 31) / 10);
  return 18 + Math.min(2, Math.floor((level - 61) / 10));
}

// --------------------------------------------------------------- clues ----

export function runsOf(line: boolean[]): number[] {
  const runs: number[] = [];
  let cur = 0;
  for (const cell of line) {
    if (cell) cur++;
    else if (cur > 0) {
      runs.push(cur);
      cur = 0;
    }
  }
  if (cur > 0) runs.push(cur);
  return runs;
}

export function cluesFromGrid(grid: boolean[][]): {
  rowClues: number[][];
  colClues: number[][];
} {
  const n = grid.length;
  const rowClues = grid.map((row) => runsOf(row));
  const colClues: number[][] = [];
  for (let c = 0; c < n; c++) {
    colClues.push(runsOf(grid.map((row) => row[c])));
  }
  return { rowClues, colClues };
}

/** All length-`len` bitmasks whose filled runs equal `clue`. Bit c = cell c. */
export function optionsForClue(clue: number[], len: number): number[] {
  const out: number[] = [];
  if (clue.length === 0) return [0];
  const place = (runIdx: number, pos: number, mask: number): void => {
    if (runIdx === clue.length) {
      out.push(mask);
      return;
    }
    const run = clue[runIdx];
    const remainingMin =
      clue.slice(runIdx + 1).reduce((s, r) => s + r + 1, 0);
    for (let start = pos; start + run + remainingMin <= len; start++) {
      let m = mask;
      for (let k = 0; k < run; k++) m |= 1 << (start + k);
      place(runIdx + 1, start + run + 1, m);
    }
  };
  place(0, 0, 0);
  return out;
}

/**
 * Count solutions for a clue set, stopping at `limit`.
 * Row-by-row search: each row tries its clue-compatible masks, and
 * each column keeps only the column masks still compatible with the
 * rows placed so far. A full row assignment with a surviving column
 * mask per column is a solution.
 *
 * Rows are tried most-constrained first (fewest placements), which
 * prunes loose, ambiguous clue sets early. Returns -1 when the node
 * budget is exceeded (unknown, not a count): callers treat that as
 * "not proven unique" so generation never hangs on a bad picture.
 */
export function countSolutions(
  rowClues: number[][],
  colClues: number[][],
  size: number,
  limit = 2,
): number {
  const rowOptions = rowClues.map((c) => optionsForClue(c, size));
  const colOptions = colClues.map((c) => optionsForClue(c, size));
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

  const dfs = (pos: number, colFiltered: number[][]): void => {
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
    for (const mask of rowOptions[row]) {
      const next: number[][] = new Array(size);
      let ok = true;
      for (let c = 0; c < size; c++) {
        const bit = (mask >> c) & 1;
        const filtered = colFiltered[c].filter((cm) => ((cm >> row) & 1) === bit);
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

// ------------------------------------------------------------ pictures ----

function blobPicture(size: number, rng: () => number): boolean[][] {
  const grid: boolean[][] = Array.from({ length: size }, () =>
    new Array(size).fill(false),
  );
  const blobs = 2 + Math.floor(rng() * 3);
  for (let b = 0; b < blobs; b++) {
    const cx = Math.floor(rng() * size);
    const cy = Math.floor(rng() * size);
    const rx = 1 + Math.floor(rng() * Math.max(1, size / 3));
    const ry = 1 + Math.floor(rng() * Math.max(1, size / 3));
    const rect = rng() < 0.5;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (rect) {
          if (Math.abs(c - cx) <= rx && Math.abs(r - cy) <= ry) grid[r][c] = true;
        } else {
          const dx = (c - cx) / rx;
          const dy = (r - cy) / ry;
          if (dx * dx + dy * dy <= 1) grid[r][c] = true;
        }
      }
    }
  }
  // Sprinkle single cells for texture.
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!grid[r][c] && rng() < 0.06) grid[r][c] = true;
    }
  }
  return grid;
}

function hasFullLines(grid: boolean[][]): boolean {
  const n = grid.length;
  for (let r = 0; r < n; r++) {
    if (!grid[r].some(Boolean)) return false;
  }
  for (let c = 0; c < n; c++) {
    if (!grid.some((row) => row[c])) return false;
  }
  return true;
}

function density(grid: boolean[][]): number {
  const n = grid.length;
  let filled = 0;
  for (const row of grid) for (const cell of row) if (cell) filled++;
  return filled / (n * n);
}

/**
 * Provably-unique staircase picture. Row lengths are nonincreasing,
 * every row is at least 1 cell, and rows are left-justified prefixes.
 * The column-0 clue is then [size], which forces every row to touch
 * column 0; a single run touching column 0 is a prefix, so the row
 * clues alone pin the picture. Flips/transpose keep the argument
 * (a full edge line forces the runs onto that edge).
 */
export function staircasePicture(size: number, rng: () => number): boolean[][] {
  const lengths: number[] = [];
  let cur = 1 + Math.floor(rng() * size);
  for (let r = 0; r < size; r++) {
    lengths.push(cur);
    // Step down by 0..2, never below 1, and keep the sequence sorted
    // by re-rolling steps that would go below 1 into a flat step.
    const step = Math.floor(rng() * 3);
    cur = Math.max(1, cur - step);
  }
  // Enforce nonincreasing (the loop already does) and build the grid.
  let base: boolean[][] = lengths.map((len) =>
    Array.from({ length: size }, (_, c) => c < len),
  );
  const variant = Math.floor(rng() * 4);
  if (variant === 1) {
    base = base.map((row) => [...row].reverse());
  } else if (variant === 2) {
    base = Array.from({ length: size }, (_, r) =>
      Array.from({ length: size }, (_, c) => base[c][r]),
    );
  } else if (variant === 3) {
    const t = Array.from({ length: size }, (_, r) =>
      Array.from({ length: size }, (_, c) => base[c][r]),
    );
    base = [...t].reverse();
  }
  return base;
}

// -------------------------------------------------------------- puzzle ----

export interface NonogramPuzzle {
  seed: string;
  level: number;
  tier: NonogramTier;
  size: number;
  grid: boolean[][];
  rowClues: number[][];
  colClues: number[][];
}

export function levelSeed(level: number, salt: string): string {
  return `ng|${salt}|${level}`;
}

export function generatePuzzle(seed: string, level: number): NonogramPuzzle {
  const rng = mulberry32(hashSeed(seed));
  for (let i = 0; i < 8; i++) rng();
  const size = sizeForLevel(level);
  const attempts = size <= 10 ? 40 : size <= 15 ? 20 : 12;

  for (let a = 0; a < attempts; a++) {
    const grid = blobPicture(size, rng);
    if (!hasFullLines(grid)) continue;
    const d = density(grid);
    if (d < 0.25 || d > 0.65) continue;
    const { rowClues, colClues } = cluesFromGrid(grid);
    if (countSolutions(rowClues, colClues, size, 2) === 1) {
      return { seed, level, tier: tierName(level), size, grid, rowClues, colClues };
    }
  }

  // Fallback: staircase pictures are unique by construction; verify anyway.
  for (let a = 0; a < 20; a++) {
    const grid = staircasePicture(size, rng);
    const { rowClues, colClues } = cluesFromGrid(grid);
    if (countSolutions(rowClues, colClues, size, 2) === 1) {
      return { seed, level, tier: tierName(level), size, grid, rowClues, colClues };
    }
  }
  throw new Error(`nonogram generator failed for seed ${seed} level ${level}`);
}

export function generateLevelPuzzle(level: number, salt: string): NonogramPuzzle {
  return generatePuzzle(levelSeed(level, salt), level);
}
