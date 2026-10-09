/* Pure rules for the sample Tap Duel. Unit-testable, no React. */

export const TAP_TARGET = 20;

export type TapState = Record<string, number>;

/** Returns the winning playerId (first to reach target), or null. */
export function tapWinner(taps: TapState, target = TAP_TARGET): string | null {
  let best: string | null = null;
  let bestN = -1;
  for (const [pid, n] of Object.entries(taps)) {
    if (n > bestN) {
      bestN = n;
      best = pid;
    }
  }
  return bestN >= target ? best : null;
}

/** Increment one player's tap count (immutable). */
export function addTap(taps: TapState, playerId: string): TapState {
  return { ...taps, [playerId]: (taps[playerId] ?? 0) + 1 };
}
