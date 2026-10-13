'use client';

/* GameButton — the kit's one button. Variants: primary (gold CTA),
 * ghost (outlined, secondary), danger (red, destructive). All sizes
 * meet the 44px touch minimum except `sm` (36px, for dense HUDs). */

import type { ReactNode } from 'react';

/** Visual treatment of the button. */
export type GameButtonVariant = 'primary' | 'ghost' | 'danger';

/** Button size. md (default) is 44px tall — the touch minimum. */
export type GameButtonSize = 'sm' | 'md' | 'lg';

export interface GameButtonProps {
  /** Button label (text or inline content). */
  children: ReactNode;
  /** Visual variant: primary gold / ghost outline / danger red. Default 'primary'. */
  variant?: GameButtonVariant;
  /** Size: sm 36px, md 44px (default), lg 52px. */
  size?: GameButtonSize;
  /** Click handler. */
  onClick?: () => void;
  /** Disabled state (dims, blocks clicks). */
  disabled?: boolean;
  /** Native button type. Default 'button'. */
  type?: 'button' | 'submit' | 'reset';
  /** Extra className merged with kit classes. */
  className?: string;
  /** Accessible label when children aren't self-describing. */
  ariaLabel?: string;
}

export function GameButton({
  children,
  variant = 'primary',
  size = 'md',
  onClick,
  disabled = false,
  type = 'button',
  className = '',
  ariaLabel,
}: GameButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`gk-btn gk-btn--${variant} gk-btn--${size}${className ? ` ${className}` : ''}`}
    >
      {children}
    </button>
  );
}
