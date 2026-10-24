/**
 * Don't Press Purple (Phase 6 quick game): hit every prompt the moment
 * it lights up teal to build your combo. When it flashes violet
 * instead, the only winning move is to keep your hands still.
 *
 * Prompt pacing is gameplay, not a countdown on the player: prompts
 * advance on their own beat, and the round is a fixed count of prompts
 * by level. No timer counts the player down.
 */
import { rngFromSeed } from '../generators/rng';

export type PurplePrompt = 'teal' | 'violet';

export interface PurpleGame {
  prompts: PurplePrompt[];
  /** ms each prompt stays up. */
  beatMs: number;
}

export function purpleParamsForLevel(level: number): { count: number; beatMs: number; violetShare: number } {
  if (level <= 10) return { count: 20, beatMs: 1400, violetShare: 0.25 };
  if (level <= 30) return { count: 30, beatMs: 1100, violetShare: 0.3 };
  if (level <= 60) return { count: 40, beatMs: 900, violetShare: 0.35 };
  return { count: 50, beatMs: 700, violetShare: 0.4 };
}

export function generatePurple(seed: string, level: number): PurpleGame {
  const rng = rngFromSeed(`purple|${seed}|${level}`);
  const { count, beatMs, violetShare } = purpleParamsForLevel(level);
  const prompts: PurplePrompt[] = [];
  for (let i = 0; i < count; i++) {
    prompts.push(rng() < violetShare ? 'violet' : 'teal');
  }
  return { prompts, beatMs };
}

/** Score one prompt: tapping teal scores, tapping violet is a mistake. */
export function purpleScorePrompt(
  prompt: PurplePrompt,
  tapped: boolean,
  score: number,
  mistakes: number,
): { score: number; mistakes: number } {
  if (prompt === 'teal') {
    return tapped ? { score: score + 1, mistakes } : { score, mistakes: mistakes + 1 };
  }
  return tapped ? { score, mistakes: mistakes + 1 } : { score, mistakes };
}

export function purpleProgress(game: PurpleGame, done: number): number {
  if (game.prompts.length === 0) return 1;
  return Math.min(1, done / game.prompts.length);
}

/** Bot accuracy: taps teal correctly and holds on violet this often. */
export function purpleBotAccuracy(level: number): number {
  if (level <= 10) return 0.7;
  if (level <= 30) return 0.85;
  if (level <= 60) return 0.93;
  return 0.97;
}
