'use client';

/* ScoreHUD — twin score cards, e.g. YOU / OPPONENT or SCORE / BEST.
 * The two cards are visually identical so "best" reads as a peer of
 * "score". Numbers use mono tabular digits (no clock jitter).
 * When `record` is true the highlighted card gets a gold glow. */

import { formatNumber, isNewRecord } from './helpers';

export interface ScoreHUDProps {
  /** Left card label, e.g. 'YOU' or 'SCORE'. */
  leftLabel: string;
  /** Left card numeric value. */
  leftValue: number;
  /** Right card label, e.g. 'OPPONENT' or 'BEST'. */
  rightLabel: string;
  /** Right card numeric value. */
  rightValue: number;
  /** Optional small caption under the left value (e.g. 'COMBO x3'). */
  leftSub?: string;
  /** Optional small caption under the right value. */
  rightSub?: string;
  /** Which card glows gold. Default: auto-detect record on 'BEST' label. */
  record?: 'left' | 'right' | 'none';
  /** Extra className merged with kit classes. */
  className?: string;
}

export function ScoreHUD({
  leftLabel,
  leftValue,
  rightLabel,
  rightValue,
  leftSub,
  rightSub,
  record = 'none',
  className = '',
}: ScoreHUDProps) {
  // Default record logic: SCORE/BEST twins — glow BEST when beaten.
  const autoRecord =
    record !== 'none'
      ? record
      : rightLabel.toUpperCase() === 'BEST' && isNewRecord(leftValue, rightValue)
        ? 'right'
        : 'none';

  const card = (
    side: 'left' | 'right',
    label: string,
    value: number,
    sub?: string,
  ) => (
    <div
      key={side}
      className={`gk-score-card${autoRecord === side ? ' gk-score-card--record' : ''}`}
    >
      <div className="gk-score-label">{label}</div>
      <div className="gk-score-value">{formatNumber(value)}</div>
      {sub ? <div className="gk-score-sub">{sub}</div> : null}
    </div>
  );

  return (
    <div className={`gk-score-hud${className ? ` ${className}` : ''}`}>
      {card('left', leftLabel, leftValue, leftSub)}
      {card('right', rightLabel, rightValue, rightSub)}
    </div>
  );
}
