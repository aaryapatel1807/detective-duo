/**
 * Speed Spot-the-Emoji (Phase 6 quick game): two cards, exactly one
 * shared emoji between them. Find the twin and tap it before your
 * rival does.
 *
 * Difficulty grows with level, in three independent ways that all keep
 * the core rule intact:
 * - more rounds (spotTargetForLevel, unchanged ladder),
 * - more pictures per card (spotCardSizeForLevel: 6 → 7 → 8 → 9),
 * - a wider active pool (spotPoolSizeForLevel: 24 → 32 → 40 → 48), so
 *   higher levels can show pictures lower levels never deal.
 * Every card still needs 2 * size - 1 distinct pictures, which even the
 * smallest pool (24) comfortably covers for the largest card (9 → 17).
 *
 * Note on the icon rule: v2 uses SVG icons for UI chrome, never emoji
 * icons. Here the emoji ARE the game content — the cards themselves —
 * exactly as the game is defined. All buttons, labels and chrome around
 * the cards stay SVG/text.
 */
import { rngFromSeed, shuffle } from '../generators/rng';

export const SPOT_EMOJI_POOL: string[] = [
  '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯',
  '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🦄', '🐝',
  '🌸', '🌹', '🌻', '🍀', '🌈', '⭐', '🌙', '☀️', '❄️', '🔥',
  '🍎', '🍓', '🍒', '🍇', '🍊', '🍋', '🍉', '🍩', '🍪', '🍫',
  '⚽', '🎈', '🎁', '🎵', '🎨', '🚀', '✈️', '🚗',
];

export interface SpotCard {
  mine: string[];
  theirs: string[];
  shared: string;
}

export interface SpotGame {
  cards: SpotCard[];
  target: number;
  /** Pictures per card side for this game (grows with level). */
  cardSize: number;
  /** Distinct pictures the game may deal from (grows with level). */
  poolSize: number;
}

export function spotTargetForLevel(level: number): number {
  if (level <= 10) return 5;
  if (level <= 30) return 8;
  if (level <= 60) return 12;
  return 15;
}

/** Pictures per card side: Easy 6, Medium 7, Hard 8, Expert 9. */
export function spotCardSizeForLevel(level: number): number {
  if (level <= 10) return 6;
  if (level <= 30) return 7;
  if (level <= 60) return 8;
  return 9;
}

/** Distinct pictures available to a game: Easy 24, Medium 32, Hard 40, Expert 48. */
export function spotPoolSizeForLevel(level: number): number {
  if (level <= 10) return 24;
  if (level <= 30) return 32;
  if (level <= 60) return 40;
  return SPOT_EMOJI_POOL.length;
}

export function generateSpot(seed: string, level: number): SpotGame {
  const rng = rngFromSeed(`spot|${seed}|${level}`);
  const target = spotTargetForLevel(level);
  const cardSize = spotCardSizeForLevel(level);
  const poolSize = spotPoolSizeForLevel(level);
  // Seeded active pool: the same seed + level always deals from the
  // same subset, so generation stays fully deterministic.
  const activePool = shuffle(SPOT_EMOJI_POOL, rng).slice(0, poolSize);
  const cards: SpotCard[] = [];
  for (let i = 0; i < target; i++) {
    const pool = shuffle(activePool, rng);
    const shared = pool[0]!;
    const mine = shuffle([shared, ...pool.slice(1, cardSize)], rng);
    const theirs = shuffle([shared, ...pool.slice(cardSize, 2 * cardSize - 1)], rng);
    cards.push({ mine, theirs, shared });
  }
  return { cards, target, cardSize, poolSize };
}

export function spotProgress(game: SpotGame, correct: number): number {
  if (game.target <= 0) return 1;
  return Math.min(1, correct / game.target);
}

/** Bot find delay (ms) before jitter: slower early, brisk at Expert. */
export function spotBotBaseDelayMs(level: number): number {
  if (level <= 10) return 3200;
  if (level <= 30) return 2400;
  if (level <= 60) return 1700;
  return 1200;
}

/**
 * Bot find delay (ms). With no seed/round given this is exactly the
 * base delay (old behaviour). With a seed and the bot's current round,
 * a small seeded jitter (±15%) is applied, so the bot feels human —
 * never instant, and never the same metronomic beat twice — while
 * staying deterministic for a given seed/level/round. Even the fastest
 * jittered Expert delay (1020ms) stays well below the slowest jittered
 * Easy delay (2720ms), so the level ordering is preserved.
 */
export function spotBotDelayMs(level: number, seed?: string, round?: number): number {
  const base = spotBotBaseDelayMs(level);
  if (seed === undefined || round === undefined) return base;
  const jitterRng = rngFromSeed(`spot|bot|${seed}|${level}|${round}`);
  const jitter = (jitterRng() - 0.5) * 2 * 0.15;
  return Math.round(base * (1 + jitter));
}
