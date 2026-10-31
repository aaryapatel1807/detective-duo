import { describe, expect, it } from 'vitest';
import {
  canMove,
  generateLevelMaze,
  generateMaze,
  mazeParamsForLevel,
  nextStep,
  samePos,
  solveMaze,
  type MazePos,
} from './maze';

function pathIsValid(maze: ReturnType<typeof generateMaze>, path: MazePos[]): void {
  expect(path[0]).toEqual(maze.start);
  expect(path[path.length - 1]).toEqual(maze.exit);
  for (let i = 1; i < path.length; i++) {
    const prev = path[i - 1];
    const cur = path[i];
    const dx = Math.abs(cur.x - prev.x);
    const dy = Math.abs(cur.y - prev.y);
    expect(dx + dy, `step ${i} must be to an adjacent cell`).toBe(1);
    const dir =
      cur.x > prev.x ? 'right' : cur.x < prev.x ? 'left' : cur.y > prev.y ? 'down' : 'up';
    expect(canMove(maze, prev, dir), `step ${i} must not cross a wall`).toBe(true);
  }
}

describe('escape the maze generator', () => {
  it('is deterministic: same seed, same maze', () => {
    const a = generateMaze('maze|tester|7', 11, 11);
    const b = generateMaze('maze|tester|7', 11, 11);
    expect(b).toEqual(a);
  });

  it('a different seed gives a different maze', () => {
    const a = generateMaze('maze|tester|7', 11, 11);
    const b = generateMaze('maze|tester|8', 11, 11);
    expect(b).not.toEqual(a);
  });

  it('level mazes are deterministic per salt and level', () => {
    expect(generateLevelMaze(3, 'solo')).toEqual(generateLevelMaze(3, 'solo'));
    expect(generateLevelMaze(3, 'solo')).not.toEqual(generateLevelMaze(4, 'solo'));
  });

  it('start and exit are opposite corners', () => {
    const maze = generateMaze('maze|corners|1', 9, 9);
    expect(maze.start).toEqual({ x: 0, y: 0 });
    expect(maze.exit).toEqual({ x: 8, y: 8 });
  });

  it('walls are symmetric and the outer border stays closed', () => {
    const maze = generateMaze('maze|walls|1', 12, 12);
    for (let y = 0; y < maze.height; y++) {
      for (let x = 0; x < maze.width; x++) {
        const cell = maze.cells[y][x];
        if (x === 0) expect(cell.walls.left).toBe(true);
        if (x === maze.width - 1) expect(cell.walls.right).toBe(true);
        if (y === 0) expect(cell.walls.top).toBe(true);
        if (y === maze.height - 1) expect(cell.walls.bottom).toBe(true);
        if (x + 1 < maze.width) {
          expect(cell.walls.right).toBe(maze.cells[y][x + 1].walls.left);
        }
        if (y + 1 < maze.height) {
          expect(cell.walls.bottom).toBe(maze.cells[y + 1][x].walls.top);
        }
      }
    }
  });

  it('every generated maze is solvable, across levels 1-30 and several seeds', () => {
    for (let level = 1; level <= 30; level++) {
      for (const salt of ['a', 'b', 'c']) {
        const maze = generateLevelMaze(level, salt);
        const path = solveMaze(maze);
        expect(path, `level ${level} salt ${salt} must have a path`).not.toBeNull();
        pathIsValid(maze, path as MazePos[]);
      }
    }
  });

  it('the solver path from any cell on the path reaches the exit', () => {
    const maze = generateLevelMaze(5, 'midpath');
    const path = solveMaze(maze) as MazePos[];
    for (const pos of path) {
      const tail = solveMaze(maze, pos);
      expect(tail).not.toBeNull();
      expect((tail as MazePos[])[0]).toEqual(pos);
      expect((tail as MazePos[])[(tail as MazePos[]).length - 1]).toEqual(maze.exit);
    }
  });

  it('hint steps along the shortest path: each next step is one move closer', () => {
    const maze = generateLevelMaze(4, 'hint');
    let pos = maze.start;
    const full = solveMaze(maze) as MazePos[];
    let steps = 0;
    while (!samePos(pos, maze.exit)) {
      const step = nextStep(maze, pos);
      expect(step, 'hint must exist before the exit').not.toBeNull();
      pos = step as MazePos;
      steps++;
      expect(steps).toBeLessThanOrEqual(full.length);
    }
    expect(steps).toBe(full.length - 1);
    expect(nextStep(maze, maze.exit)).toBeNull();
  });

  it('level size grows with level and caps at 25', () => {
    expect(mazeParamsForLevel(1)).toEqual({ width: 9, height: 9 });
    let prev = 0;
    for (let level = 1; level <= 40; level++) {
      const { width, height } = mazeParamsForLevel(level);
      expect(width).toBeGreaterThanOrEqual(prev);
      expect(height).toBe(width);
      prev = width;
    }
    expect(mazeParamsForLevel(10).width).toBeGreaterThan(mazeParamsForLevel(1).width);
    expect(mazeParamsForLevel(100)).toEqual({ width: 25, height: 25 });
  });
});
