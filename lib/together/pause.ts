/**
 * Pause/resume state machine (pure, tested).
 *
 * A game pauses only once both players have been present and one
 * leaves; it resumes the moment both are back. State is never cleared
 * by a pause — the session row keeps everything.
 */
export interface PauseState {
  paused: boolean;
  everTwo: boolean;
}

export function initialPauseState(): PauseState {
  return { paused: false, everTwo: false };
}

export function pauseTransition(
  prev: PauseState,
  memberCount: number,
  status: string,
): PauseState {
  const everTwo = prev.everTwo || memberCount >= 2;
  const paused = status === 'playing' && everTwo && memberCount < 2;
  return { paused, everTwo };
}
