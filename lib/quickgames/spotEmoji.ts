/**
 * Speed Spot-the-Emoji (Phase 6 quick game): two cards, six emoji each,
 * exactly one shared between them. Find the twin and tap it before your
 * rival does.
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
}

export function spotTargetForLevel(level: number): number {
  if (level <= 10) return 5;
  if (level <= 30) return 8;
  if (level <= 60) return 12;
  return 15;
}

export function generateSpot(seed: string, level: number): SpotGame {
  const rng = rngFromSeed(`spot|${seed}|${level}`);
  const target = spotTargetForLevel(level);
  const cards: SpotCard[] = [];
  for (let i = 0; i < target; i++) {
    const pool = shuffle(SPOT_EMOJI_POOL, rng);
    const shared = pool[0]!;
    const mine = shuffle([shared, ...pool.slice(1, 6)], rng);
    const theirs = shuffle([shared, ...pool.slice(6, 11)], rng);
    cards.push({ mine, theirs, shared });
  }
  return { cards, target };
}

export function spotProgress(game: SpotGame, correct: number): number {
  if (game.target <= 0) return 1;
  return Math.min(1, correct / game.target);
}

/** Bot find delay (ms): slower early, brisk at Expert. */
export function spotBotDelayMs(level: number): number {
  if (level <= 10) return 3200;
  if (level <= 30) return 2400;
  if (level <= 60) return 1700;
  return 1200;
}
