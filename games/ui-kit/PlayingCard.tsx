'use client';

/* PlayingCard — a realistic playing card: ivory face with corner
 * indices and a big center suit, or a noir filigree back.
 * Import '../ui-kit/realism.css' once per game to get .gk-pcard styles. */

import type { MouseEvent } from 'react';
import { suitGlyph as glyph, suitColor as colorOf, type CardSuit } from './realism-helpers';

export type { CardSuit };

export type PlayingCardSize = 'sm' | 'md' | 'lg';

export interface PlayingCardProps {
  /** Face rank, e.g. 'A', '7', 'K'. Ignored when faceDown. */
  rank?: string;
  /** Face suit. Ignored when faceDown. */
  suit?: CardSuit;
  /** Show the noir card back instead of the face. Default false. */
  faceDown?: boolean;
  size?: PlayingCardSize;
  /** Click handler; renders a <button> when provided. */
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
}

export function PlayingCard({
  rank = 'A',
  suit = 'spades',
  faceDown = false,
  size = 'md',
  onClick,
  disabled = false,
  ariaLabel,
  className = '',
}: PlayingCardProps) {
  const color = colorOf(suit);
  const cls = [
    'gk-pcard',
    `gk-pcard--${size}`,
    faceDown ? 'gk-pcard--facedown' : 'gk-pcard--faceup',
    faceDown ? '' : `gk-pcard--${color}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');
  const label = ariaLabel ?? (faceDown ? 'Face-down card' : `${rank} of ${suit}`);

  const inner = faceDown ? null : (
    <>
      <span className="gk-pcard__corner gk-pcard__corner--tl" aria-hidden>
        <span>{rank}</span>
        <span className="gk-pcard__suit">{glyph(suit)}</span>
      </span>
      <span className="gk-pcard__center" aria-hidden>
        {glyph(suit)}
      </span>
      <span className="gk-pcard__corner gk-pcard__corner--br" aria-hidden>
        <span>{rank}</span>
        <span className="gk-pcard__suit">{glyph(suit)}</span>
      </span>
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
    <div className={cls} role="img" aria-label={label}>
      {inner}
    </div>
  );
}
