'use client';

import { motion } from 'framer-motion';

export interface StringPoint {
  x: number; // 0..100 (% of board width)
  y: number; // 0..100 (% of board height)
}

export interface StringConnection {
  from: StringPoint;
  to: StringPoint;
  /** slight curve for a natural string look */
  sag?: number;
}

/**
 * Red investigation strings drawn over a corkboard.
 * Renders an absolutely-positioned SVG overlay; each string is a path
 * animated with framer-motion's pathLength for the "string draw" effect.
 *
 * Place inside a relatively-positioned Corkboard:
 *   <Corkboard className="relative ...">
 *     <RedStringLayer connections={[{ from: {x:20,y:30}, to: {x:60,y:70} }]} />
 *   </Corkboard>
 */
export function RedStringLayer({
  connections,
  className,
}: {
  connections: StringConnection[];
  className?: string;
}) {
  return (
    <svg
      className={className}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden
    >
      {connections.map((c, i) => {
        const mx = (c.from.x + c.to.x) / 2;
        const my = (c.from.y + c.to.y) / 2 + (c.sag ?? 1.5);
        const d = `M ${c.from.x} ${c.from.y} Q ${mx} ${my} ${c.to.x} ${c.to.y}`;
        return (
          <motion.path
            key={i}
            d={d}
            fill="none"
            stroke="var(--hub-red, var(--blood))"
            strokeWidth={0.45}
            vectorEffect="non-scaling-stroke"
            strokeLinecap="round"
            style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.6))' }}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.9, delay: 0.25 + i * 0.18, ease: 'easeOut' }}
          />
        );
      })}
    </svg>
  );
}

/** A single red string between two points (convenience wrapper). */
export function RedString({ from, to }: { from: StringPoint; to: StringPoint }) {
  return <RedStringLayer connections={[{ from, to }]} />;
}
