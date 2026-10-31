/**
 * Memory (Concentration) — 2-player matching pairs, Duo Corner.
 *
 * Studied from the classic 2-player Concentration rules: cards start
 * face down, a player flips two cards on their turn, a matching pair is
 * kept and earns another turn, a mismatch flips both cards back and
 * passes the turn, and when every pair is found the player with the
 * most pairs wins (equal pairs = a tie). Solo mode plays the same game
 * against Cosy Bot; two-player mode is pass-and-play on one device.
 *
 * Pure logic, no React: the page drives flips turn by turn and tests
 * can replay exact games. Card faces are short original words (no
 * emoji, no copied artwork or card designs).
 */
import { rngFromSeed, shuffle } from './rng';

export type MemoryPlayer = 0 | 1;

export interface MemoryCard {
  /** Position on the board (0..deck.length-1). */
  index: number;
  symbol: string;
}

/** Original face labels, one per pair. The first N are used per level. */
const SYMBOLS = [
  'Sun', 'Moon', 'Star', 'Leaf', 'Wave', 'Flame',
  'Crown', 'Key', 'Book', 'Cup', 'Bell', 'Heart',
  'Ship', 'Tree', 'Fish', 'Bird', 'Rose', 'Gem',
] as const;

export function pairsForLevel(level: number): number {
  if (level <= 10) return 6;
  if (level <= 30) return 8;
  if (level <= 60) return 12;
  return 18;
}

export function colsForPairs(pairs: number): number {
  if (pairs <= 8) return 4;
  return 6;
}

export interface MemoryGame {
  deck: MemoryCard[];
  pairs: number;
  cols: number;
  rows: number;
}

export function generateMemory(seed: string, level: number): MemoryGame {
  const pairs = pairsForLevel(level);
  const rng = rngFromSeed(`memory|${seed}|${level}`);
  const symbols = SYMBOLS.slice(0, pairs);
  const faces = shuffle([...symbols, ...symbols], rng);
  const deck: MemoryCard[] = faces.map((symbol, index) => ({ index, symbol }));
  const cols = colsForPairs(pairs);
  return { deck, pairs, cols, rows: deck.length / cols };
}

export interface MemoryState {
  deck: MemoryCard[];
  /** Cards face up on the current turn (0, 1, or 2). */
  faceUp: number[];
  /** Who collected each card, null while still on the board. */
  matchedBy: (MemoryPlayer | null)[];
  scores: [number, number];
  turn: MemoryPlayer;
  /** True after a mismatching second flip, until the page flips them back. */
  awaitingFlipBack: boolean;
  /** Total flips this game (both players). */
  flips: number;
  finished: boolean;
}

export function createMemoryGame(seed: string, level: number): MemoryState {
  const game = generateMemory(seed, level);
  return {
    deck: game.deck,
    faceUp: [],
    matchedBy: game.deck.map(() => null),
    scores: [0, 0],
    turn: 0,
    awaitingFlipBack: false,
    flips: 0,
    finished: false,
  };
}

/** Flip a card. Invalid flips (matched, already face up, mid flip-back, finished) are no-ops. */
export function flipCard(state: MemoryState, index: number): MemoryState {
  if (state.finished || state.awaitingFlipBack) return state;
  if (index < 0 || index >= state.deck.length) return state;
  if (state.matchedBy[index] !== null) return state;
  if (state.faceUp.includes(index)) return state;
  const faceUp = [...state.faceUp, index];
  const next: MemoryState = { ...state, faceUp, flips: state.flips + 1 };
  if (faceUp.length < 2) return next;
  const [a, b] = faceUp as [number, number];
  if (state.deck[a]!.symbol === state.deck[b]!.symbol) {
    const matchedBy = [...state.matchedBy];
    matchedBy[a] = state.turn;
    matchedBy[b] = state.turn;
    const scores: [number, number] = [...state.scores];
    scores[state.turn] += 1;
    const finished = matchedBy.every((m) => m !== null);
    // A match keeps the turn (bonus turn) — the classic rule.
    return { ...next, faceUp: [], matchedBy, scores, finished };
  }
  // Mismatch: cards stay face up until resolveMismatch flips them back.
  return { ...next, awaitingFlipBack: true };
}

/** Flip a mismatching pair back down and pass the turn. No-op unless awaiting. */
export function resolveMismatch(state: MemoryState): MemoryState {
  if (!state.awaitingFlipBack) return state;
  const turn: MemoryPlayer = state.turn === 0 ? 1 : 0;
  return { ...state, faceUp: [], awaitingFlipBack: false, turn };
}

/** Winner once finished: the player with more pairs, or null on a tie. */
export function memoryWinner(state: MemoryState): MemoryPlayer | null {
  if (!state.finished) return null;
  if (state.scores[0] > state.scores[1]) return 0;
  if (state.scores[1] > state.scores[0]) return 1;
  return null;
}

/**
 * Bot's next pick. `seen` maps each symbol to the board positions where
 * it has been revealed and not yet matched. The bot takes a known pair
 * when it has one, otherwise explores a position it has not seen yet,
 * falling back to any face-down unmatched card. Never picks a matched
 * card, a currently face-up card, or `exclude`.
 */
export function botPick(
  state: MemoryState,
  seen: ReadonlyMap<string, ReadonlySet<number>>,
  exclude: number | null,
  rng: () => number,
): number {
  const available = state.deck
    .map((c) => c.index)
    .filter(
      (i) =>
        state.matchedBy[i] === null &&
        !state.faceUp.includes(i) &&
        i !== exclude,
    );
  if (available.length === 0) return -1;
  // Known pair: two seen, unmatched positions of the same symbol.
  for (const [symbol, positions] of seen) {
    const open = [...positions].filter(
      (i) => state.matchedBy[i] === null && !state.faceUp.includes(i) && i !== exclude,
    );
    if (open.length >= 2) {
      // If one half is already face up this turn, take its partner.
      const faceUpSymbol =
        state.faceUp.length === 1 ? state.deck[state.faceUp[0]!]!.symbol : null;
      if (faceUpSymbol === symbol) {
        const partner = open.find((i) => !state.faceUp.includes(i));
        if (partner !== undefined) return partner;
      }
      return open[0]!;
    }
  }
  // Second pick after a first flip: if the first card's partner is known, take it.
  if (state.faceUp.length === 1) {
    const symbol = state.deck[state.faceUp[0]!]!.symbol;
    const known = [...(seen.get(symbol) ?? [])].filter(
      (i) => state.matchedBy[i] === null && !state.faceUp.includes(i) && i !== exclude,
    );
    if (known.length > 0) return known[0]!;
  }
  // Explore: prefer positions never seen before.
  const seenPositions = new Set<number>();
  for (const positions of seen.values()) for (const i of positions) seenPositions.add(i);
  const unseen = available.filter((i) => !seenPositions.has(i));
  const pool = unseen.length > 0 ? unseen : available;
  return pool[Math.floor(rng() * pool.length)]!;
}
