'use client';

/* Die — a realistic die with pips and shading, ivory or noir.
 * Import '../ui-kit/realism.css' once per game to get .gk-die styles. */

import type { MouseEvent } from 'react';
import { pipLayout } from './realism-helpers';

export { pipLayout };

export interface DieProps {
  /** Face value 1..6. Out-of-range renders a blank die. */
  value: number;
  /** Pixel size (width/height). Default 56. */
  size?: number;
  /** Noir navy die with gold pips instead of ivory. Default false. */
  noir?: boolean;
  /** Adds a shake animation (e.g. while rolling). */
  rolling?: boolean;
  /** Click handler; renders a <button> when provided. */
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
}

export function Die({
  value,
  size = 56,
  noir = false,
  rolling = false,
  onClick,
  disabled = false,
  ariaLabel,
  className = '',
}: DieProps) {
  const pips = pipLayout(value);
  const cells = Array.from({ length: 9 }, (_, i) => i);
  const cls = [
    'gk-die',
    noir ? 'gk-die--noir' : '',
    rolling ? 'gk-die--rolling' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  const label = ariaLabel ?? (pips.length ? `Die showing ${value}` : 'Blank die');

  const inner = cells.map((i) =>
    pips.includes(i) ? (
      <span key={i} className="gk-die__pip" aria-hidden />
    ) : (
      <span key={i} aria-hidden />
    ),
  );

  if (onClick) {
    return (
      <button
        type="button"
        className={cls}
        style={{ ['--die' as string]: `${size}px` }}
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
      >
        {inner}
      </button>
    );
  }
  return (
    <div className={cls} style={{ ['--die' as string]: `${size}px` }} role="img" aria-label={label}>
      {inner}
    </div>
  );
}
