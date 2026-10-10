'use client';

/* ONE svg layer for all red strings, drawn beneath the cards in world
 * coordinates. Updates live while cards drag because it re-renders from
 * the same live positions. */

import { WORLD_W, WORLD_H, cardPin, type Pt } from './boardMath';
import type { StringLink } from '../../types';

export interface CardRect {
  id: string;
  x: number;
  y: number;
  w: number;
}

export function StringLayer({
  links,
  rects,
  preview,
}: {
  links: StringLink[];
  rects: Map<string, CardRect>;
  /** live dashed preview while in link mode: from selected pin to cursor */
  preview?: { from: Pt; to: Pt } | null;
}) {
  const paths = links
    .map((l) => {
      const a = rects.get(l.a);
      const b = rects.get(l.b);
      if (!a || !b) return null;
      return { key: `${l.a}::${l.b}`, d: stringPath(cardPin(a), cardPin(b)) };
    })
    .filter((p): p is { key: string; d: string } => p !== null);

  return (
    <svg
      className="cm-strings"
      width={WORLD_W}
      height={WORLD_H}
      viewBox={`0 0 ${WORLD_W} ${WORLD_H}`}
      aria-hidden
    >
      {paths.map((p) => (
        <path key={p.key} d={p.d} fill="none" />
      ))}
      {preview && (
        <path
          d={stringPath(preview.from, preview.to)}
          fill="none"
          strokeDasharray="10 8"
          opacity={0.9}
        />
      )}
    </svg>
  );
}

/** Slight sag curve between two pins, in world px. */
export function stringPath(a: Pt, b: Pt): string {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2 + 60;
  return `M ${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}`;
}
