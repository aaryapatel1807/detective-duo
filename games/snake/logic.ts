/* Snake core — pure step logic, unit-testable. */

export interface Vec {
  x: number;
  y: number;
}

export type SpeedId = 'slow' | 'normal' | 'fast';

export const SPEEDS: Record<SpeedId, { ms: number; label: string }> = {
  slow: { ms: 150, label: 'Stakeout · slow' },
  normal: { ms: 105, label: 'Tail · normal' },
  fast: { ms: 70, label: 'Getaway · fast' },
};

export const COLS = 20;
export const ROWS = 20;

export interface SnakeState {
  cols: number;
  rows: number;
  snake: Vec[]; // head first
  dir: Vec;
  queue: Vec[]; // buffered direction changes
  food: Vec;
  score: number;
  dead: boolean;
}

function same(a: Vec, b: Vec): boolean {
  return a.x === b.x && a.y === b.y;
}

function isReverse(a: Vec, b: Vec): boolean {
  return a.x === -b.x && a.y === -b.y;
}

/** Find a free cell for food; falls back to any cell if the board is full. */
export function spawnFood(snake: Vec[], cols: number, rows: number, rng: () => number): Vec {
  const occupied = new Set(snake.map((s) => s.y * cols + s.x));
  const free: number[] = [];
  for (let i = 0; i < cols * rows; i++) {
    if (!occupied.has(i)) free.push(i);
  }
  if (free.length === 0) return { x: 0, y: 0 };
  const pick = free[Math.floor(rng() * free.length)];
  return { x: pick % cols, y: Math.floor(pick / cols) };
}

export function initSnake(
  cols: number = COLS,
  rows: number = ROWS,
  rng: () => number = Math.random,
): SnakeState {
  const mid = { x: Math.floor(cols / 2), y: Math.floor(rows / 2) };
  const snake: Vec[] = [mid, { x: mid.x - 1, y: mid.y }, { x: mid.x - 2, y: mid.y }];
  return {
    cols,
    rows,
    snake,
    dir: { x: 1, y: 0 },
    queue: [],
    food: spawnFood(snake, cols, rows, rng),
    score: 0,
    dead: false,
  };
}

/** Buffer a direction change; ignores reversals. Pure. */
export function queueDirection(s: SnakeState, d: Vec): SnakeState {
  const last = s.queue.length > 0 ? s.queue[s.queue.length - 1] : s.dir;
  if (same(d, last) || isReverse(d, last)) return s;
  return { ...s, queue: [...s.queue, d] };
}

/** Advance one tick. Pure. */
export function step(s: SnakeState, rng: () => number = Math.random): SnakeState {
  if (s.dead) return s;
  const queue = s.queue.slice();
  const dir = queue.length > 0 ? (queue.shift() as Vec) : s.dir;
  const head: Vec = { x: s.snake[0].x + dir.x, y: s.snake[0].y + dir.y };

  // Wall collision.
  if (head.x < 0 || head.y < 0 || head.x >= s.cols || head.y >= s.rows) {
    return { ...s, dir, queue, dead: true };
  }
  const eating = same(head, s.food);
  // The tail cell moves away unless we're growing — exclude it from the check.
  const body = eating ? s.snake : s.snake.slice(0, -1);
  if (body.some((seg) => same(seg, head))) {
    return { ...s, dir, queue, dead: true };
  }

  const snake = [head, ...s.snake];
  let food = s.food;
  let score = s.score;
  if (eating) {
    score += 10;
    food = spawnFood(snake, s.cols, s.rows, rng);
  } else {
    snake.pop();
  }
  return { ...s, snake, dir, queue, food, score, dead: false };
}
