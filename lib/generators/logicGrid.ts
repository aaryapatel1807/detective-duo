/**
 * Logic Grids generator.
 *
 * Pure functions: a seed string goes in, a puzzle comes out. The same seed
 * always produces the same puzzle (seeded PRNG), which is what versus mode
 * and the uniqueness tests rely on.
 *
 * A puzzle is a set of categories (the first is always "Friend", whose item
 * order is the seat order at the café table). The solution assigns every
 * category's items to seats. Clues are added until a solver proves exactly
 * one assignment fits, then redundant clues are pruned away.
 */

// ---------------------------------------------------------------- PRNG ----

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

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

// ------------------------------------------------------------- content ----

export interface LGCategory {
  name: string;
  items: string[];
}

/** Item pools. Every item name is unique across all categories. */
const FRIENDS: LGCategory = {
  name: 'Friend',
  items: ['Mabel', 'Rupert', 'Priya', 'Tomás', 'Edith', 'Hugo'],
};

const OTHER_CATEGORIES: LGCategory[] = [
  {
    name: 'Drink',
    items: ['masala chai', 'filter coffee', 'hot cocoa', 'lemonade', 'mint tea', 'ginger ale'],
  },
  {
    name: 'Pet',
    items: ['a tabby cat', 'a corgi', 'a parrot', 'a goldfish', 'a rabbit', 'a tortoise'],
  },
  {
    name: 'Coat colour',
    items: ['mustard', 'teal', 'burgundy', 'olive', 'plum', 'charcoal'],
  },
  {
    name: 'Snack',
    items: ['scones', 'pakoras', 'biscuits', 'fruit cake', 'roasted nuts', 'fudge'],
  },
  {
    name: 'Hobby',
    items: ['chess', 'knitting', 'stargazing', 'baking', 'sketching', 'gardening'],
  },
  {
    name: 'Book',
    items: ['a mystery novel', 'a poetry book', 'a cookbook', 'a travel guide', 'a comic', 'a history book'],
  },
];

// --------------------------------------------------------------- types ----

export type LGClueType = 'direct' | 'negative' | 'relative' | 'eitherOr';

export interface LGRef {
  cat: number;
  item: number;
}

export interface LGClue {
  id: number;
  type: LGClueType;
  text: string;
  a: LGRef;
  b: LGRef;
  /** eitherOr only: the second alternative partner for `a`. */
  c?: LGRef;
  /** relative only: seat(b) = seat(a) + dir. */
  dir?: 1 | -1;
}

export interface LogicGridPuzzle {
  seed: string;
  level: number;
  size: number;
  categories: LGCategory[];
  clues: LGClue[];
  /** solution[cat][seat] = item index of that category at that seat. */
  solution: number[][];
}

export interface LGTierParams {
  size: number;
  /** Relative weights when choosing the next clue to add. */
  weights: Record<LGClueType, number>;
  /** Cap on the share of direct clues in the final set (Expert twist). */
  maxDirectShare: number;
}

export function tierForLevel(level: number): LGTierParams {
  if (level <= 10) {
    return {
      size: 3,
      weights: { direct: 5, negative: 4, relative: 0, eitherOr: 0 },
      maxDirectShare: 0.75,
    };
  }
  if (level <= 30) {
    return {
      size: 4,
      weights: { direct: 4, negative: 4, relative: 2, eitherOr: 0 },
      maxDirectShare: 0.7,
    };
  }
  if (level <= 60) {
    return {
      size: 5,
      weights: { direct: 3, negative: 4, relative: 2, eitherOr: 2 },
      maxDirectShare: 0.55,
    };
  }
  // Expert: scale keeps tightening every 10 levels.
  const band = Math.floor((level - 61) / 10);
  return {
    size: 6,
    weights: { direct: 2, negative: 4, relative: 3, eitherOr: 3 },
    maxDirectShare: Math.max(0.25, 0.5 - band * 0.05),
  };
}

// -------------------------------------------------------------- solver ----

type Domains = Map<string, number>; // key "cat:item" -> seat bitmask

const refKey = (r: LGRef) => `${r.cat}:${r.item}`;

function cluePossible(clue: LGClue, dom: Domains): boolean {
  const da = dom.get(refKey(clue.a))!;
  const db = dom.get(refKey(clue.b))!;
  switch (clue.type) {
    case 'direct':
      return (da & db) !== 0;
    case 'negative': {
      // Impossible only if both are forced onto the same single seat.
      const both = da & db;
      return !(da === db && both !== 0 && (both & (both - 1)) === 0);
    }
    case 'relative': {
      const shifted = clue.dir === 1 ? da << 1 : da >> 1;
      return (shifted & db) !== 0;
    }
    case 'eitherOr': {
      const dc = dom.get(refKey(clue.c!))!;
      return (da & db) !== 0 || (da & dc) !== 0;
    }
  }
}

function clueHoldsOnAssignment(
  clue: LGClue,
  seatOf: (r: LGRef) => number,
): boolean {
  const pa = seatOf(clue.a);
  const pb = seatOf(clue.b);
  switch (clue.type) {
    case 'direct':
      return pa === pb;
    case 'negative':
      return pa !== pb;
    case 'relative':
      return pb === pa + clue.dir!;
    case 'eitherOr':
      return (pa === pb) !== (pa === seatOf(clue.c!));
  }
}

/**
 * Count solutions for a (partial) clue set, stopping at `limit`.
 * Returns the count and, when exactly one exists within the limit, it.
 */
export function countSolutions(
  size: number,
  categories: LGCategory[],
  clues: LGClue[],
  limit = 2,
): { count: number; solution: number[][] | null } {
  const n = size;
  const full = (1 << n) - 1;
  const dom: Domains = new Map();
  categories.forEach((cat, ci) => {
    cat.items.forEach((_, ii) => {
      // Category 0 is the seat order itself: friend i sits at seat i.
      // Fixing this breaks the seat-permutation symmetry so "unique"
      // means unique pairings, which is what the game checks.
      dom.set(`${ci}:${ii}`, ci === 0 ? 1 << ii : full);
    });
  });

  let count = 0;
  let nodes = 0;
  let overBudget = false;
  const NODE_BUDGET = 400_000;
  let found: number[][] | null = null;

  const seatOfFromDom = (domState: Domains) => (r: LGRef) => {
    const mask = domState.get(refKey(r))!;
    return 31 - Math.clz32(mask); // only valid for single-bit masks
  };

  function assign(domState: Domains, ref: LGRef, seat: number): Domains | null {
    const next: Domains = new Map(domState);
    const bit = 1 << seat;
    next.set(refKey(ref), bit);
    // All-different inside the category.
    for (let ii = 0; ii < n; ii++) {
      if (ii === ref.item) continue;
      const k = `${ref.cat}:${ii}`;
      const d = next.get(k)! & ~bit;
      if (d === 0) return null;
      next.set(k, d);
    }
    return next;
  }

  /**
   * Fixpoint propagation: all-different singletons, direct intersections,
   * relative shifts, negative exclusions. Returns null on contradiction.
   */
  function propagate(input: Domains): Domains | null {
    const dom: Domains = new Map(input);
    let changed = true;
    let rounds = 0;
    while (changed && rounds++ < 60) {
      changed = false;
      // Singleton seats are taken inside their category.
      for (const [k, mask] of dom) {
        if (mask === 0) return null;
        if ((mask & (mask - 1)) === 0) {
          const [ci] = k.split(':').map(Number);
          for (let ii = 0; ii < n; ii++) {
            const kk = `${ci}:${ii}`;
            if (kk === k) continue;
            const d = dom.get(kk)!;
            if (d & mask) {
              const nd = d & ~mask;
              if (nd === 0) return null;
              if (nd !== d) {
                dom.set(kk, nd);
                changed = true;
              }
            }
          }
        }
      }
      for (const clue of clues) {
        const ka = refKey(clue.a);
        const kb = refKey(clue.b);
        const da = dom.get(ka)!;
        const db = dom.get(kb)!;
        if (clue.type === 'direct') {
          const inter = da & db;
          if (inter === 0) return null;
          if (inter !== da) { dom.set(ka, inter); changed = true; }
          if (inter !== db) { dom.set(kb, inter); changed = true; }
        } else if (clue.type === 'relative') {
          const shifted = clue.dir === 1 ? da << 1 : da >> 1;
          const nb = db & shifted & full;
          if (nb === 0) return null;
          if (nb !== db) { dom.set(kb, nb); changed = true; }
          const back = clue.dir === 1 ? nb >> 1 : nb << 1;
          const na = da & back & full;
          if (na === 0) return null;
          if (na !== da) { dom.set(ka, na); changed = true; }
        } else if (clue.type === 'negative') {
          if ((da & (da - 1)) === 0 && (db & da)) {
            const nd = db & ~da;
            if (nd === 0) return null;
            if (nd !== db) { dom.set(kb, nd); changed = true; }
          }
          const daNow = dom.get(ka)!;
          if ((db & (db - 1)) === 0 && (daNow & db)) {
            const nd = daNow & ~db;
            if (nd === 0) return null;
            if (nd !== daNow) { dom.set(ka, nd); changed = true; }
          }
        } else if (clue.type === 'eitherOr') {
          const kc = refKey(clue.c!);
          const dc = dom.get(kc)!;
          const daNow = dom.get(ka)!;
          // If one pairing is impossible, `a` must take the other.
          if ((daNow & db) === 0) {
            const inter = daNow & dc;
            if (inter === 0) return null;
            if (inter !== daNow) { dom.set(ka, inter); changed = true; }
          } else if ((daNow & dc) === 0) {
            const inter = daNow & db;
            if (inter === 0) return null;
            if (inter !== daNow) { dom.set(ka, inter); changed = true; }
          }
        }
      }
    }
    return dom;
  }

  function dfs(domState: Domains): void {
    if (count >= limit || overBudget) return;
    if (++nodes > NODE_BUDGET) {
      overBudget = true;
      return;
    }
    const prop = propagate(domState);
    if (!prop) return;
    domState = prop;
    // Prune on clue possibility.
    for (const clue of clues) {
      if (!cluePossible(clue, domState)) return;
    }
    // Pick the undecided item with the smallest domain.
    let bestKey: string | null = null;
    let bestMask = 0;
    let bestSize = Infinity;
    for (const [k, mask] of domState) {
      const bits = popcount(mask);
      if (bits > 1 && bits < bestSize) {
        bestSize = bits;
        bestKey = k;
        bestMask = mask;
        if (bits === 2) break;
      }
    }
    if (bestKey === null) {
      // Complete assignment — verify exactly (eitherOr XOR, relative).
      const seatOf = seatOfFromDom(domState);
      for (const clue of clues) {
        if (!clueHoldsOnAssignment(clue, seatOf)) return;
      }
      count++;
      if (count === 1) {
        const sol: number[][] = categories.map(() => new Array(n).fill(0));
        categories.forEach((cat, ci) => {
          cat.items.forEach((_, ii) => {
            const seat = seatOf({ cat: ci, item: ii });
            sol[ci][seat] = ii;
          });
        });
        found = sol;
      }
      return;
    }
    const [cat, item] = bestKey.split(':').map(Number);
    for (let seat = 0; seat < n; seat++) {
      if (!(bestMask & (1 << seat))) continue;
      const next = assign(domState, { cat, item }, seat);
      if (next) dfs(next);
      if (count >= limit) return;
    }
  }

  dfs(dom);
  if (overBudget) return { count: -1, solution: null };
  return { count, solution: count === 1 ? found : null };
}

function popcount(x: number): number {
  let c = 0;
  while (x) {
    x &= x - 1;
    c++;
  }
  return c;
}

export function solvePuzzle(puzzle: LogicGridPuzzle): number[][] | null {
  const { solution } = countSolutions(puzzle.size, puzzle.categories, puzzle.clues, 2);
  return solution;
}

// ----------------------------------------------------------- generator ----

function describeRef(puzzle: { categories: LGCategory[] }, r: LGRef): string {
  return puzzle.categories[r.cat].items[r.item];
}

function clueText(
  categories: LGCategory[],
  clue: Omit<LGClue, 'id' | 'text'>,
): string {
  const A = categories[clue.a.cat].items[clue.a.item];
  const B = categories[clue.b.cat].items[clue.b.item];
  switch (clue.type) {
    case 'direct':
      return clue.a.cat === 0
        ? `${A} is paired with ${B}.`
        : `The friend with ${A} is paired with ${B}.`;
    case 'negative':
      return clue.a.cat === 0
        ? `${A} is not paired with ${B}.`
        : `The friend with ${A} is not paired with ${B}.`;
    case 'relative': {
      // `a` is always a Friend; b is an item of another category.
      return clue.dir === 1
        ? `${A} sits immediately to the left of the friend with ${B}.`
        : `${A} sits immediately to the right of the friend with ${B}.`;
    }
    case 'eitherOr': {
      const C = categories[clue.c!.cat].items[clue.c!.item];
      return clue.a.cat === 0
        ? `${A} is paired with ${B} or with ${C}.`
        : `The friend with ${A} is paired with ${B} or with ${C}.`;
    }
  }
}

interface Candidate extends Omit<LGClue, 'id' | 'text'> {}

function buildCandidates(
  categories: LGCategory[],
  solution: number[][],
  params: LGTierParams,
  rng: () => number,
): Candidate[] {
  const n = params.size;
  const seatOf = (r: LGRef) => solution[r.cat].indexOf(r.item);
  const out: Candidate[] = [];
  const cats = categories.map((_, i) => i);

  // Direct: every true cross-category pairing.
  for (let seat = 0; seat < n; seat++) {
    for (const ca of cats) {
      for (const cb of cats) {
        if (cb <= ca) continue;
        out.push({
          type: 'direct',
          a: { cat: ca, item: solution[ca][seat] },
          b: { cat: cb, item: solution[cb][seat] },
        });
      }
    }
  }
  // Negative: sampled false pairings.
  const negSeen = new Set<string>();
  let negCount = 0;
  for (let tries = 0; tries < 500 && negCount < n * 16; tries++) {
    const ca = pick(cats, rng);
    const cb = pick(cats, rng);
    if (ca === cb) continue;
    const ia = Math.floor(rng() * n);
    const ib = Math.floor(rng() * n);
    if (seatOf({ cat: ca, item: ia }) === seatOf({ cat: cb, item: ib })) continue;
    const key = `${ca}:${ia}|${cb}:${ib}`;
    if (negSeen.has(key)) continue;
    negSeen.add(key);
    negCount++;
    out.push({ type: 'negative', a: { cat: ca, item: ia }, b: { cat: cb, item: ib } });
  }
  // Relative: one side is always a Friend; seats are adjacent.
  for (let seat = 0; seat < n - 1; seat++) {
    const friendLeft = solution[0][seat];
    const friendRight = solution[0][seat + 1];
    for (const cb of cats) {
      if (cb === 0) continue;
      out.push({
        type: 'relative',
        a: { cat: 0, item: friendLeft },
        b: { cat: cb, item: solution[cb][seat + 1] },
        dir: 1,
      });
      out.push({
        type: 'relative',
        a: { cat: 0, item: friendRight },
        b: { cat: cb, item: solution[cb][seat] },
        dir: -1,
      });
    }
  }
  // Either/or: `a` pairs with its true partner b, or with a decoy c.
  for (let seat = 0; seat < n; seat++) {
    for (const ca of cats) {
      for (const cb of cats) {
        if (cb === ca) continue;
        const a = { cat: ca, item: solution[ca][seat] };
        const b = { cat: cb, item: solution[cb][seat] };
        for (let tries = 0; tries < 3; tries++) {
          const cc = pick(cats, rng);
          if (cc === ca || cc === cb) continue;
          const ic = Math.floor(rng() * n);
          if (seatOf({ cat: cc, item: ic }) === seat) continue;
          out.push({ type: 'eitherOr', a, b, c: { cat: cc, item: ic } });
        }
      }
    }
  }
  return out;
}

/** Deterministic per-level seed. Salt differs per account, stable for her. */
export function levelSeed(level: number, salt: string): string {
  return `lg|${salt}|${level}`;
}

export function generatePuzzle(seed: string, level: number): LogicGridPuzzle {
  const rng = mulberry32(hashSeed(seed));
  const params = tierForLevel(level);
  const n = params.size;

  // Categories: Friend first, then n-1 others, shuffled.
  const others = shuffle(OTHER_CATEGORIES, rng).slice(0, n - 1);
  const chosen = [FRIENDS, ...others];
  const categories: LGCategory[] = chosen.map((c) => ({
    name: c.name,
    items: shuffle(c.items.slice(0, n), rng),
  }));
  // Friend order is the seat order; keep friends in listed seat order.
  categories[0] = { name: FRIENDS.name, items: FRIENDS.items.slice(0, n) };

  // Random solution: category 0 is the identity, others are permutations.
  const solution: number[][] = [Array.from({ length: n }, (_, i) => i)];
  for (let c = 1; c < n; c++) {
    solution.push(shuffle(Array.from({ length: n }, (_, i) => i), rng));
  }

  const candidates = buildCandidates(categories, solution, params, rng);
  const byType: Record<LGClueType, Candidate[]> = {
    direct: shuffle(candidates.filter((c) => c.type === 'direct'), rng),
    negative: shuffle(candidates.filter((c) => c.type === 'negative'), rng),
    relative: shuffle(candidates.filter((c) => c.type === 'relative'), rng),
    eitherOr: shuffle(candidates.filter((c) => c.type === 'eitherOr'), rng),
  };
  // Direct candidates that pin a non-base category to the Friend at a seat
  // form a "star": together they determine the whole grid. We start from a
  // guaranteed-unique star and swap harder clues in, so every uniqueness
  // check runs against a rich clue set (fast) instead of a sparse one.
  const starKeys = new Set<string>();
  const star: Candidate[] = [];
  for (let seat = 0; seat < n - 1; seat++) {
    for (let c = 1; c < n; c++) {
      const cand: Candidate = {
        type: 'direct',
        a: { cat: 0, item: solution[0][seat] },
        b: { cat: c, item: solution[c][seat] },
      };
      star.push(cand);
      starKeys.add(`${cand.a.cat}:${cand.a.item}|${cand.b.cat}:${cand.b.item}`);
    }
  }
  byType.direct = byType.direct.filter(
    (c) => !starKeys.has(`${c.a.cat}:${c.a.item}|${c.b.cat}:${c.b.item}`),
  );

  let clues: Candidate[] = [...star];
  const clueSet = (list: Candidate[]) =>
    list.map((c, i) => ({ ...c, id: i, text: clueText(categories, c) })) as LGClue[];
  const isUnique = (list: Candidate[]) =>
    countSolutions(n, categories, clueSet(list), 2).count === 1;

  if (!isUnique(clues)) {
    throw new Error(`star clue set was not unique for seed ${seed}`);
  }

  const nonDirectWeights = (Object.keys(params.weights) as LGClueType[])
    .filter((t) => t !== 'direct')
    .map((t) => ({ t, w: params.weights[t] }))
    .filter((x) => x.w > 0);
  const totalNDWeight = nonDirectWeights.reduce((s, x) => s + x.w, 0);
  const directShare = (list: Candidate[]) =>
    list.filter((c) => c.type === 'direct').length / Math.max(1, list.length);

  // Swap phase: add a harder clue, then retire direct clues it makes
  // redundant, until the direct share is at or under the tier cap.
  let swaps = 0;
  const maxSwaps = 60 + n * 30;
  while (
    swaps++ < maxSwaps &&
    totalNDWeight > 0 &&
    directShare(clues) > params.maxDirectShare
  ) {
    let r = rng() * totalNDWeight;
    let type: LGClueType = nonDirectWeights[0].t;
    for (const x of nonDirectWeights) {
      r -= x.w;
      if (r <= 0) {
        type = x.t;
        break;
      }
    }
    if (!byType[type].length) break;
    const cand = byType[type].pop()!;
    clues.push(cand);
    // Try to retire up to two direct clues.
    let retired = 0;
    const directIdx = shuffle(
      clues.map((c, i) => (c.type === 'direct' ? i : -1)).filter((i) => i >= 0),
      rng,
    );
    for (const idx of directIdx) {
      if (retired >= 2) break;
      const trial = clues.filter((_, i) => i !== idx);
      if (isUnique(trial)) {
        clues = trial;
        retired++;
      }
    }
    if (retired === 0) {
      // The new clue earned nothing; keep it only occasionally for texture.
      if (rng() < 0.5) clues = clues.filter((c) => c !== cand);
    }
  }

  // Texture: a couple of extra weighted clues (any allowed type), then prune.
  const extra = Math.min(3, Math.floor(rng() * 4));
  for (let i = 0; i < extra; i++) {
    const pool = (Object.keys(byType) as LGClueType[]).filter(
      (t) => params.weights[t] > 0 && byType[t].length,
    );
    if (!pool.length) break;
    clues.push(byType[pick(pool, rng)].pop()!);
  }

  // Prune: drop any clue whose removal keeps the solution unique.
  const order = shuffle(clues.map((_, i) => i), rng);
  for (const idx of order) {
    const trial = clues.filter((_, i) => i !== idx);
    if (isUnique(trial)) {
      clues = trial;
    }
  }

  const solved = countSolutions(n, categories, clueSet(clues), 2);
  if (solved.count !== 1 || !solved.solution) {
    throw new Error(`generator failed to reach a unique solution for seed ${seed}`);
  }

  return {
    seed,
    level,
    size: n,
    categories,
    clues: clueSet(clues),
    solution,
  };
}

export function generateLevelPuzzle(level: number, salt: string): LogicGridPuzzle {
  return generatePuzzle(levelSeed(level, salt), level);
}
