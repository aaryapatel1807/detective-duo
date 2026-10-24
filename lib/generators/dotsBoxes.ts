/**
 * Dots and Boxes generator + bot (Duo Corner).
 *
 * Pure functions: a board is plain JSON, so the same board can live in
 * localStorage (solo resume) or a game_sessions row (together mode).
 * The bot uses a proper strategy: take free boxes, play safe edges that
 * hand nothing over, and when forced to give something away, count the
 * chains and give away the smallest one. The Easy bot sometimes plays
 * a random edge instead, and gives boxes away.
 *
 * Board coordinates: boxes are size x size. `h[r][c]` is the horizontal
 * edge above box row r (r in 0..size, c in 0..size-1); `v[r][c]` is the
 * vertical edge left of box column c (r in 0..size-1, c in 0..size).
 * Player 0 is "you" in solo; player 1 is the bot / partner.
 */

export type DotsBotSkill = 'easy' | 'fair' | 'sharp';

export interface DotsBoxesParams {
  size: number;
  botSkill: DotsBotSkill;
}

export function paramsForLevel(level: number): DotsBoxesParams {
  let size: number;
  if (level <= 5) size = 3;
  else if (level <= 10) size = 4;
  else if (level <= 20) size = 4;
  else if (level <= 30) size = 5;
  else if (level <= 45) size = 6;
  else if (level <= 60) size = 7;
  else if (level <= 80) size = 7;
  else size = 8;
  const botSkill: DotsBotSkill = level <= 10 ? 'easy' : level <= 30 ? 'fair' : 'sharp';
  return { size, botSkill };
}

export interface DotsEdge {
  kind: 'h' | 'v';
  r: number;
  c: number;
}

export interface DotsBoxesBoard {
  size: number;
  h: boolean[][];
  v: boolean[][];
  /** owner[r][c]: 0 | 1 | null (unclaimed). */
  owner: (0 | 1 | null)[][];
}

export function emptyBoard(size: number): DotsBoxesBoard {
  return {
    size,
    h: Array.from({ length: size + 1 }, () => Array(size).fill(false)),
    v: Array.from({ length: size }, () => Array(size + 1).fill(false)),
    owner: Array.from({ length: size }, () => Array(size).fill(null)),
  };
}

export function edgeKey(e: DotsEdge): string {
  return `${e.kind}:${e.r}:${e.c}`;
}

export function legalEdges(b: DotsBoxesBoard): DotsEdge[] {
  const out: DotsEdge[] = [];
  for (let r = 0; r <= b.size; r++) {
    for (let c = 0; c < b.size; c++) {
      if (!b.h[r][c]) out.push({ kind: 'h', r, c });
    }
  }
  for (let r = 0; r < b.size; r++) {
    for (let c = 0; c <= b.size; c++) {
      if (!b.v[r][c]) out.push({ kind: 'v', r, c });
    }
  }
  return out;
}

function sidesOf(b: DotsBoxesBoard, r: number, c: number): number {
  return (
    (b.h[r][c] ? 1 : 0) +
    (b.h[r + 1][c] ? 1 : 0) +
    (b.v[r][c] ? 1 : 0) +
    (b.v[r][c + 1] ? 1 : 0)
  );
}

/** Boxes touching an edge (at most two). */
function adjacentBoxes(b: DotsBoxesBoard, e: DotsEdge): [number, number][] {
  if (e.kind === 'h') {
    const out: [number, number][] = [];
    if (e.r > 0) out.push([e.r - 1, e.c]);
    if (e.r < b.size) out.push([e.r, e.c]);
    return out;
  }
  const out: [number, number][] = [];
  if (e.c > 0) out.push([e.r, e.c - 1]);
  if (e.c < b.size) out.push([e.r, e.c]);
  return out;
}

export interface ClaimResult {
  board: DotsBoxesBoard;
  completed: [number, number][];
  valid: boolean;
}

/** Claim an edge for `player`. Returns a new board; invalid moves are refused. */
export function claimEdge(
  b: DotsBoxesBoard,
  player: 0 | 1,
  e: DotsEdge,
): ClaimResult {
  const taken = e.kind === 'h' ? b.h[e.r]?.[e.c] : b.v[e.r]?.[e.c];
  if (taken) return { board: b, completed: [], valid: false };
  const h = b.h.map((row) => [...row]);
  const v = b.v.map((row) => [...row]);
  const owner = b.owner.map((row) => [...row]);
  if (e.kind === 'h') h[e.r][e.c] = true;
  else v[e.r][e.c] = true;
  const next: DotsBoxesBoard = { size: b.size, h, v, owner };
  const completed: [number, number][] = [];
  for (const [r, c] of adjacentBoxes(next, e)) {
    if (next.owner[r][c] === null && sidesOf(next, r, c) === 4) {
      next.owner[r][c] = player;
      completed.push([r, c]);
    }
  }
  return { board: next, completed, valid: true };
}

export function score(b: DotsBoxesBoard): [number, number] {
  let a = 0;
  let c = 0;
  for (const row of b.owner) {
    for (const o of row) {
      if (o === 0) a++;
      else if (o === 1) c++;
    }
  }
  return [a, c];
}

export function isFull(b: DotsBoxesBoard): boolean {
  return legalEdges(b).length === 0;
}

/**
 * Chains: connected runs of boxes with exactly 3 sides, linked by shared
 * edges. A chain of length n falls in one sweep once opened, so the bot
 * counts chains before giving one away. Returns chain sizes, largest first.
 */
export function chainSizes(b: DotsBoxesBoard): number[] {
  const seen = new Set<string>();
  const sizes: number[] = [];
  const key = (r: number, c: number) => `${r},${c}`;
  for (let r = 0; r < b.size; r++) {
    for (let c = 0; c < b.size; c++) {
      if (b.owner[r][c] !== null || sidesOf(b, r, c) !== 3 || seen.has(key(r, c))) {
        continue;
      }
      let n = 0;
      const stack: [number, number][] = [[r, c]];
      seen.add(key(r, c));
      while (stack.length) {
        const [cr, cc] = stack.pop()!;
        n++;
        const neighbours: [number, number][] = [
          [cr - 1, cc],
          [cr + 1, cc],
          [cr, cc - 1],
          [cr, cc + 1],
        ];
        for (const [nr, nc] of neighbours) {
          if (
            nr < 0 ||
            nc < 0 ||
            nr >= b.size ||
            nc >= b.size ||
            seen.has(key(nr, nc)) ||
            b.owner[nr][nc] !== null ||
            sidesOf(b, nr, nc) !== 3
          ) {
            continue;
          }
          seen.add(key(nr, nc));
          stack.push([nr, nc]);
        }
      }
      sizes.push(n);
    }
  }
  return sizes.sort((a, z) => z - a);
}

/** Largest chain the next player could sweep from this board (0 = none). */
function biggestChain(b: DotsBoxesBoard): number {
  const sizes = chainSizes(b);
  return sizes.length ? sizes[0] : 0;
}

/**
 * Bot move. `player` is the bot's side. Seeded RNG drives tie-breaks and
 * Easy blunders, so tests can replay exact games.
 */
export function chooseBotMove(
  b: DotsBoxesBoard,
  player: 0 | 1,
  skill: DotsBotSkill,
  rng: () => number,
): DotsEdge | null {
  const legal = legalEdges(b);
  if (!legal.length) return null;
  const shuffled = [...legal];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  // Easy bot sometimes just plays any edge, boxes be damned.
  if (skill === 'easy' && rng() < 0.25) {
    return shuffled[0];
  }
  // 1. Take free boxes. Sharp bots weigh the chain they hand over.
  let best: DotsEdge | null = null;
  let bestScore = -Infinity;
  for (const e of shuffled) {
    const res = claimEdge(b, player, e);
    if (!res.valid || res.completed.length === 0) continue;
    const scoreValue =
      skill === 'sharp'
        ? res.completed.length * 10 - biggestChain(res.board) * 2
        : res.completed.length;
    if (scoreValue > bestScore) {
      bestScore = scoreValue;
      best = e;
    }
  }
  if (best) return best;
  // 2. Safe edges: neither neighbouring box becomes 3-sided.
  for (const e of shuffled) {
    const res = claimEdge(b, player, e);
    if (!res.valid) continue;
    const givesAway = adjacentBoxes(res.board, e).some(
      ([r, c]) => res.board.owner[r][c] === null && sidesOf(res.board, r, c) === 3,
    );
    if (!givesAway) return e;
  }
  // 3. Forced to give away: count the chains, open the smallest one.
  let give: DotsEdge | null = null;
  let giveChain = Infinity;
  for (const e of shuffled) {
    const res = claimEdge(b, player, e);
    if (!res.valid) continue;
    const chain = biggestChain(res.board);
    if (chain < giveChain) {
      giveChain = chain;
      give = e;
    }
  }
  return give ?? shuffled[0];
}

/** A good move to suggest as a free hint (same strategy, no blunders). */
export function hintMove(b: DotsBoxesBoard, player: 0 | 1, rng: () => number): DotsEdge | null {
  return chooseBotMove(b, player, 'sharp', rng);
}
