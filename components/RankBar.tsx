'use client';

import { motion } from 'framer-motion';
import { progressToNext } from '../lib/xp';

/**
 * Detective rank bar — matches the hub reference:
 * badge + "DETECTIVE RANK: OBSERVER" + XP progress + "62 / 100".
 */
export function RankBar({
  name,
  xp,
  compact,
  accent,
  photo,
}: {
  name: string;
  xp: number;
  compact?: boolean;
  /** overrides the XP bar gradient + badge tint */
  accent?: string;
  /** dataURL photo; falls back to the shield badge */
  photo?: string;
}) {
  const p = progressToNext(xp);
  const label = p.next ? `${p.into} / ${p.span}` : `${xp} XP`;

  return (
    <div className="glass-card flex items-center gap-3 px-4 py-3">
      <div
        className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full text-lg shadow-md"
        style={{
          background: photo
            ? undefined
            : `linear-gradient(135deg, ${accent ?? 'var(--brass)'}, var(--brass-deep))`,
        }}
      >
        {photo ? (
          <img src={photo} alt={name} className="h-full w-full object-cover" />
        ) : (
          '🛡️'
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="type-heading truncate text-[0.72rem] text-[var(--ink-dim)]">
          {name} · Detective Rank: {p.rank.name}
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          <div className="xp-track flex-1">
            <motion.div
              className="xp-fill"
              style={
                accent
                  ? { background: `linear-gradient(90deg, ${accent}88, ${accent})` }
                  : undefined
              }
              initial={{ width: 0 }}
              animate={{ width: `${Math.round(p.pct * 100)}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
          {!compact && (
            <span className="type-heading shrink-0 text-[0.72rem] text-[var(--ink)]">
              {label}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
