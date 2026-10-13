'use client';

/* Badge — small mono pills.
 * DifficultyBadge: easy = green, medium = gold, hard = red.
 * PlayerCountBadge: neutral pill for player counts ('2P', 'SOLO'). */

import type { ReactNode } from 'react';

/** Difficulty level (also used by DifficultySelect). */
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface DifficultyBadgeProps {
  /** Difficulty level: easy (green) / medium (gold) / hard (red). */
  difficulty: Difficulty;
  /** Custom label; defaults to the uppercase difficulty name. */
  label?: string;
}

export function DifficultyBadge({ difficulty, label }: DifficultyBadgeProps) {
  return (
    <span className={`gk-badge gk-badge--${difficulty}`}>
      {label ?? difficulty.toUpperCase()}
    </span>
  );
}

export interface PlayerCountBadgeProps {
  /** Player count, e.g. 'SOLO', '2P', '2–4'. */
  count: string;
  /** Optional icon/text prefix. */
  icon?: ReactNode;
}

export function PlayerCountBadge({ count, icon }: PlayerCountBadgeProps) {
  return (
    <span className="gk-badge gk-badge--count">
      {icon}
      {count}
    </span>
  );
}
