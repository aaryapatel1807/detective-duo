/**
 * Versus bots for the six main games (Phase 6).
 *
 * Versus used to need both players live. A bot opponent lets her race
 * when he is not around. The bot is a pace, not a claimed solver: it
 * "solves" at a level-based speed with seeded jitter, so the race
 * feels different every time but stays fair — slow on Easy, brisk on
 * Expert, deliberately beatable throughout.
 *
 * The player still solves the real puzzle; only the opponent's
 * progress bar is simulated. Nothing here pretends the bot reasoned.
 */
import { hashSeed } from '../generators/rng';

/**
 * Milliseconds for the bot to finish a race, by level.
 * Easy (1-10): 150s-95s, Medium (11-30): 90s-60s,
 * Hard (31-60): 55s-40s, Expert (61+): 38s down to a 30s floor.
 */
export function botRaceDurationMs(level: number, seed: string): number {
  const jitter = (hashSeed(`${seed}|pace`) % 1000) / 1000; // 0..1, seeded
  let base: number;
  if (level <= 10) base = 150000 - (level - 1) * 6000;
  else if (level <= 30) base = 90000 - (level - 11) * 1500;
  else if (level <= 60) base = 55000 - (level - 31) * 500;
  else base = Math.max(30000, 38000 - (level - 61) * 200);
  return Math.round(base * (0.9 + jitter * 0.2));
}

/** Bot progress 0..1 after `elapsedMs` of a race of `durationMs`. */
export function botProgressAt(elapsedMs: number, durationMs: number): number {
  if (durationMs <= 0) return 1;
  if (elapsedMs <= 0) return 0;
  return Math.min(1, elapsedMs / durationMs);
}

/** Level label for the bot's pace, shown honestly in the UI. */
export function botPaceLabel(level: number): string {
  if (level <= 10) return 'A gentle bot';
  if (level <= 30) return 'A steady bot';
  if (level <= 60) return 'A quick bot';
  return 'A very quick bot';
}
