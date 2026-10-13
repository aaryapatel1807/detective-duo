'use client';

/* TimerChip — subtle clock chip with mono tabular digits.
 * Per the game-UI rules: the timer starts on FIRST move (not on
 * load) and caps at 999 — pass elapsed seconds in. */

import { formatClock } from './helpers';

export interface TimerChipProps {
  /** Elapsed seconds. */
  seconds: number;
  /** Optional label prefix, e.g. 'TIME'. */
  label?: string;
  /** Extra className merged with kit classes. */
  className?: string;
}

export function TimerChip({ seconds, label, className = '' }: TimerChipProps) {
  return (
    <span className={`gk-timer${className ? ` ${className}` : ''}`}>
      {label ? <span className="gk-timer-label">{label}</span> : null}
      {formatClock(seconds)}
    </span>
  );
}
