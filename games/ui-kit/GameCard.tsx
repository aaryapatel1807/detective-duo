'use client';

/* GameCard — generic tile/cell with noir state fills.
 * default  = interactive, bordered panel
 * empty    = dashed outline placeholder (no color)
 * active   = gold ring, current selection/focus
 * correct  = green fill (right answer / revealed clue)
 * misplaced= gold fill (right piece, wrong place)
 * absent   = dim gray fill (spent / not present) */

import type { ReactNode, MouseEvent } from 'react';

/** Visual state of the card. */
export type GameCardState =
  | 'default'
  | 'empty'
  | 'active'
  | 'correct'
  | 'misplaced'
  | 'absent';

export interface GameCardProps {
  /** Card content (letter, number, icon). */
  children?: ReactNode;
  /** Visual state. Default 'default'. */
  state?: GameCardState;
  /** Click handler; when provided the card renders as a <button>. */
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  /** Disabled state (buttons only). */
  disabled?: boolean;
  /** Accessible label when content isn't self-describing. */
  ariaLabel?: string;
  /** Extra className merged with kit classes. */
  className?: string;
}

export function GameCard({
  children,
  state = 'default',
  onClick,
  disabled = false,
  ariaLabel,
  className = '',
}: GameCardProps) {
  const cls = `gk-card gk-card--${state}${className ? ` ${className}` : ''}`;

  if (onClick) {
    return (
      <button type="button" className={cls} onClick={onClick} disabled={disabled} aria-label={ariaLabel}>
        {children}
      </button>
    );
  }

  return (
    <div className={cls} aria-label={ariaLabel}>
      {children}
    </div>
  );
}
