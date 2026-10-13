'use client';

/* LetterTile — a beveled wooden letter tile like a real board-game
 * rack tile, with optional point value and guess-state coloring.
 * Import '../ui-kit/realism.css' once per game to get .gk-tile styles. */

import type { MouseEvent } from 'react';

export type LetterTileState = 'default' | 'active' | 'correct' | 'misplaced' | 'absent';
export type LetterTileSize = 'sm' | 'md' | 'lg';

export interface LetterTileProps {
  letter: string;
  /** Small point value in the corner, like Scrabble. */
  points?: number;
  state?: LetterTileState;
  size?: LetterTileSize;
  /** Click handler; renders a <button> when provided. */
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
}

export function LetterTile({
  letter,
  points,
  state = 'default',
  size = 'md',
  onClick,
  disabled = false,
  ariaLabel,
  className = '',
}: LetterTileProps) {
  const cls = ['gk-tile', `gk-tile--${size}`, `gk-tile--${state}`, className]
    .filter(Boolean)
    .join(' ');
  const label = ariaLabel ?? `Letter ${letter}`;

  const inner = (
    <>
      <span aria-hidden>{letter}</span>
      {points !== undefined && (
        <span className="gk-tile__points" aria-hidden>
          {points}
        </span>
      )}
    </>
  );

  if (onClick) {
    return (
      <button type="button" className={cls} onClick={onClick} disabled={disabled} aria-label={label}>
        {inner}
      </button>
    );
  }
  return (
    <div className={cls} aria-label={label}>
      {inner}
    </div>
  );
}
