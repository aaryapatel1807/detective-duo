'use client';

/* TurnBanner — glass pill naming whose turn it is ("Your turn" with
 * gold tint + pulsing dot; neutral on the opponent's turn).
 * The pill always renders with the same footprint, so the board
 * never shifts layout between turns. */

export interface TurnBannerProps {
  /** True = it's your turn (gold tint); false = opponent's (neutral). */
  isYourTurn: boolean;
  /** Text shown on your turn. Default 'Your turn'. */
  yourText?: string;
  /** Text shown on the opponent's turn. Default "Opponent's turn". */
  theirText?: string;
  /** Extra className merged with kit classes. */
  className?: string;
}

export function TurnBanner({
  isYourTurn,
  yourText = 'Your turn',
  theirText = "Opponent's turn",
  className = '',
}: TurnBannerProps) {
  return (
    <div className={`gk-turn-banner${className ? ` ${className}` : ''}`} aria-live="polite">
      <div className={`gk-turn-pill${isYourTurn ? ' gk-turn-pill--yours' : ''}`}>
        <span className="gk-turn-dot" aria-hidden="true" />
        {isYourTurn ? yourText : theirText}
      </div>
    </div>
  );
}
