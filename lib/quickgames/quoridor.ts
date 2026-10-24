/**
 * Quoridor (Phase 6 quick game): race a pawn across a 9x9 board.
 * Each turn: step one square orthogonally (with the usual jump over an
 * adjacent opponent), or drop a two-square fence in the rival's way.
 * A fence may slow the route, never seal it — placement is rejected
 * when either player would lose every path to their goal row.
 *
 * Coordinates: squares (x, y), 0..8. A fence (x, y, dir) sits on the
 * 8x8 intersection grid: 'h' blocks the two vertical edges between
 * rows y and y+1 at columns x and x+1; 'v' blocks the two horizontal
 * edges between columns x and x+1 at rows y and y+1.
 */
import { rngFromSeed } from '../generators/rng';

export const QUORIDOR_SIZE = 9;

export interface QuoridorFence {
  x: number;
  y: number;
  dir: 'h' | 'v';
}

export interface QuoridorState {
  pawns: [{ x: number; y: number }, { x: number; y: number }];
  fences: QuoridorFence[];
  fencesLeft: [number, number];
  turn: 0 | 1;
}

export type QuoridorMove =
  | { kind: 'step'; to: { x: number; y: number } }
  | { kind: 'fence'; fence: QuoridorFence };

export function quoridorFencesForLevel(level: number): number {
  if (level <= 10) return 10;
  if (level <= 30) return 10;
  if (level <= 60) return 8;
  return 6;
}

export function initialQuoridor(level: number): QuoridorState {
  const fences = quoridorFencesForLevel(level);
  return {
    pawns: [
      { x: 4, y: 8 },
      { x: 4, y: 0 },
    ],
    fences: [],
    fencesLeft: [fences, fences],
    turn: 0,
  };
}

function goalRow(player: 0 | 1): number {
  return player === 0 ? 0 : 8;
}

function blockedBetween(
  fences: QuoridorFence[],
  ax: number,
  ay: number,
  bx: number,
  by: number,
): boolean {
  // Vertical step between (x,y) and (x,y+1): blocked by an 'h' fence
  // whose span covers column x at row-boundary y.
  if (ax === bx && Math.abs(ay - by) === 1) {
    const y = Math.min(ay, by);
    return fences.some(
      (f) => f.dir === 'h' && f.y === y && (f.x === ax || f.x === ax - 1),
    );
  }
  // Horizontal step between (x,y) and (x+1,y): blocked by a 'v' fence
  // whose span covers row y at column-boundary x.
  if (ay === by && Math.abs(ax - bx) === 1) {
    const x = Math.min(ax, bx);
    return fences.some(
      (f) => f.dir === 'v' && f.x === x && (f.y === ay || f.y === ay - 1),
    );
  }
  return true;
}

function inBoard(x: number, y: number): boolean {
  return x >= 0 && x < QUORIDOR_SIZE && y >= 0 && y < QUORIDOR_SIZE;
}

/** Shortest path length from a square to a goal row (fences only, no pawn). */
export function quoridorDistance(
  fences: QuoridorFence[],
  from: { x: number; y: number },
  goal: number,
): number {
  const seen = new Set<string>([`${from.x},${from.y}`]);
  const queue: [{ x: number; y: number }, number][] = [[from, 0]];
  while (queue.length > 0) {
    const [cur, d] = queue.shift()!;
    if (cur.y === goal) return d;
    for (const [dx, dy] of [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0],
    ]) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      if (!inBoard(nx, ny)) continue;
      if (blockedBetween(fences, cur.x, cur.y, nx, ny)) continue;
      const key = `${nx},${ny}`;
      if (seen.has(key)) continue;
      seen.add(key);
      queue.push([{ x: nx, y: ny }, d + 1]);
    }
  }
  return Infinity;
}

function fenceConflicts(a: QuoridorFence, b: QuoridorFence): boolean {
  if (a.dir === 'h' && b.dir === 'h') {
    return a.y === b.y && Math.abs(a.x - b.x) <= 1;
  }
  if (a.dir === 'v' && b.dir === 'v') {
    return a.x === b.x && Math.abs(a.y - b.y) <= 1;
  }
  // Crossing: an 'h' and a 'v' fence share the same intersection.
  return a.x === b.x && a.y === b.y;
}

export function isFenceLegal(state: QuoridorState, fence: QuoridorFence): boolean {
  const player = state.turn;
  if (state.fencesLeft[player] <= 0) return false;
  if (fence.x < 0 || fence.x > 7 || fence.y < 0 || fence.y > 7) return false;
  if (state.fences.some((f) => fenceConflicts(f, fence))) return false;
  const next = [...state.fences, fence];
  // Never seal either player's route.
  for (const p of [0, 1] as const) {
    if (quoridorDistance(next, state.pawns[p]!, goalRow(p)) === Infinity) return false;
  }
  return true;
}

/** Pawn steps for `player`, including jumps over the opponent. */
export function pawnSteps(state: QuoridorState, player: 0 | 1): { x: number; y: number }[] {
  const me = state.pawns[player]!;
  const foe = state.pawns[(1 - player) as 0 | 1]!;
  const out: { x: number; y: number }[] = [];
  const dirs = [
    [0, 1],
    [0, -1],
    [1, 0],
    [-1, 0],
  ];
  for (const [dx, dy] of dirs) {
    const nx = me.x + dx;
    const ny = me.y + dy;
    if (!inBoard(nx, ny)) continue;
    if (blockedBetween(state.fences, me.x, me.y, nx, ny)) continue;
    if (nx === foe.x && ny === foe.y) {
      // Jump straight over, or diagonally if blocked behind.
      const jx = foe.x + dx;
      const jy = foe.y + dy;
      if (inBoard(jx, jy) && !blockedBetween(state.fences, foe.x, foe.y, jx, jy)) {
        out.push({ x: jx, y: jy });
      } else {
        const sideDirs =
          dx === 0
            ? [
                [1, 0],
                [-1, 0],
              ]
            : [
                [0, 1],
                [0, -1],
              ];
        for (const [sx, sy] of sideDirs) {
          const sx2 = foe.x + sx;
          const sy2 = foe.y + sy;
          if (inBoard(sx2, sy2) && !blockedBetween(state.fences, foe.x, foe.y, sx2, sy2)) {
            out.push({ x: sx2, y: sy2 });
          }
        }
      }
    } else {
      out.push({ x: nx, y: ny });
    }
  }
  return out;
}

export function legalMoves(state: QuoridorState): QuoridorMove[] {
  const player = state.turn;
  const moves: QuoridorMove[] = pawnSteps(state, player).map((to) => ({
    kind: 'step' as const,
    to,
  }));
  if (state.fencesLeft[player] > 0) {
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        for (const dir of ['h', 'v'] as const) {
          const fence = { x, y, dir };
          if (isFenceLegal(state, fence)) moves.push({ kind: 'fence', fence });
        }
      }
    }
  }
  return moves;
}

export function applyQuoridorMove(state: QuoridorState, move: QuoridorMove): QuoridorState {
  const player = state.turn;
  if (move.kind === 'step') {
    // Only legal steps land in state (room clients cannot forge moves).
    const ok = pawnSteps(state, player).some(
      (s) => s.x === move.to.x && s.y === move.to.y,
    );
    if (!ok) return state;
    const pawns = [...state.pawns] as QuoridorState['pawns'];
    pawns[player] = move.to;
    return { ...state, pawns, turn: (1 - player) as 0 | 1 };
  }
  if (!isFenceLegal(state, move.fence)) return state;
  const fencesLeft = [...state.fencesLeft] as [number, number];
  fencesLeft[player] -= 1;
  return {
    ...state,
    fences: [...state.fences, move.fence],
    fencesLeft,
    turn: (1 - player) as 0 | 1,
  };
}

export function quoridorWinner(state: QuoridorState): 0 | 1 | null {
  if (state.pawns[0]!.y === 0) return 0;
  if (state.pawns[1]!.y === 8) return 1;
  return null;
}

/**
 * Bot: win if it can, else place the fence that most lengthens the
 * rival's shortest path (when that gains at least 2 steps and a fence
 * is spare), else walk its shortest path. Low levels sometimes wander.
 */
export function quoridorBotMove(state: QuoridorState, level: number, seed: string): QuoridorMove {
  const player = state.turn;
  const rng = rngFromSeed(`${seed}|bot|${state.fences.length}`);
  const wanderP = level <= 10 ? 0.4 : level <= 30 ? 0.2 : level <= 60 ? 0.05 : 0;
  const steps = pawnSteps(state, player);
  const winning = steps.find((s) => s.y === goalRow(player));
  if (winning && rng() > wanderP) return { kind: 'step', to: winning };
  if (rng() < wanderP && steps.length > 0) {
    return { kind: 'step', to: steps[Math.floor(rng() * steps.length)]! };
  }
  const foe = (1 - player) as 0 | 1;
  const foeBefore = quoridorDistance(state.fences, state.pawns[foe]!, goalRow(foe));
  if (state.fencesLeft[player] > 0) {
    let best: QuoridorFence | null = null;
    let bestGain = 0;
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        for (const dir of ['h', 'v'] as const) {
          const fence = { x, y, dir };
          if (!isFenceLegal(state, fence)) continue;
          const d = quoridorDistance([...state.fences, fence], state.pawns[foe]!, goalRow(foe));
          if (d !== Infinity && d - foeBefore > bestGain) {
            bestGain = d - foeBefore;
            best = fence;
          }
        }
      }
    }
    if (best && bestGain >= 2) return { kind: 'fence', fence: best };
  }
  // Walk the shortest path: pick the step minimizing distance to goal.
  let bestStep = steps[0]!;
  let bestDist = Infinity;
  for (const s of steps) {
    const d = quoridorDistance(state.fences, s, goalRow(player));
    if (d < bestDist) {
      bestDist = d;
      bestStep = s;
    }
  }
  return { kind: 'step', to: bestStep };
}
