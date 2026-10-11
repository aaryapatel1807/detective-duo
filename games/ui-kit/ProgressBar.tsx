'use client';

/* ProgressBar — XP-style bar with numbers ('120 / 200 XP').
 * Used for levels, round progress, and HUD stat bars. */

import { pctOf } from './helpers';

export interface ProgressBarProps {
  /** Current value (fills proportionally to max). */
  value: number;
  /** Maximum value. */
  max: number;
  /** Optional label shown left of the bar. */
  label?: string;
  /** Optional unit suffix on the numbers, e.g. 'XP'. */
  unit?: string;
  /** Show the 'value / max' numbers. Default true. */
  showNumbers?: boolean;
  /** Extra className merged with kit classes. */
  className?: string;
}

export function ProgressBar({
  value,
  max,
  label,
  unit,
  showNumbers = true,
  className = '',
}: ProgressBarProps) {
  const pct = pctOf(value, max);

  return (
    <div className={`gk-progress${className ? ` ${className}` : ''}`}>
      {(label || showNumbers) && (
        <div className="gk-progress-head">
          <span className="gk-progress-label">{label ?? ''}</span>
          {showNumbers && (
            <span className="gk-progress-numbers">
              {value} / {max}
              {unit ? ` ${unit}` : ''}
            </span>
          )}
        </div>
      )}
      <div
        className="gk-progress-track"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div className="gk-progress-fill" style={{ width: `${pct * 100}%` }} />
      </div>
    </div>
  );
}
