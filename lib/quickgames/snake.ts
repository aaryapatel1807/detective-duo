/**
 * Snake Arena (Phase 6 quick game): real-time snakes in one arena.
 * Fruit grows you, golden stars are worth more, shields let you
 * survive one crash, boosts add points. Clip a wall or a body and
 * you're out (unless a shield saves you).
 *
 * The step function is pure and tested; the tick loop lives in the
 * view. Room versus is parallel arenas on the same seed — real-time
 * snake sync over broadcast would be laggy and unfair, so each player
 * runs their own arena and the race is on score.
 */
import { rngFromSeed } from '../generators/rng';

export const SNAKE_SIZE = 16;

export type SnakeCell = { x: number; y: number };
export type SnakeDir = 'up' | 'down' | 'left' | 'right';
export type PickupKind = 'fruit' | 'star' | 'shield' | 'boost';

export interface SnakeState {
  snake: SnakeCell[];
  dir: SnakeDir;
  other: SnakeCell[] | null; // bot snake (solo) or null
  otherDir: SnakeDir;
  pickups: { at: SnakeCell; kind: PickupKind }[];
  score: number;
  otherScore: number;
  alive: boolean;
  otherAlive: boolean;
  shields: number;
  over: boolean;
}

export function snakeTargetForLevel(level: number): number {
  if (level <= 10) return 10;
  if (level <= 30) return 16;
  if (level <= 60) return 22;
  return 30;
}

export function snakeTickMsForLevel(level: number): number {
  if (level <= 10) return 220;
  if (level <= 30) return 180;
  if (level <= 60) return 150;
  return 125;
}

const DIRS: Record<SnakeDir, SnakeCell> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export function oppositeDir(d: SnakeDir): SnakeDir {
  return d === 'up' ? 'down' : d === 'down' ? 'up' : d === 'left' ? 'right' : 'left';
}

function freeCells(state: SnakeState): SnakeCell[] {
  const taken = new Set<string>();
  for (const c of [...state.snake, ...(state.other ?? [])]) taken.add(`${c.x},${c.y}`);
  for (const p of state.pickups) taken.add(`${p.at.x},${p.at.y}`);
  const out: SnakeCell[] = [];
  for (let y = 0; y < SNAKE_SIZE; y++) {
    for (let x = 0; x < SNAKE_SIZE; x++) {
      if (!taken.has(`${x},${y}`)) out.push({ x, y });
    }
  }
  return out;
}

export function initialSnake(seed: string, withBot: boolean): SnakeState {
  const rng = rngFromSeed(`snake|${seed}`);
  const state: SnakeState = {
    snake: [
      { x: 3, y: 8 },
      { x: 2, y: 8 },
      { x: 1, y: 8 },
    ],
    dir: 'right',
    other: withBot
      ? [
          { x: 12, y: 8 },
          { x: 13, y: 8 },
          { x: 14, y: 8 },
        ]
      : null,
    otherDir: 'left',
    pickups: [],
    score: 0,
    otherScore: 0,
    alive: true,
    otherAlive: withBot,
    shields: 0,
    over: false,
  };
  const free = freeCells(state);
  for (let i = 0; i < 3; i++) {
    const cell = free[Math.floor(rng() * free.length)]!;
    state.pickups.push({ at: cell, kind: 'fruit' });
    free.splice(free.indexOf(cell), 1);
  }
  return state;
}

function stepOne(
  body: SnakeCell[],
  dir: SnakeDir,
  pickups: SnakeState['pickups'],
  otherBody: SnakeCell[],
): {
  body: SnakeCell[];
  ate: PickupKind | null;
  died: boolean;
} {
  const head = body[0]!;
  const d = DIRS[dir];
  const next = { x: head.x + d.x, y: head.y + d.y };
  const outOfBoard =
    next.x < 0 || next.y < 0 || next.x >= SNAKE_SIZE || next.y >= SNAKE_SIZE;
  const pickupIdx = pickups.findIndex((p) => p.at.x === next.x && p.at.y === next.y);
  const ate = pickupIdx >= 0 ? pickups[pickupIdx]!.kind : null;
  // The tail moves away unless we grow, so it never blocks.
  const bodyWithoutTail = ate ? body : body.slice(0, -1);
  const hitsSelf = bodyWithoutTail.some((c) => c.x === next.x && c.y === next.y);
  const hitsOther = otherBody.some((c) => c.x === next.x && c.y === next.y);
  if (outOfBoard || hitsSelf || hitsOther) return { body, ate: null, died: true };
  return { body: [next, ...bodyWithoutTail], ate, died: false };
}

/** One tick: move both snakes, resolve pickups, respawn eaten ones. */
export function stepSnake(state: SnakeState, seed: string): SnakeState {
  if (state.over) return state;
  const rng = rngFromSeed(`${seed}|tick|${state.snake.length + state.score}`);
  let pickups = [...state.pickups];
  let shields = state.shields;
  let score = state.score;
  let alive = state.alive;
  let snake = state.snake;

  if (alive) {
    const r = stepOne(snake, state.dir, pickups, state.other ?? []);
    if (r.died) {
      if (shields > 0) {
        shields -= 1;
      } else {
        alive = false;
      }
    } else {
      snake = r.body;
      if (r.ate) {
        pickups = pickups.filter(
          (p) => !(p.at.x === snake[0]!.x && p.at.y === snake[0]!.y),
        );
        if (r.ate === 'fruit') score += 1;
        if (r.ate === 'star') score += 3;
        if (r.ate === 'shield') shields += 1;
        if (r.ate === 'boost') score += 2;
      }
    }
  }

  let other = state.other;
  let otherAlive = state.otherAlive;
  let otherScore = state.otherScore;
  if (other && otherAlive) {
    const r = stepOne(other, state.otherDir, pickups, snake);
    if (r.died) {
      otherAlive = false;
    } else {
      other = r.body;
      if (r.ate) {
        pickups = pickups.filter(
          (p) => !(p.at.x === other![0]!.x && p.at.y === other![0]!.y),
        );
        if (r.ate === 'fruit') otherScore += 1;
        if (r.ate === 'star') otherScore += 3;
        if (r.ate === 'boost') otherScore += 2;
      }
    }
  }

  // Respawn pickups to keep three on the board.
  const taken = new Set<string>();
  for (const c of [...snake, ...(other ?? [])]) taken.add(`${c.x},${c.y}`);
  for (const p of pickups) taken.add(`${p.at.x},${p.at.y}`);
  while (pickups.length < 3) {
    const free: SnakeCell[] = [];
    for (let y = 0; y < SNAKE_SIZE; y++) {
      for (let x = 0; x < SNAKE_SIZE; x++) {
        if (!taken.has(`${x},${y}`)) free.push({ x, y });
      }
    }
    if (free.length === 0) break;
    const cell = free[Math.floor(rng() * free.length)]!;
    const roll = rng();
    const kind: PickupKind =
      roll < 0.6 ? 'fruit' : roll < 0.8 ? 'star' : roll < 0.9 ? 'shield' : 'boost';
    pickups.push({ at: cell, kind });
    taken.add(`${cell.x},${cell.y}`);
  }

  const over =
    (!alive && (!other || !otherAlive)) || (other !== null && !alive && !otherAlive);
  return {
    ...state,
    snake,
    other,
    pickups,
    score,
    otherScore,
    alive,
    otherAlive,
    shields,
    over: over || (!alive && other === null),
  };
}

/**
 * Bot direction: head for the nearest pickup, never reverse, never
 * step into a wall or a body when a safe alternative exists.
 */
export function snakeBotDir(state: SnakeState): SnakeDir {
  if (!state.other) return state.otherDir;
  const head = state.other[0]!;
  const order: SnakeDir[] = ['up', 'down', 'left', 'right'];
  const safe = order.filter((d) => {
    if (d === oppositeDir(state.otherDir)) return false;
    const step = DIRS[d];
    const nx = head.x + step.x;
    const ny = head.y + step.y;
    if (nx < 0 || ny < 0 || nx >= SNAKE_SIZE || ny >= SNAKE_SIZE) return false;
    const body = [...state.snake, ...state.other!.slice(0, -1)];
    return !body.some((c) => c.x === nx && c.y === ny);
  });
  if (safe.length === 0) return state.otherDir;
  let best = safe[0]!;
  let bestDist = Infinity;
  for (const d of safe) {
    const step = DIRS[d];
    const nx = head.x + step.x;
    const ny = head.y + step.y;
    for (const p of state.pickups) {
      const dist = Math.abs(p.at.x - nx) + Math.abs(p.at.y - ny);
      if (dist < bestDist) {
        bestDist = dist;
        best = d;
      }
    }
  }
  return best;
}

export function snakeProgress(target: number, score: number): number {
  if (target <= 0) return 1;
  return Math.min(1, score / target);
}
