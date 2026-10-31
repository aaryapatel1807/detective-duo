/**
 * Escape the Maze generator.
 *
 * Pure functions: a seed string goes in, a maze comes out. Follows the
 * Phase 1 convention (lib/generators/logicGrid.ts): FNV-1a hashSeed +
 * mulberry32, so the same seed always produces the same maze.
 *
 * Generation is an iterative recursive backtracker: it carves a spanning
 * tree over the whole grid, so every maze is a perfect maze — exactly one
 * path between any two cells, and therefore always solvable from the
 * start (top-left) to the exit (bottom-right). Walls are symmetric by
 * construction: opening a wall in one cell opens the shared wall in its
 * neighbour, and the outer border stays closed.
 *
 * Size grows with level: 9x9 at level 1, one cell wider/taller per level,
 * capped at 25x25 so late levels stay playable on a phone screen.
 */
import { hashSeed, mulberry32 } from './logicGrid';

export interface MazePos {
  x: number;
  y: number;
}

export interface MazeWalls {
  top: boolean;
  right: boolean;
  bottom: boolean;
  left: boolean;
}

export interface MazeCell {
  x: number;
  y: number;
  walls: MazeWalls;
}

export interface MazeParams {
  width: number;
  height: number;
}

export interface Maze {
  seed: string;
  level: number;
  width: number;
  height: number;
  /** cells[y][x] */
  cells: MazeCell[][];
  start: MazePos;
  exit: MazePos;
}

export type MazeDirection = 'up' | 'down' | 'left' | 'right';

export const MAZE_DIRECTIONS: MazeDirection[] = ['up', 'down', 'left', 'right'];

const DIR_DELTA: Record<MazeDirection, MazePos> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const DIR_WALL: Record<MazeDirection, keyof MazeWalls> = {
  up: 'top',
  down: 'bottom',
  left: 'left',
  right: 'right',
};

const OPPOSITE_WALL: Record<MazeDirection, keyof MazeWalls> = {
  up: 'bottom',
  down: 'top',
  left: 'right',
  right: 'left',
};

export function mazeParamsForLevel(level: number): MazeParams {
  const size = Math.min(25, 8 + Math.max(1, level));
  return { width: size, height: size };
}

export function mazeLevelSeed(level: number, salt: string): string {
  return `maze|${salt}|${level}`;
}

export function generateMaze(seed: string, width: number, height: number): Maze {
  const rng = mulberry32(hashSeed(seed));
  const cells: MazeCell[][] = Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => ({
      x,
      y,
      walls: { top: true, right: true, bottom: true, left: true },
    })),
  );

  // Iterative recursive backtracker from the start cell.
  const visited: boolean[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => false),
  );
  const stack: MazePos[] = [{ x: 0, y: 0 }];
  visited[0][0] = true;
  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const neighbours: { dir: MazeDirection; pos: MazePos }[] = [];
    for (const dir of MAZE_DIRECTIONS) {
      const d = DIR_DELTA[dir];
      const nx = current.x + d.x;
      const ny = current.y + d.y;
      if (nx >= 0 && nx < width && ny >= 0 && ny < height && !visited[ny][nx]) {
        neighbours.push({ dir, pos: { x: nx, y: ny } });
      }
    }
    if (neighbours.length === 0) {
      stack.pop();
      continue;
    }
    const next = neighbours[Math.floor(rng() * neighbours.length)];
    cells[current.y][current.x].walls[DIR_WALL[next.dir]] = false;
    cells[next.pos.y][next.pos.x].walls[OPPOSITE_WALL[next.dir]] = false;
    visited[next.pos.y][next.pos.x] = true;
    stack.push(next.pos);
  }

  return {
    seed,
    level: 0,
    width,
    height,
    cells,
    start: { x: 0, y: 0 },
    exit: { x: width - 1, y: height - 1 },
  };
}

export function generateLevelMaze(level: number, salt: string): Maze {
  const params = mazeParamsForLevel(level);
  const maze = generateMaze(mazeLevelSeed(level, salt), params.width, params.height);
  return { ...maze, level };
}

export function samePos(a: MazePos, b: MazePos): boolean {
  return a.x === b.x && a.y === b.y;
}

/** True when moving from `pos` in `dir` stays inside the maze and crosses no wall. */
export function canMove(maze: Maze, pos: MazePos, dir: MazeDirection): boolean {
  if (pos.x < 0 || pos.x >= maze.width || pos.y < 0 || pos.y >= maze.height) {
    return false;
  }
  return !maze.cells[pos.y][pos.x].walls[DIR_WALL[dir]];
}

/** The cell reached by moving, or `pos` unchanged when the move is blocked. */
export function movePos(maze: Maze, pos: MazePos, dir: MazeDirection): MazePos {
  if (!canMove(maze, pos, dir)) return pos;
  const d = DIR_DELTA[dir];
  return { x: pos.x + d.x, y: pos.y + d.y };
}

/**
 * Breadth-first shortest path from `from` to the exit, inclusive of both
 * ends, or null when unreachable (never happens for a generated maze, but
 * the solver must not assume it). Because the maze is a spanning tree,
 * the BFS path is also the only path.
 */
export function solveMaze(maze: Maze, from: MazePos = maze.start): MazePos[] | null {
  if (from.x < 0 || from.x >= maze.width || from.y < 0 || from.y >= maze.height) {
    return null;
  }
  const prev: (MazePos | null)[][] = Array.from({ length: maze.height }, () =>
    Array.from({ length: maze.width }, () => null),
  );
  const queue: MazePos[] = [from];
  prev[from.y][from.x] = from;
  while (queue.length > 0) {
    const current = queue.shift() as MazePos;
    if (samePos(current, maze.exit)) {
      const path: MazePos[] = [];
      let step: MazePos = current;
      while (!samePos(step, from)) {
        path.unshift(step);
        step = prev[step.y][step.x] as MazePos;
      }
      path.unshift(from);
      return path;
    }
    for (const dir of MAZE_DIRECTIONS) {
      if (!canMove(maze, current, dir)) continue;
      const d = DIR_DELTA[dir];
      const next = { x: current.x + d.x, y: current.y + d.y };
      if (prev[next.y][next.x] === null) {
        prev[next.y][next.x] = current;
        queue.push(next);
      }
    }
  }
  return null;
}

/** The next cell on the shortest path from `pos` to the exit, or null at the exit. */
export function nextStep(maze: Maze, pos: MazePos): MazePos | null {
  if (samePos(pos, maze.exit)) return null;
  const path = solveMaze(maze, pos);
  if (!path || path.length < 2) return null;
  return path[1];
}
