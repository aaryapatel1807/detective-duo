/**
 * Lantern and Map maze generator (Duo Corner, co-op).
 *
 * A dark maze: the walker sees only their own tile and the passages
 * leading out of it. The map-reader sees the whole maze but never the
 * walker's position — only what the walker describes. Higher levels add
 * locked doors (a key, placed somewhere reachable without the door, opens
 * one), trapdoors (step on one and you are back at the start) and size.
 *
 * Generation is seeded and the maze is always solvable: a BFS over
 * (cell, keys-held) states proves the exit is reachable before the maze
 * is returned, and door keys are always placed on the reachable side of
 * their door.
 */

import { rngFromSeed, shuffle } from './rng';

export type Dir = 'up' | 'down' | 'left' | 'right';
export const DIRS: Dir[] = ['up', 'down', 'left', 'right'];
export const DIR_DELTA: Record<Dir, [number, number]> = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
};

export interface LanternParams {
  w: number;
  h: number;
  doors: number;
  traps: number;
}

export function paramsForLevel(level: number): LanternParams {
  if (level <= 10) return { w: 6, h: 6, doors: 0, traps: 0 };
  if (level <= 30) return { w: 8, h: 8, doors: 1, traps: 1 };
  if (level <= 60) return { w: 10, h: 10, doors: 2, traps: 2 };
  const extra = Math.min(2, Math.floor((level - 61) / 20));
  return { w: level >= 101 ? 14 : 12, h: level >= 101 ? 14 : 12, doors: 3 + extra, traps: 3 + extra };
}

export interface LanternMaze {
  seed: string;
  level: number;
  w: number;
  h: number;
  /** hWalls[y][x]: wall above cell (x, y); y in 0..h. */
  hWalls: boolean[][];
  /** vWalls[y][x]: wall left of cell (x, y); x in 0..w. */
  vWalls: boolean[][];
  start: [number, number];
  exit: [number, number];
  /** Door wall keys, e.g. "v:3,4". Door i is opened by key i. */
  doors: string[];
  /** "x,y" -> door index whose key lies on that cell. */
  keyCells: Record<string, number>;
  /** Trapdoor cells: stepping on one returns the walker to the start. */
  traps: string[];
}

const cellKey = (x: number, y: number) => `${x},${y}`;

function wallKeyBetween(a: [number, number], b: [number, number]): string {
  const [x1, y1] = a;
  const [x2, y2] = b;
  if (x2 === x1 + 1) return `v:${y1},${x1 + 1}`;
  if (x2 === x1 - 1) return `v:${y1},${x1}`;
  if (y2 === y1 + 1) return `h:${y1 + 1},${x1}`;
  return `h:${y1},${x1}`;
}

function wallPresent(m: LanternMaze, key: string): boolean {
  const [kind, rest] = key.split(':');
  const [a, b] = rest.split(',').map(Number);
  if (kind === 'v') return m.vWalls[a]?.[b] ?? true;
  return m.hWalls[a]?.[b] ?? true;
}

function neighbours(m: LanternMaze, x: number, y: number): [number, number][] {
  const out: [number, number][] = [];
  for (const d of DIRS) {
    const [dx, dy] = DIR_DELTA[d];
    const nx = x + dx;
    const ny = y + dy;
    if (nx >= 0 && ny >= 0 && nx < m.w && ny < m.h) out.push([nx, ny]);
  }
  return out;
}

/** BFS path from start to exit ignoring doors (plain maze path). */
function bfsPath(m: LanternMaze): [number, number][] | null {
  const prev = new Map<string, string | null>();
  const q: [number, number][] = [m.start];
  prev.set(cellKey(...m.start), null);
  while (q.length) {
    const cur = q.shift()!;
    if (cur[0] === m.exit[0] && cur[1] === m.exit[1]) {
      const path: [number, number][] = [];
      let k: string | null = cellKey(...cur);
      while (k) {
        const [x, y] = k.split(',').map(Number);
        path.unshift([x, y]);
        k = prev.get(k) ?? null;
      }
      return path;
    }
    for (const nb of neighbours(m, cur[0], cur[1])) {
      const wk = wallKeyBetween(cur, nb);
      if (wallPresent(m, wk)) continue;
      const nk = cellKey(...nb);
      if (!prev.has(nk)) {
        prev.set(nk, cellKey(...cur));
        q.push(nb);
      }
    }
  }
  return null;
}

/** Cells reachable from the start without crossing any door wall. */
function reachableWithoutDoors(m: LanternMaze): Set<string> {
  const seen = new Set<string>([cellKey(...m.start)]);
  const q: [number, number][] = [m.start];
  while (q.length) {
    const cur = q.shift()!;
    for (const nb of neighbours(m, cur[0], cur[1])) {
      const wk = wallKeyBetween(cur, nb);
      // Any wall blocks: plain walls, and doors too (we may not have the key yet).
      if (wallPresent(m, wk)) continue;
      const nk = cellKey(...nb);
      if (!seen.has(nk)) {
        seen.add(nk);
        q.push(nb);
      }
    }
  }
  return seen;
}

/**
 * Solvability: BFS over (cell, keys-held bitmask). A door wall is
 * passable only with its key; keys are picked up by visiting their cell.
 */
export function isSolvable(m: LanternMaze): boolean {
  const doorIndex = new Map<string, number>(m.doors.map((d, i) => [d, i]));
  const seen = new Set<string>();
  const startKey = `${cellKey(...m.start)}|0`;
  seen.add(startKey);
  const q: { pos: [number, number]; keys: number }[] = [{ pos: m.start, keys: 0 }];
  while (q.length) {
    const { pos, keys } = q.shift()!;
    if (pos[0] === m.exit[0] && pos[1] === m.exit[1]) return true;
    for (const nb of neighbours(m, pos[0], pos[1])) {
      const wk = wallKeyBetween(pos, nb);
      let nk = keys;
      const keyHere = m.keyCells[cellKey(...nb)];
      if (keyHere !== undefined) nk = keys | (1 << keyHere);
      if (wallPresent(m, wk)) {
        const di = doorIndex.get(wk);
        if (di === undefined) continue;
        if ((nk & (1 << di)) === 0) continue;
      }
      const tag = `${cellKey(...nb)}|${nk}`;
      if (!seen.has(tag)) {
        seen.add(tag);
        q.push({ pos: nb, keys: nk });
      }
    }
  }
  return false;
}

function carveMaze(w: number, h: number, rng: () => number): { hWalls: boolean[][]; vWalls: boolean[][] } {
  const hWalls = Array.from({ length: h + 1 }, () => Array(w).fill(true));
  const vWalls = Array.from({ length: h }, () => Array(w + 1).fill(true));
  const seen = new Set<string>(['0,0']);
  const stack: [number, number][] = [[0, 0]];
  while (stack.length) {
    const [x, y] = stack[stack.length - 1];
    const options: [number, number, Dir][] = [];
    for (const d of DIRS) {
      const [dx, dy] = DIR_DELTA[d];
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < w && ny < h && !seen.has(`${nx},${ny}`)) {
        options.push([nx, ny, d]);
      }
    }
    if (!options.length) {
      stack.pop();
      continue;
    }
    const [nx, ny, d] = options[Math.floor(rng() * options.length)];
    if (d === 'right') vWalls[y][x + 1] = false;
    if (d === 'left') vWalls[y][x] = false;
    if (d === 'down') hWalls[y + 1][x] = false;
    if (d === 'up') hWalls[y][x] = false;
    seen.add(`${nx},${ny}`);
    stack.push([nx, ny]);
  }
  return { hWalls, vWalls };
}

function tryGenerate(seed: string, level: number, attempt: number): LanternMaze | null {
  const p = paramsForLevel(level);
  const rng = rngFromSeed(`${seed}#${attempt}`);
  const { hWalls, vWalls } = carveMaze(p.w, p.h, rng);
  const m: LanternMaze = {
    seed,
    level,
    w: p.w,
    h: p.h,
    hWalls,
    vWalls,
    start: [0, 0],
    exit: [p.w - 1, p.h - 1],
    doors: [],
    keyCells: {},
    traps: [],
  };
  const path = bfsPath(m);
  if (!path) return null;
  // Doors: walls crossed by the solution path, away from the very ends.
  const crossed: string[] = [];
  for (let i = 1; i < path.length - 1; i++) {
    crossed.push(wallKeyBetween(path[i - 1], path[i]));
  }
  const doorWalls = shuffle(crossed, rng).slice(0, p.doors);
  m.doors = doorWalls;
  // Close those passages: a door is a wall that only its key opens.
  // (The path crossed open passages; closing them is what makes the
  // door matter — without its key, the exit side is unreachable.)
  for (const dw of doorWalls) {
    const [kind, rest] = dw.split(':');
    const [a, b] = rest.split(',').map(Number);
    if (kind === 'v') m.vWalls[a][b] = true;
    else m.hWalls[a][b] = true;
  }
  // Keys: reachable without crossing any door, not start/exit.
  const reach = reachableWithoutDoors(m);
  const spots = shuffle(
    [...reach].filter((k) => k !== cellKey(...m.start) && k !== cellKey(...m.exit)),
    rng,
  );
  if (spots.length < doorWalls.length) return null;
  doorWalls.forEach((_, i) => {
    m.keyCells[spots[i]] = i;
  });
  // Traps: any cell except start, exit and key cells.
  const used = new Set([...Object.keys(m.keyCells), cellKey(...m.start), cellKey(...m.exit)]);
  const trapSpots = shuffle(
    Array.from({ length: p.w * p.h }, (_, i) => cellKey(i % p.w, Math.floor(i / p.w))).filter(
      (k) => !used.has(k),
    ),
    rng,
  );
  m.traps = trapSpots.slice(0, p.traps);
  return isSolvable(m) ? m : null;
}

export function generateMaze(seed: string, level: number): LanternMaze {
  for (let attempt = 0; attempt < 40; attempt++) {
    const m = tryGenerate(seed, level, attempt);
    if (m) return m;
  }
  // Last resort: a doorless maze is always solvable.
  const p = paramsForLevel(level);
  const rng = rngFromSeed(`${seed}#plain`);
  const { hWalls, vWalls } = carveMaze(p.w, p.h, rng);
  return {
    seed,
    level,
    w: p.w,
    h: p.h,
    hWalls,
    vWalls,
    start: [0, 0],
    exit: [p.w - 1, p.h - 1],
    doors: [],
    keyCells: {},
    traps: [],
  };
}

export interface StepInfo {
  ok: boolean;
  blocked: 'wall' | 'locked-door' | 'edge' | null;
  pickedKey: number | null;
  hitTrap: boolean;
  reachedExit: boolean;
}

/** Attempt a step from `pos` in `dir` with the keys held. Pure. */
export function tryStep(
  m: LanternMaze,
  pos: [number, number],
  dir: Dir,
  keysHeld: number[],
): { pos: [number, number]; info: StepInfo } {
  const [dx, dy] = DIR_DELTA[dir];
  const [x, y] = pos;
  const nx = x + dx;
  const ny = y + dy;
  const base: StepInfo = {
    ok: false,
    blocked: null,
    pickedKey: null,
    hitTrap: false,
    reachedExit: false,
  };
  if (nx < 0 || ny < 0 || nx >= m.w || ny >= m.h) {
    return { pos, info: { ...base, blocked: 'edge' } };
  }
  const wk = wallKeyBetween(pos, [nx, ny]);
  if (wallPresent(m, wk)) {
    const di = m.doors.indexOf(wk);
    if (di === -1) return { pos, info: { ...base, blocked: 'wall' } };
    if (!keysHeld.includes(di)) return { pos, info: { ...base, blocked: 'locked-door' } };
  }
  const keyHere = m.keyCells[cellKey(nx, ny)];
  const pickedKey = keyHere !== undefined && !keysHeld.includes(keyHere) ? keyHere : null;
  const hitTrap = m.traps.includes(cellKey(nx, ny));
  const dest: [number, number] = hitTrap ? m.start : [nx, ny];
  return {
    pos: dest,
    info: {
      ok: true,
      blocked: null,
      pickedKey,
      hitTrap,
      reachedExit: !hitTrap && nx === m.exit[0] && ny === m.exit[1],
    },
  };
}

/** What the walker can see: their tile plus passages out of it (locked doors hide what is behind them). */
export function visibleCells(
  m: LanternMaze,
  pos: [number, number],
  keysHeld: number[],
): [number, number][] {
  const out: [number, number][] = [pos];
  for (const nb of neighbours(m, pos[0], pos[1])) {
    const wk = wallKeyBetween(pos, nb);
    if (!wallPresent(m, wk)) {
      out.push(nb);
      continue;
    }
    const di = m.doors.indexOf(wk);
    if (di !== -1 && keysHeld.includes(di)) out.push(nb);
  }
  return out;
}

const VAGUE: Record<Dir, string[]> = {
  up: ['A draught comes from above.', 'Something feels higher up.', 'The air moves toward the top of the dark.'],
  down: ['It feels warmer below you.', 'A draught pulls downward.', 'Try the way that sinks.'],
  left: ['A draught comes from your left.', 'Something glimmers to the left.', 'The left side feels more open.'],
  right: ['A draught comes from your right.', 'Something glimmers to the right.', 'The right side feels more open.'],
};

/**
 * The bot guide's next step: the true shortest-path step, phrased vaguely.
 * Always truthful about direction — the vagueness is the puzzle, not a lie.
 */
export function vagueDirection(
  m: LanternMaze,
  pos: [number, number],
  keysHeld: number[],
  rng: () => number,
): { dir: Dir; text: string } | null {
  // BFS over (cell, keys) to the exit; first step of the shortest route.
  const doorIndex = new Map<string, number>(m.doors.map((d, i) => [d, i]));
  const startKeys = keysHeld.reduce((acc, k) => acc | (1 << k), 0);
  const prev = new Map<string, string | null>();
  const q: { pos: [number, number]; keys: number }[] = [{ pos, keys: startKeys }];
  prev.set(`${cellKey(...pos)}|${startKeys}`, null);
  let found: { pos: [number, number]; keys: number } | null = null;
  while (q.length) {
    const cur = q.shift()!;
    if (cur.pos[0] === m.exit[0] && cur.pos[1] === m.exit[1]) {
      found = cur;
      break;
    }
    for (const nb of neighbours(m, cur.pos[0], cur.pos[1])) {
      const wk = wallKeyBetween(cur.pos, nb);
      let nk = cur.keys;
      const keyHere = m.keyCells[cellKey(...nb)];
      if (keyHere !== undefined) nk = cur.keys | (1 << keyHere);
      if (wallPresent(m, wk)) {
        const di = doorIndex.get(wk);
        if (di === undefined) continue;
        if ((nk & (1 << di)) === 0) continue;
      }
      const tag = `${cellKey(...nb)}|${nk}`;
      if (!prev.has(tag)) {
        prev.set(tag, `${cellKey(...cur.pos)}|${cur.keys}`);
        q.push({ pos: nb, keys: nk });
      }
    }
  }
  if (!found) return null;
  // Walk back to the first step from the start state.
  let tag = `${cellKey(...found.pos)}|${found.keys}`;
  let stepTag: string | null = null;
  while (tag) {
    const p = prev.get(tag);
    if (!p) break;
    stepTag = tag;
    if (p === `${cellKey(...pos)}|${startKeys}`) break;
    tag = p;
  }
  if (!stepTag) return null;
  const [sx, sy] = stepTag.split('|')[0].split(',').map(Number);
  const [x, y] = pos;
  let dir: Dir = 'up';
  if (sx === x + 1) dir = 'right';
  else if (sx === x - 1) dir = 'left';
  else if (sy === y + 1) dir = 'down';
  else dir = 'up';
  const lines = VAGUE[dir];
  return { dir, text: lines[Math.floor(rng() * lines.length)] };
}

/** Plain-language description of the walker's view, for the "tell my partner" button. */
export function describeView(
  m: LanternMaze,
  pos: [number, number],
  keysHeld: number[],
): string {
  const [x, y] = pos;
  const parts: string[] = [];
  for (const d of DIRS) {
    const [dx, dy] = DIR_DELTA[d];
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= m.w || ny >= m.h) continue;
    const wk = wallKeyBetween(pos, [nx, ny]);
    if (!wallPresent(m, wk)) {
      parts.push(`open to the ${d}`);
    } else {
      const di = m.doors.indexOf(wk);
      if (di !== -1) {
        parts.push(keysHeld.includes(di) ? `an unlocked door to the ${d}` : `a locked door to the ${d}`);
      }
    }
  }
  const keyHere = m.keyCells[cellKey(x, y)];
  if (keyHere !== undefined && !keysHeld.includes(keyHere)) parts.push('a key glinting here');
  if (m.traps.includes(cellKey(x, y))) parts.push('this tile feels wrong underfoot');
  if (!parts.length) return 'I am boxed in on all sides.';
  return `From where I stand: ${parts.join(', ')}.`;
}
