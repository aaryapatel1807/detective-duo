'use client';

import { motion } from 'framer-motion';
import { progressToNext } from '../lib/xp';
import './hub-noir.css';

/**
 * Detective player header — mobile-game pattern: avatar circle, detective
 * name, rank title, XP progress bar with "x / y XP" numbers.
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
  /** overrides the XP bar gradient + rank tint */
  accent?: string;
  /** dataURL photo; falls back to initials */
  photo?: string;
}) {
  const p = progressToNext(xp);
  const label = p.next ? `${p.into} / ${p.span} XP` : `${xp} XP`;
  const initials =
    name
      .trim()
      .split(/\s+/)
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || '·';

  return (
    <div className="hub-glass hub-rankbar">
      <div
        className="hub-avatar"
        style={accent ? { borderColor: accent } : undefined}
      >
        {photo ? (
          <img src={photo} alt={name} />
        ) : (
          <span className="hub-avatar-initials hub-display">{initials}</span>
        )}
      </div>
      <div className="hub-rankbar-body">
        <div className="hub-display hub-rankbar-name">{name}</div>
        <div
          className="hub-mono hub-rankbar-rank"
          style={accent ? { color: accent } : undefined}
        >
          {p.rank.name}
        </div>
        <div className="hub-rankbar-bar">
          <div className="hub-xp-track hub-rankbar-track">
            <motion.div
              className="hub-xp-fill"
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
          {!compact && <span className="hub-mono hub-rankbar-nums">{label}</span>}
        </div>
      </div>
    </div>
  );
}
