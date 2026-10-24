/**
 * Checkbox Race (Phase 6 quick game): one player calls a number, the
 * other hunts it inside a cloud of jumbled digits. Every catch checks
 * a box — fill the target first and the round is yours.
 *
 * Both players share the same seeded grid and call order, so a versus
 * race is fair. Level sets the target: fewer boxes early, all hundred
 * at Expert.
 */
import { rngFromSeed, shuffle } from '../generators/rng';

export interface CheckboxGame {
  /** 100 digits shuffled into a 10x10 cloud. */
  grid: number[];
  /** Call order: a permutation of 1..100. */
  calls: number[];
  target: number;
}

export function checkboxTargetForLevel(level: number): number {
  if (level <= 10) return 30;
  if (level <= 30) return 50;
  if (level <= 60) return 75;
  return 100;
}

export function generateCheckbox(seed: string, level: number): CheckboxGame {
  const rng = rngFromSeed(`checkbox|${seed}|${level}`);
  const digits = Array.from({ length: 100 }, (_, i) => i + 1);
  return {
    grid: shuffle(digits, rng),
    calls: shuffle(digits, rng),
    target: checkboxTargetForLevel(level),
  };
}

/**
 * The number currently being called: the first call not yet found.
 * Returns null once the target is reached.
 */
export function currentCall(game: CheckboxGame, found: number[]): number | null {
  const foundSet = new Set(found);
  let caught = 0;
  for (const call of game.calls) {
    if (foundSet.has(call)) {
      caught++;
      if (caught >= game.target) return null;
      continue;
    }
    return call;
  }
  return null;
}

export function checkboxProgress(game: CheckboxGame, found: number[]): number {
  if (game.target <= 0) return 1;
  return Math.min(1, new Set(found).size / game.target);
}

export function checkboxFinished(game: CheckboxGame, found: number[]): boolean {
  return checkboxProgress(game, found) >= 1;
}

/** Bot catch delay (ms) per call: slower early, brisk at Expert. */
export function checkboxBotDelayMs(level: number): number {
  if (level <= 10) return 2400;
  if (level <= 30) return 1700;
  if (level <= 60) return 1200;
  return 900;
}
